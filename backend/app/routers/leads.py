from datetime import datetime
from typing import Annotated, Any

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import func
from sqlmodel import Session, col, select

from app.db import SessionDep
from app.models import Discussion, Lead, LeadStatus, utcnow
from app.schemas import LeadCreate, LeadRead, LeadUpdate

router = APIRouter(prefix="/api/leads", tags=["leads"])


def get_lead_or_404(session: Session, lead_id: int) -> Lead:
    lead = session.get(Lead, lead_id)
    if lead is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lead not found")
    return lead


def leads_with_last_discussion() -> Any:
    """SELECT each lead with its newest discussion in a single query (no N+1).

    A window function ranks every lead's discussions newest-first. The LEFT JOIN
    keeps only rank 1 and still returns leads that have no discussions yet.
    ROW_NUMBER() runs the same on SQLite (3.25+) and Postgres.
    """
    ranked = select(
        Discussion.lead_id,
        Discussion.note,
        Discussion.created_at,
        func.row_number()
        .over(
            partition_by=Discussion.lead_id,
            order_by=(col(Discussion.created_at).desc(), col(Discussion.id).desc()),
        )
        .label("rank"),
    ).subquery("ranked")

    last_activity = func.coalesce(ranked.c.created_at, Lead.created_at)
    return (
        select(Lead, ranked.c.note, ranked.c.created_at)
        .outerjoin(ranked, (ranked.c.lead_id == Lead.id) & (ranked.c.rank == 1))
        .order_by(last_activity.desc(), col(Lead.id).desc())
    )


def to_read(lead: Lead, note: str | None = None, noted_at: datetime | None = None) -> LeadRead:
    return LeadRead(**lead.model_dump(), last_discussion_note=note, last_discussion_at=noted_at)


def read_lead_or_404(session: Session, lead_id: int) -> LeadRead:
    row = session.exec(leads_with_last_discussion().where(Lead.id == lead_id)).first()
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lead not found")
    return to_read(*row)


@router.get("", response_model=list[LeadRead])
def list_leads(
    session: SessionDep,
    status_filter: Annotated[LeadStatus | None, Query(alias="status")] = None,
    search: Annotated[str | None, Query(max_length=120)] = None,
) -> list[LeadRead]:
    query = leads_with_last_discussion()
    if status_filter is not None:
        query = query.where(Lead.status == status_filter)
    if search and search.strip():
        # autoescape: a search for "%" means a literal percent sign, not "match everything".
        query = query.where(col(Lead.name).icontains(search.strip(), autoescape=True))
    return [to_read(*row) for row in session.exec(query).all()]


@router.post("", response_model=LeadRead, status_code=status.HTTP_201_CREATED)
def create_lead(payload: LeadCreate, session: SessionDep) -> LeadRead:
    now = utcnow()
    lead = Lead(**payload.model_dump(), created_at=now, updated_at=now)
    session.add(lead)
    session.commit()
    session.refresh(lead)
    return to_read(lead)


@router.get("/{lead_id}", response_model=LeadRead)
def get_lead(lead_id: int, session: SessionDep) -> LeadRead:
    return read_lead_or_404(session, lead_id)


@router.patch("/{lead_id}", response_model=LeadRead)
def update_lead(lead_id: int, payload: LeadUpdate, session: SessionDep) -> LeadRead:
    lead = get_lead_or_404(session, lead_id)
    changes = payload.model_dump(exclude_unset=True)
    if changes:
        for field, value in changes.items():
            setattr(lead, field, value)
        lead.updated_at = utcnow()
        session.add(lead)
        session.commit()
    return read_lead_or_404(session, lead_id)
