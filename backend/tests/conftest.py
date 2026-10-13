import os

# Point the app at a private in-memory database before it is imported.
# Set TEST_DATABASE_URL to run the same suite against Postgres (CI does).
os.environ["DATABASE_URL"] = os.environ.get("TEST_DATABASE_URL", "sqlite://")
os.environ["FRONTEND_ORIGIN"] = "http://localhost:3000"

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from sqlmodel import SQLModel  # noqa: E402

from app.db import engine  # noqa: E402
from app.main import app  # noqa: E402


@pytest.fixture(autouse=True)
def fresh_db():
    SQLModel.metadata.create_all(engine)
    yield
    SQLModel.metadata.drop_all(engine)


@pytest.fixture
def client():
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture
def make_lead(client):
    def _make(**fields):
        response = client.post("/api/leads", json={"name": "Test Lead", **fields})
        assert response.status_code == 201, response.text
        return response.json()

    return _make
