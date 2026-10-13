"""Load demo data: nine fictional wealth-advisory prospects and their discussion history.

Follow-ups are placed relative to the moment you run this (in India time), so every state
shows on screen: due later today, due earlier today (pinned and overdue), overdue from past
days, upcoming, and none.

    python seed.py              wipe the database and load the demo data
    python seed.py --if-empty   load only if there are no leads yet (used by Docker Compose)
"""

import argparse
from dataclasses import dataclass, field
from datetime import datetime, time, timedelta, timezone

from sqlalchemy import delete, func
from sqlmodel import Session, select

from app.db import engine, init_db
from app.models import Discussion, Lead, LeadStatus, utcnow

# India has no daylight saving time, so a fixed offset is exact.
IST = timezone(timedelta(hours=5, minutes=30), "IST")


@dataclass
class Note:
    text: str
    days_ago: float
    follow_up: str | None = None  # a key into follow_up_times()


@dataclass
class Prospect:
    name: str
    company: str | None
    phone: str | None
    status: LeadStatus
    created_days_ago: float
    notes: list[Note] = field(default_factory=list)  # oldest first


PROSPECTS = [
    Prospect(
        "Meera Krishnan", "Krishnan Family Office", "+91 98450 22113", LeadStatus.QUALIFIED, 9,
        [
            Note("Inbound from the website. Family office of about ₹40 cr, mostly FDs and two PMS accounts.", 9),
            Note("Intro call. Unhappy with quarterly-only reporting from her advisor; wants one consolidated view.", 6),
            Note("Walked her through the portfolio review deck. Asked how we handle capital-gains harvesting.", 2),
            Note("Sent a sample tax-harvesting report. Wants a call with her CA this evening.", 0.15, "later_today"),
        ],
    ),
    Prospect(
        "Rohan Malhotra", "Malhotra Exports", "+91 98201 44678", LeadStatus.PROPOSAL_SENT, 15,
        [
            Note("Referred by an existing client. Exporter with surplus cash sitting in current accounts.", 15),
            Note("Risk profiling done: moderate, 5 to 7 year horizon.", 10),
            Note("Sent the proposal for a ₹2 cr managed portfolio, 60:40 equity to debt.", 4),
            Note("Read the proposal over the weekend, has two questions on exit loads. Call before lunch.", 1, "earlier_today"),
        ],
    ),
    Prospect(
        "Arjun Mehta", "Mehta Textiles", "+91 99300 51234", LeadStatus.CONTACTED, 8,
        [
            Note("Met at the Surat textile traders' meet. Interested in retirement planning for him and his wife.", 8),
            Note("Asked for our SEBI registration and fee structure before agreeing to a proper meeting.", 5),
            Note("Emailed the registration certificate and fee sheet. He will confirm a slot.", 3, "yesterday"),
        ],
    ),
    Prospect(
        "Neha Kapoor", "Kapoor & Co. Chartered Accountants", "+91 98111 40562", LeadStatus.CONTACTED, 12,
        [
            Note("Partner at a CA firm. Could refer clients who need investment advice alongside tax filing.", 12),
            Note("Wants a one-page note on how referrals and fees would work.", 6, "three_days_ago"),
        ],
    ),
    Prospect(
        "Priya Nair", "Coastline Hospitality", "+91 98470 66120", LeadStatus.QUALIFIED, 20,
        [
            Note("Runs three boutique hotels in Kochi. Wants to diversify beyond real estate.", 20),
            Note("First meeting done. Main goal is funding her two children's education.", 12),
            Note("Agreed targets of ₹50 lakh per child by 2036. Building the SIP plan now.", 2, "in_four_days"),
        ],
    ),
    Prospect(
        "Ishaan Bose", None, "+91 90070 33421", LeadStatus.NEW, 1.5,
        [
            Note("NRI in Singapore, moving back to Kolkata next year. Asked about converting NRE accounts.", 1.4),
            Note("Sent a short note on what changes for tax once he becomes resident.", 0.3, "tomorrow"),
        ],
    ),
    Prospect(
        "Vikram Reddy", "Reddy Agro Foods", "+91 98490 77231", LeadStatus.WON, 40,
        [
            Note("Second-generation founder, ₹8 cr liquid after selling a cold-storage unit.", 40),
            Note("Presented the plan with his father. Both liked the monthly reporting.", 30),
            Note("Signed the advisory mandate. Onboarding started.", 21),
            Note("KYC complete and the first ₹75 lakh deployed.", 14),
        ],
    ),
    Prospect(
        "Sneha Kulkarni", "Kulkarni Pharma Distributors", "+91 98220 18877", LeadStatus.LOST, 25,
        [
            Note("Inbound via LinkedIn after our post on tax-loss harvesting.", 25),
            Note("Demo went well, she liked the consolidated dashboard.", 18),
            Note("Staying with her bank's relationship manager for now. Revisit next financial year.", 9),
        ],
    ),
    Prospect("Kabir Sethi", "Sethi Dental Clinics", None, LeadStatus.NEW, 0.04),
]


