from datetime import datetime, timedelta

import pytest


def assert_validation_error(response):
    assert response.status_code == 422
    detail = response.json()["detail"]
    assert isinstance(detail, list) and detail
    assert {"loc", "msg", "type"} <= detail[0].keys()


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
