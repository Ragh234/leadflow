"""Request and response models for the API, kept separate from the database tables."""

from datetime import datetime
from typing import Annotated

from pydantic import AfterValidator, BaseModel, ConfigDict, StringConstraints, field_validator

from app.models import LeadStatus


def _blank_to_none(value: str | None) -> str | None:
    return value or None


Name = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=120)]
Company = Annotated[
    Annotated[str, StringConstraints(strip_whitespace=True, max_length=120)] | None,
    AfterValidator(_blank_to_none),
]
Phone = Annotated[
    Annotated[str, StringConstraints(strip_whitespace=True, max_length=32, pattern=r"^[0-9+()\-.\s]*$")]
    | None,
    AfterValidator(_blank_to_none),
]


class LeadCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: Name
    company: Company = None
    phone: Phone = None
    status: LeadStatus = LeadStatus.NEW


class LeadUpdate(BaseModel):
    """Partial update: only the fields present in the request body are changed."""

    model_config = ConfigDict(extra="forbid")

    name: Name | None = None
    company: Company = None
    phone: Phone = None
    status: LeadStatus | None = None

    @field_validator("name", "status")
    @classmethod
    def _not_null(cls, value: object) -> object:
        if value is None:
            raise ValueError("cannot be null")
        return value


class LeadRead(BaseModel):
    id: int
    name: str
    company: str | None
    phone: str | None
    status: LeadStatus
    next_follow_up_at: datetime | None
    created_at: datetime
    updated_at: datetime
    last_discussion_note: str | None = None
    last_discussion_at: datetime | None = None