def _floor_to_5_minutes(moment: datetime) -> datetime:
    return moment.replace(minute=moment.minute - moment.minute % 5, second=0, microsecond=0)


def _later_today(local: datetime, start_of_tomorrow: datetime) -> datetime:
    target = local + min(timedelta(hours=2), (start_of_tomorrow - local) / 2)
    rounded = _floor_to_5_minutes(target)
    return rounded if rounded > local else target  # near midnight, rounding could fall before now


def follow_up_times(now: datetime) -> dict[str, datetime]:
    """Follow-up moments relative to `now`, on India's calendar."""
    local = now.astimezone(IST)
    start_of_today = datetime.combine(local.date(), time.min, IST)
    start_of_tomorrow = start_of_today + timedelta(days=1)

    def on_day(days_from_today: int, hour: int, minute: int = 0) -> datetime:
        return start_of_today + timedelta(days=days_from_today, hours=hour, minutes=minute)

    return {
        # Always inside today and on the right side of now, whatever time the seed runs.
        "later_today": _later_today(local, start_of_tomorrow),
        "earlier_today": _floor_to_5_minutes(local - min(timedelta(hours=3), (local - start_of_today) / 2)),
        "yesterday": on_day(-1, 11),
        "three_days_ago": on_day(-3, 16),
        "tomorrow": on_day(1, 10, 30),
        "in_four_days": on_day(4, 15),
    }


def seed(session: Session, now: datetime | None = None, only_if_empty: bool = False) -> int:
    """Load the demo prospects and return how many leads were created."""
    now = now or utcnow()
    if only_if_empty and session.exec(select(func.count()).select_from(Lead)).one() > 0:
        return 0

    session.exec(delete(Discussion))
    session.exec(delete(Lead))

    times = follow_up_times(now)
    for prospect in PROSPECTS:
        created_at = now - timedelta(days=prospect.created_days_ago)
        lead = Lead(
            name=prospect.name,
            company=prospect.company,
            phone=prospect.phone,
            status=prospect.status,
            created_at=created_at,
            updated_at=created_at,
        )
        for note in prospect.notes:
            noted_at = now - timedelta(days=note.days_ago)
            follow_up = times[note.follow_up].astimezone(timezone.utc) if note.follow_up else None
            lead.discussions.append(Discussion(note=note.text, follow_up_at=follow_up, created_at=noted_at))
            if follow_up:
                # Same rule as the API: the newest note with a follow-up sets the lead's next follow-up.
                lead.next_follow_up_at = follow_up
                lead.updated_at = noted_at
        session.add(lead)

    session.commit()
    return len(PROSPECTS)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--if-empty", action="store_true", help="only seed when there are no leads yet")
    args = parser.parse_args()

    init_db()
    with Session(engine) as session:
        created = seed(session, only_if_empty=args.if_empty)
    print(f"Seeded {created} leads." if created else "Leads already exist; seed skipped.")


if __name__ == "__main__":
    main()
