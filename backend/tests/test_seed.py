from collections import Counter
from datetime import datetime, timezone

from sqlmodel import Session, select

from app.db import engine
from app.models import Discussion, Lead, LeadStatus
from seed import IST, seed

NOW = datetime(2026, 10, 14, 9, 30, tzinfo=timezone.utc)  # Wednesday, 3:00 PM in India
TODAY = NOW.astimezone(IST).date()


def run_seed():
    with Session(engine) as session:
        seed(session, now=NOW)
    with Session(engine) as session:
        return session.exec(select(Lead)).all(), session.exec(select(Discussion)).all()


def local_day(moment):
    return moment.astimezone(IST).date()


def test_seed_creates_at_least_five_leads_covering_every_status():
    leads, _ = run_seed()

    assert len(leads) >= 5
    assert {lead.status for lead in leads} == set(LeadStatus)


def test_seed_gives_most_leads_several_discussions_and_leaves_one_without_any():
    leads, discussions = run_seed()
    per_lead = Counter(d.lead_id for d in discussions)

    assert sum(1 for lead in leads if per_lead[lead.id] >= 2) >= 5
    assert sum(1 for lead in leads if per_lead[lead.id] == 0) == 1


def test_seed_covers_every_follow_up_state_relative_to_now():
    leads, _ = run_seed()
    follow_ups = [lead.next_follow_up_at for lead in leads if lead.next_follow_up_at]

    assert any(local_day(f) == TODAY and f < NOW for f in follow_ups), "today, already overdue"
    assert any(local_day(f) == TODAY and f > NOW for f in follow_ups), "today, still upcoming"
    assert any(local_day(f) < TODAY for f in follow_ups), "overdue from an earlier day"
    assert any(local_day(f) > TODAY for f in follow_ups), "upcoming on a later day"
    assert any(lead.next_follow_up_at is None for lead in leads), "no follow-up"


def test_seed_keeps_each_lead_follow_up_in_sync_with_its_latest_note():
    leads, discussions = run_seed()

    for lead in leads:
        planned = sorted(
            (d for d in discussions if d.lead_id == lead.id and d.follow_up_at),
            key=lambda d: d.created_at,
        )
        expected = planned[-1].follow_up_at if planned else None
        assert lead.next_follow_up_at == expected, lead.name


def test_seed_only_writes_history_in_the_past():
    leads, discussions = run_seed()

    assert all(lead.created_at <= NOW for lead in leads)
    assert all(d.created_at <= NOW for d in discussions)


def test_seed_replaces_existing_data():
    first, _ = run_seed()

    second, _ = run_seed()

    assert len(second) == len(first)


def test_seed_if_empty_leaves_existing_data_alone():
    with Session(engine) as session:
        session.add(Lead(name="Keep me"))
        session.commit()

    with Session(engine) as session:
        created = seed(session, now=NOW, only_if_empty=True)

    with Session(engine) as session:
        names = [lead.name for lead in session.exec(select(Lead)).all()]
    assert created == 0
    assert names == ["Keep me"]
