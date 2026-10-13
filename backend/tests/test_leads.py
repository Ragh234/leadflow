from datetime import datetime, timedelta

import pytest
from sqlalchemy import event

from app.db import engine


def assert_validation_error(response):
    assert response.status_code == 422
    detail = response.json()["detail"]
    assert isinstance(detail, list) and detail
    assert {"loc", "msg", "type"} <= detail[0].keys()


def add_note(client, lead_id, note="Called", **fields):
    response = client.post(f"/api/leads/{lead_id}/discussions", json={"note": note, **fields})
    assert response.status_code == 201, response.text
    return response.json()


def list_names(client, **params):
    response = client.get("/api/leads", params=params)
    assert response.status_code == 200, response.text
    return [lead["name"] for lead in response.json()]


# --- POST /api/leads ---------------------------------------------------------


def test_create_lead_returns_201_with_defaults(client):
    response = client.post("/api/leads", json={"name": "Ananya Iyer"})

    assert response.status_code == 201
    body = response.json()
    assert body["id"] > 0
    assert body["name"] == "Ananya Iyer"
    assert body["company"] is None
    assert body["phone"] is None
    assert body["status"] == "new"
    assert body["next_follow_up_at"] is None
    assert body["last_discussion_note"] is None
    assert body["last_discussion_at"] is None


def test_create_lead_returns_utc_timestamps_with_an_explicit_offset(client):
    body = client.post("/api/leads", json={"name": "Ananya Iyer"}).json()

    for field in ("created_at", "updated_at"):
        assert body[field].endswith("Z"), body[field]
        assert datetime.fromisoformat(body[field]).utcoffset() == timedelta(0)


def test_create_lead_trims_text_and_turns_blank_optionals_into_null(client):
    body = client.post(
        "/api/leads",
        json={"name": "  Rohan Mehta ", "company": "   ", "phone": " +91 98200 12345 "},
    ).json()

    assert body["name"] == "Rohan Mehta"
    assert body["company"] is None
    assert body["phone"] == "+91 98200 12345"


def test_create_lead_accepts_an_explicit_status(client):
    body = client.post("/api/leads", json={"name": "Kavya Rao", "status": "contacted"}).json()

    assert body["status"] == "contacted"


@pytest.mark.parametrize(
    "payload",
    [
        pytest.param({}, id="name missing"),
        pytest.param({"name": "   "}, id="name blank"),
        pytest.param({"name": "x" * 121}, id="name too long"),
        pytest.param({"name": "Ok", "status": "maybe"}, id="unknown status"),
        pytest.param({"name": "Ok", "phone": "call me later"}, id="letters in phone"),
        pytest.param({"name": "Ok", "email": "a@b.co"}, id="unknown field"),
    ],
)
def test_create_lead_rejects_invalid_input_with_422(client, payload):
    assert_validation_error(client.post("/api/leads", json=payload))


# --- GET /api/leads/{id} -----------------------------------------------------


def test_get_lead_returns_the_lead(client, make_lead):
    lead = make_lead(name="Vikram Shah", company="Shah Family Office")

    response = client.get(f"/api/leads/{lead['id']}")

    assert response.status_code == 200
    assert response.json() == lead


def test_get_unknown_lead_returns_404(client):
    response = client.get("/api/leads/999")

    assert response.status_code == 404
    assert response.json() == {"detail": "Lead not found"}


def test_get_lead_with_a_non_numeric_id_returns_422(client):
    assert_validation_error(client.get("/api/leads/abc"))


# --- PATCH /api/leads/{id} ---------------------------------------------------


def test_patch_status_persists(client, make_lead):
    lead = make_lead()

    response = client.patch(f"/api/leads/{lead['id']}", json={"status": "qualified"})

    assert response.status_code == 200
    assert response.json()["status"] == "qualified"
    assert client.get(f"/api/leads/{lead['id']}").json()["status"] == "qualified"


def test_patch_bumps_updated_at_but_not_created_at(client, make_lead):
    lead = make_lead()

    body = client.patch(f"/api/leads/{lead['id']}", json={"status": "contacted"}).json()

    assert body["created_at"] == lead["created_at"]
    assert datetime.fromisoformat(body["updated_at"]) > datetime.fromisoformat(lead["updated_at"])


def test_patch_only_changes_the_fields_it_is_given(client, make_lead):
    lead = make_lead(name="Neha Kapoor", company="Kapoor Capital", phone="98765 43210")

    body = client.patch(f"/api/leads/{lead['id']}", json={"name": "Neha K. Kapoor"}).json()

    assert body["name"] == "Neha K. Kapoor"
    assert body["company"] == "Kapoor Capital"
    assert body["phone"] == "98765 43210"


