from datetime import datetime

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import delete, event
from sqlmodel import Session, select

from app.db import engine
from app.main import app
from app.models import Discussion, Lead


def add_note(client, lead_id, **fields):
    response = client.post(f"/api/leads/{lead_id}/discussions", json={"note": "Called", **fields})
    assert response.status_code == 201, response.text
    return response.json()


def get_lead(client, lead_id):
    return client.get(f"/api/leads/{lead_id}").json()


# --- POST /api/leads/{id}/discussions ----------------------------------------


def test_create_discussion_returns_201(client, make_lead):
    lead = make_lead()

    response = client.post(
        f"/api/leads/{lead['id']}/discussions", json={"note": "  Intro call done. Wants a demo.  "}
    )

    assert response.status_code == 201
    body = response.json()
    assert body["id"] > 0
    assert body["lead_id"] == lead["id"]
    assert body["note"] == "Intro call done. Wants a demo."
    assert body["follow_up_at"] is None
    assert body["created_at"].endswith("Z")


def test_note_with_follow_up_sets_the_lead_follow_up_in_utc(client, make_lead):
    lead = make_lead()

    note = add_note(client, lead["id"], follow_up_at="2026-10-20T10:00:00+05:30")

    assert note["follow_up_at"] == "2026-10-20T04:30:00Z"
    updated = get_lead(client, lead["id"])
    assert updated["next_follow_up_at"] == "2026-10-20T04:30:00Z"
    assert datetime.fromisoformat(updated["updated_at"]) > datetime.fromisoformat(lead["updated_at"])


def test_note_without_follow_up_leaves_the_lead_follow_up_alone(client, make_lead):
    lead = make_lead()
    add_note(client, lead["id"], follow_up_at="2026-10-20T04:30:00Z")

    add_note(client, lead["id"], note="Sent the deck")

    assert get_lead(client, lead["id"])["next_follow_up_at"] == "2026-10-20T04:30:00Z"


def test_latest_follow_up_wins_even_when_it_is_earlier(client, make_lead):
    lead = make_lead()
    add_note(client, lead["id"], follow_up_at="2026-10-20T04:30:00Z")

    add_note(client, lead["id"], follow_up_at="2026-10-15T04:30:00Z")

    assert get_lead(client, lead["id"])["next_follow_up_at"] == "2026-10-15T04:30:00Z"


@pytest.mark.parametrize(
    "payload",
    [
        pytest.param({}, id="note missing"),
        pytest.param({"note": ""}, id="note empty"),
        pytest.param({"note": "   "}, id="note blank"),
        pytest.param({"note": "x" * 2001}, id="note too long"),
        pytest.param({"note": "ok", "follow_up_at": "tomorrow"}, id="follow-up not a date"),
        pytest.param({"note": "ok", "follow_up_at": "2026-10-20T10:00:00"}, id="follow-up without timezone"),
        pytest.param({"note": "ok", "mood": "good"}, id="unknown field"),
    ],
)
def test_create_discussion_rejects_invalid_input_with_422(client, make_lead, payload):
    lead = make_lead()

    response = client.post(f"/api/leads/{lead['id']}/discussions", json=payload)

    assert response.status_code == 422
    assert isinstance(response.json()["detail"], list)
    assert get_lead(client, lead["id"])["next_follow_up_at"] is None


def test_create_discussion_for_unknown_lead_returns_404(client):
    response = client.post("/api/leads/999/discussions", json={"note": "Hello"})

    assert response.status_code == 404
    assert response.json() == {"detail": "Lead not found"}


def _fail_when_saving_discussion(session, _context, _instances):
    if any(isinstance(obj, Discussion) for obj in session.new):
        raise RuntimeError("simulated failure while saving the discussion")


def _fail_when_saving_lead(session, _context, _instances):
    if any(isinstance(obj, Lead) for obj in session.dirty):
        raise RuntimeError("simulated failure while updating the lead")


@pytest.mark.parametrize("failure", [_fail_when_saving_discussion, _fail_when_saving_lead])
def test_discussion_and_lead_follow_up_are_saved_in_one_transaction(client, make_lead, failure):
    """Whichever write fails, neither the note nor the new follow-up may be left behind."""
    lead = make_lead()

    event.listen(Session, "before_flush", failure)
    try:
        with TestClient(app, raise_server_exceptions=False) as failing_client:
            response = failing_client.post(
                f"/api/leads/{lead['id']}/discussions",
                json={"note": "Demo booked", "follow_up_at": "2026-10-20T04:30:00Z"},
            )
    finally:
        event.remove(Session, "before_flush", failure)

    assert response.status_code == 500
    assert response.json() == {"detail": "Internal server error"}
    assert get_lead(client, lead["id"])["next_follow_up_at"] is None
    assert client.get(f"/api/leads/{lead['id']}/discussions").json() == []


# --- GET /api/leads/{id}/discussions -----------------------------------------


def test_list_discussions_is_newest_first(client, make_lead):
    lead = make_lead()
    for note in ("first", "second", "third"):
        add_note(client, lead["id"], note=note)

    response = client.get(f"/api/leads/{lead['id']}/discussions")

    assert response.status_code == 200
    assert [d["note"] for d in response.json()] == ["third", "second", "first"]


def test_list_discussions_only_returns_that_leads_notes(client, make_lead):
    mine, other = make_lead(name="Mine"), make_lead(name="Other")
    add_note(client, mine["id"], note="mine")
    add_note(client, other["id"], note="not mine")

    notes = client.get(f"/api/leads/{mine['id']}/discussions").json()

    assert [d["note"] for d in notes] == ["mine"]


def test_list_discussions_for_a_lead_without_notes_is_empty(client, make_lead):
    lead = make_lead()

    assert client.get(f"/api/leads/{lead['id']}/discussions").json() == []


def test_list_discussions_for_unknown_lead_returns_404(client):
    response = client.get("/api/leads/999/discussions")

    assert response.status_code == 404
    assert response.json() == {"detail": "Lead not found"}


# --- Data model --------------------------------------------------------------


def test_deleting_a_lead_deletes_its_discussions(client, make_lead):
    lead = make_lead()
    add_note(client, lead["id"])

    with Session(engine) as session:
        session.exec(delete(Lead).where(Lead.id == lead["id"]))
        session.commit()

    with Session(engine) as session:
        assert session.exec(select(Discussion)).all() == []
