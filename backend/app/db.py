from collections.abc import Iterator
from datetime import datetime, timezone
from typing import Annotated

from fastapi import Depends
from sqlalchemy import DateTime, event
from sqlalchemy.engine import Dialect, Engine
from sqlalchemy.pool import StaticPool
from sqlalchemy.types import TypeDecorator
from sqlmodel import Session, SQLModel, create_engine

from app.config import get_settings


class UTCDateTime(TypeDecorator[datetime]):
    """A datetime column that is always UTC on the way in and timezone-aware on the way out.

    SQLite has no timezone type, so a plain DateTime column hands back naive values.
    Serialized without an offset, the browser would read them as local time and every
    follow-up would shift by the user's UTC offset (5h30m in India).
    """

    impl = DateTime(timezone=True)
    cache_ok = True

    def process_bind_param(self, value: datetime | None, dialect: Dialect) -> datetime | None:
        if value is None:
            return None
        if value.tzinfo is None:
            raise ValueError("naive datetime given; store timezone-aware datetimes only")
        value = value.astimezone(timezone.utc)
        # SQLite would drop the offset anyway; store the UTC wall-clock time explicitly.
        return value.replace(tzinfo=None) if dialect.name == "sqlite" else value

    def process_result_value(self, value: datetime | None, dialect: Dialect) -> datetime | None:
        if value is None:
            return None
        if value.tzinfo is None:
            return value.replace(tzinfo=timezone.utc)
        return value.astimezone(timezone.utc)


def make_engine(url: str) -> Engine:
    if not url.startswith("sqlite"):
        return create_engine(url, pool_pre_ping=True)

    in_memory = url in ("sqlite://", "sqlite:///:memory:")
    engine = create_engine(
        url,
        connect_args={"check_same_thread": False},
        # One shared connection, otherwise every session would see a different empty database.
        poolclass=StaticPool if in_memory else None,
    )

    @event.listens_for(engine, "connect")
    def _enable_foreign_keys(dbapi_connection, _record) -> None:
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

    return engine


engine = make_engine(get_settings().database_url)


def init_db() -> None:
    SQLModel.metadata.create_all(engine)


def get_session() -> Iterator[Session]:
    with Session(engine) as session:
        yield session


SessionDep = Annotated[Session, Depends(get_session)]