def test_patch_can_clear_an_optional_field(client, make_lead):
    lead = make_lead(company="Kapoor Capital")

    body = client.patch(f"/api/leads/{lead['id']}", json={"company": None}).json()

    assert body["company"] is None


@pytest.mark.parametrize(
    "payload",
    [
        pytest.param({"status": "maybe"}, id="unknown status"),
        pytest.param({"status": None}, id="null status"),
        pytest.param({"name": None}, id="null name"),
        pytest.param({"name": "  "}, id="blank name"),
        pytest.param({"colour": "red"}, id="unknown field"),
    ],
)
def test_patch_rejects_invalid_input_with_422(client, make_lead, payload):
    lead = make_lead()

    assert_validation_error(client.patch(f"/api/leads/{lead['id']}", json=payload))


def test_patch_unknown_lead_returns_404(client):
    response = client.patch("/api/leads/999", json={"status": "won"})

    assert response.status_code == 404
    assert response.json() == {"detail": "Lead not found"}


# --- GET /api/leads ----------------------------------------------------------


def test_list_leads_is_empty_at_first(client):
    response = client.get("/api/leads")

    assert response.status_code == 200
    assert response.json() == []


def test_list_includes_the_latest_discussion_note_and_time(client, make_lead):
    lead = make_lead()
    add_note(client, lead["id"], "First call")
    latest = add_note(client, lead["id"], "Sent the proposal deck")

    [row] = client.get("/api/leads").json()

    assert row["last_discussion_note"] == "Sent the proposal deck"
    assert row["last_discussion_at"] == latest["created_at"]


def test_list_shows_null_last_discussion_for_a_lead_without_notes(client, make_lead):
    make_lead()

    [row] = client.get("/api/leads").json()

    assert row["last_discussion_note"] is None
    assert row["last_discussion_at"] is None


def test_get_and_patch_also_return_the_latest_discussion(client, make_lead):
    lead = make_lead()
    add_note(client, lead["id"], "Sent the proposal deck")

    fetched = client.get(f"/api/leads/{lead['id']}").json()
    patched = client.patch(f"/api/leads/{lead['id']}", json={"status": "proposal_sent"}).json()

    assert fetched["last_discussion_note"] == "Sent the proposal deck"
    assert patched["last_discussion_note"] == "Sent the proposal deck"


def test_list_puts_the_most_recently_active_lead_first(client, make_lead):
    older = make_lead(name="Older lead")
    make_lead(name="Newer lead")

    add_note(client, older["id"], "Just spoke to them")

    assert list_names(client) == ["Older lead", "Newer lead"]


def test_list_filters_by_status(client, make_lead):
    make_lead(name="Fresh", status="new")
    make_lead(name="Closed", status="won")

    assert list_names(client, status="won") == ["Closed"]


def test_list_with_an_unknown_status_returns_422(client):
    assert_validation_error(client.get("/api/leads", params={"status": "maybe"}))


def test_search_matches_part_of_the_name_case_insensitively(client, make_lead):
    make_lead(name="Priya Nair")
    make_lead(name="Arjun Menon")

    assert list_names(client, search="PRI") == ["Priya Nair"]


def test_search_treats_sql_wildcards_literally(client, make_lead):
    make_lead(name="100% Returns Desk")
    make_lead(name="Arjun Menon")

    assert list_names(client, search="%") == ["100% Returns Desk"]


def test_search_and_status_filter_combine(client, make_lead):
    make_lead(name="Priya Nair", status="won")
    make_lead(name="Priya Shah", status="new")

    assert list_names(client, search="priya", status="new") == ["Priya Shah"]


def test_list_fetches_leads_and_their_latest_discussion_in_one_query(client, make_lead):
    for i in range(5):
        lead = make_lead(name=f"Lead {i}")
        for n in range(3):
            add_note(client, lead["id"], f"note {n}")

    statements: list[str] = []

    def record(_conn, _cursor, statement, *_args):
        statements.append(statement)

    event.listen(engine, "before_cursor_execute", record)
    try:
        response = client.get("/api/leads")
    finally:
        event.remove(engine, "before_cursor_execute", record)

    assert response.status_code == 200
    assert {row["last_discussion_note"] for row in response.json()} == {"note 2"}
    assert len(statements) == 1, statements
