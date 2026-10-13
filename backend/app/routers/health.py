from fastapi import APIRouter
from sqlalchemy import text

from app.db import SessionDep

router = APIRouter(prefix="/api", tags=["health"])


@router.get("/health")
def health(session: SessionDep) -> dict[str, str]:
    # Touch the database so a healthy response means the API can actually serve data.
    session.connection().execute(text("SELECT 1"))
    return {"status": "ok"}
