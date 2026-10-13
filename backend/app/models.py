"""Database tables. Request and response shapes live in app.schemas, not here."""

from datetime import datetime, timezone
from enum import Enum

from sqlalchemy import Column, ForeignKey, Index, Integer, String
from sqlalchemy import Enum as SAEnum
from sqlmodel import Field, Relationship, SQLModel

from app.db import UTCDateTime


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class LeadStatus(str, Enum):
    NEW = "new"
    CONTACTED = "contacted"
    QUALIFIED = "qualified"
    PROPOSAL_SENT = "proposal_sent"
    WON = "won"
    LOST = "lost"


class Lead(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    name: str = Field(sa_column=Column(String(120), nullable=False))
    company: str | None = Field(default=None, sa_column=Column(String(120)))
    phone: str | None = Field(default=None, sa_column=Column(String(32)))
    status: LeadStatus = Field(
        default=LeadStatus.NEW,
        sa_column=Column(
            # Stored as plain text ("proposal_sent"), so adding a status needs no DB enum migration.
            SAEnum(LeadStatus, native_enum=False, length=20, values_callable=lambda e: [m.value for m in e]),
            nullable=False,
            index=True,
        ),
    )
    next_follow_up_at: datetime | None = Field(default=None, sa_column=Column(UTCDateTime))
    created_at: datetime = Field(default_factory=utcnow, sa_column=Column(UTCDateTime, nullable=False))
    updated_at: datetime = Field(default_factory=utcnow, sa_column=Column(UTCDateTime, nullable=False))

    discussions: list["Discussion"] = Relationship(
        back_populates="lead",
        sa_relationship_kwargs={"cascade": "all, delete-orphan", "passive_deletes": True},
    )


class Discussion(SQLModel, table=True):
    __table_args__ = (Index("ix_discussion_lead_id_created_at", "lead_id", "created_at"),)

    id: int | None = Field(default=None, primary_key=True)
    lead_id: int = Field(
        sa_column=Column(Integer, ForeignKey("lead.id", ondelete="CASCADE"), nullable=False)
    )
    note: str = Field(sa_column=Column(String(2000), nullable=False))
    follow_up_at: datetime | None = Field(default=None, sa_column=Column(UTCDateTime))
    created_at: datetime = Field(default_factory=utcnow, sa_column=Column(UTCDateTime, nullable=False))

    lead: Lead | None = Relationship(back_populates="discussions")
