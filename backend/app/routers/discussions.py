from collections.abc import Sequence

from fastapi import APIRouter, status
from sqlmodel import col, select

from app.db import SessionDep
from app.models import Discussion, utcnow
from app.routers.leads import get_lead_or_404
from app.schemas import DiscussionCreate, DiscussionRead

router = APIRouter(prefix="/api/leads/{lead_id}/discussions", tags=["discussions"])


@router.get("", response_model=list[DiscussionRead])
def list_discussions(lead_id: int, session: SessionDep) -> Sequence[Discussion]:
    get_lead_or_404(session, lead_id)
    return session.exec(
        select(Discussion)
        .where(Discussion.lead_id == lead_id)
        .order_by(col(Discussion.created_at).desc(), col(Discussion.id).desc())
    ).all()


@router.post("", response_model=DiscussionRead, status_code=status.HTTP_201_CREATED)
def create_discussion(lead_id: int, payload: DiscussionCreate, session: SessionDep) -> Discussion:
    lead = get_lead_or_404(session, lead_id)
    now = utcnow()

    discussion = Discussion(lead_id=lead_id, note=payload.note, follow_up_at=payload.follow_up_at, created_at=now)
    session.add(discussion)
    if payload.follow_up_at is not None:
        lead.next_follow_up_at = payload.follow_up_at
        lead.updated_at = now
        session.add(lead)

    # One commit for both rows: the list can never show the note without its follow-up, or the reverse.
    session.commit()
    session.refresh(discussion)
    return discussion
