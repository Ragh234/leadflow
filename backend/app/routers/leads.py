from fastapi import APIRouter, HTTPException, status

from app.db import SessionDep
from app.models import Lead, utcnow
from app.schemas import LeadCreate, LeadRead, LeadUpdate

router = APIRouter(prefix="/api/leads", tags=["leads"])


def get_lead_or_404(session: SessionDep, lead_id: int) -> Lead:
    lead = session.get(Lead, lead_id)
    if lead is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lead not found")
    return lead


@router.post("", response_model=LeadRead, status_code=status.HTTP_201_CREATED)
def create_lead(payload: LeadCreate, session: SessionDep) -> LeadRead:
    now = utcnow()
    lead = Lead(**payload.model_dump(), created_at=now, updated_at=now)
    session.add(lead)
    session.commit()
    session.refresh(lead)
    return LeadRead.model_validate(lead, from_attributes=True)


@router.get("/{lead_id}", response_model=LeadRead)
def get_lead(lead_id: int, session: SessionDep) -> LeadRead:
    return LeadRead.model_validate(get_lead_or_404(session, lead_id), from_attributes=True)


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
        session.refresh(lead)
    return LeadRead.model_validate(lead, from_attributes=True)
