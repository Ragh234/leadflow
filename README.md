# LeadFlow

[![CI](https://github.com/Ragh234/leadflow/actions/workflows/ci.yml/badge.svg)](https://github.com/Ragh234/leadflow/actions/workflows/ci.yml)

A single-screen CRM for a sales rep: every lead in one list, today's follow-ups pinned at the top, and a dialog per lead with the full discussion history, where you log a note, set the next follow-up and change the status.

Built for the Pravar AI full-stack intern assignment with Next.js and FastAPI.

![Lead list with today's follow-ups pinned and overdue ones in red](docs/screenshots/01-lead-list.png)

| Timeline dialog | Logging a note with a follow-up |
|---|---|
| ![Timeline](docs/screenshots/02-lead-timeline.png) | ![New note](docs/screenshots/03-add-note-with-follow-up.png) |
| **Add lead** | **Overdue filter** |
| ![Add lead](docs/screenshots/05-add-lead.png) | ![Overdue filter](docs/screenshots/06-overdue-filter.png) |

More: [status change](docs/screenshots/04-status-change.png), [phone width](docs/screenshots/07-mobile.png), and a [50-second demo video](docs/demo.mp4).

## What it does

- **Lead list.** Name, company, status badge, the last discussion note (one line) and how long ago it was, or "No discussions yet".
- **Today's follow-ups pinned.** Leads whose follow-up falls on today's date (in your time zone) move to a pinned section at the top, earliest first.
- **Overdue in red.** Any follow-up earlier than now is red, in the list, the pinned section and the dialog.
- **Timeline dialog.** Click a lead to see every discussion, newest first. Add a note with an optional follow-up date and time; the list updates as soon as it saves. Change the status from the same dialog.
- **Add lead.** Name is required, company and phone are optional, and the status starts as New.
- **Search and filters.** Search by name, filter by status, and filter by follow-up (due today, overdue, upcoming, none).
- **Small things a rep would use daily:** one-click follow-up times (tomorrow 10 AM, in 3 days, next Monday), Ctrl+Enter to save a note, and "Mark done" to clear a follow-up once it's handled.

## Stack

| Part | Choice |
|---|---|
| Web | Next.js 16 (App Router), TypeScript, Tailwind CSS 4, shadcn/ui (Radix), TanStack Query 5 |
| API | FastAPI, SQLModel (SQLAlchemy 2), Pydantic 2 |
| Database | SQLite locally, Postgres 16 in Docker Compose |
| Tests | pytest + TestClient (66 tests, run on SQLite and Postgres), Vitest (34), Playwright (end-to-end walkthrough) |
| CI | GitHub Actions: API tests on both databases, then web lint, unit tests and build |

## Run it locally (no Docker)

You need Python 3.12+ and Node.js 20.9+. Every setting has a working default, so no `.env` file is needed.

**API** (terminal 1):

```bash
cd backend
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements-dev.txt
python seed.py                   # optional: loads 9 demo leads
uvicorn app.main:app --reload --port 8000
```

**Web** (terminal 2):

```bash
cd frontend
npm ci
npm run dev
```

Open http://localhost:3000. Interactive API docs are at http://localhost:8000/docs.

## Run it with Docker Compose

```bash
docker compose up --build
```

This starts Postgres, the API and the web app, in that order, each waiting for the previous one to be healthy. The API loads the demo data on its first boot only. Open http://localhost:3000.

To start again from an empty database: `docker compose down -v`.

## Environment variables

See [`.env.example`](.env.example). Copy it to `.env` only if you need to change something.

| Variable | Used by | Default | Notes |
|---|---|---|---|
| `DATABASE_URL` | API | `sqlite:///./leadflow.db` | Any SQLAlchemy URL. Compose sets its own Postgres URL. |
| `FRONTEND_ORIGIN` | API | `http://localhost:3000` | Allowed CORS origin(s), comma-separated. |
| `NEXT_PUBLIC_API_URL` | Web | `http://localhost:8000` | The URL the **browser** calls. Inlined at build time, so Compose passes it as a build argument. |
| `POSTGRES_PASSWORD` | Compose | `leadflow` | Password for the Compose database. |
| `TEST_DATABASE_URL` | pytest | unset (in-memory SQLite) | Point the test suite at Postgres. |

## Seed data

```bash
cd backend
python seed.py              # wipe and load the demo data
python seed.py --if-empty   # load only when there are no leads (what Docker runs)
```

Nine fictional prospects for a wealth-advisory firm (family offices, founders, an NRI returning home), across all six statuses, with two to four notes each and one lead with none. Follow-ups are placed relative to the moment you run the seed, so the screen always shows one due later today, one due earlier today (pinned and red), overdue ones from past days, upcoming ones, and leads with no follow-up.

## Tests

```bash
cd backend && pytest                                  # 66 API tests, in-memory SQLite
TEST_DATABASE_URL=postgresql+psycopg://user:pass@localhost:5432/db pytest   # same suite on Postgres

cd frontend && npm test                               # Vitest: follow-up and time helpers
cd frontend && npm run lint && npm run build
cd frontend && npx playwright install chromium && npm run e2e   # needs the API and web running
```

The Playwright walkthrough reseeds the database, clicks through every flow in the brief, checks the result of each step, and saves the screenshots in `docs/screenshots/`.

## API

JSON under `/api`. Every error has the same shape: `{"detail": ...}`.

| Method and path | Success | Errors | Notes |
|---|---|---|---|
| `GET /api/health` | 200 | | Runs `SELECT 1`, so "ok" means the database answers. |
| `GET /api/leads?status=&search=` | 200 | 422 (unknown status) | Newest activity first. Each lead includes `last_discussion_note` and `last_discussion_at`. Search is a case-insensitive name match. |
| `POST /api/leads` | 201 | 422 | `{name, company?, phone?}`. Status defaults to `new`. |
| `GET /api/leads/{id}` | 200 | 404, 422 | Same shape as a list item. |
| `PATCH /api/leads/{id}` | 200 | 404, 422 | Any of `status`, `name`, `company`, `phone`. Also `next_follow_up_at` (`null` marks it done). |
| `GET /api/leads/{id}/discussions` | 200 | 404 | Newest first. |
| `POST /api/leads/{id}/discussions` | 201 | 404, 422 | `{note, follow_up_at?}`. A follow-up also updates the lead's `next_follow_up_at` in the same transaction. |

Statuses: `new`, `contacted`, `qualified`, `proposal_sent`, `won`, `lost`. Times are ISO 8601 in UTC (`2026-10-14T04:30:00Z`).

```jsonc
// 404
{ "detail": "Lead not found" }
// 422: field-level issues, without echoing the rejected input back
{ "detail": [{ "loc": ["body", "name"], "msg": "String should have at least 1 character", "type": "string_too_short" }] }
// 500: no internals leaked
{ "detail": "Internal server error" }
```

Request bodies reject unknown fields, so a typo like `{"stauts": "won"}` is a 422 instead of being silently ignored.

## Design decisions

**Time zones.** All times are stored in UTC, and "today" and "overdue" are decided in the browser.

- The server doesn't know where the rep is. At 1:30 AM in India it is still the previous day in UTC, so a server-side "today" would pin the wrong leads for five and a half hours every night.
- SQLite drops time zone information. A plain datetime column hands back `2026-10-14 04:30:00` with no offset, the browser reads that as local time, and every follow-up shifts by 5h30m. A small column type ([`UTCDateTime`](backend/app/db.py)) always returns UTC-aware values, so every response carries a `Z`.
- The API rejects times without an offset (422), because `2026-10-20T10:00` alone doesn't say whose 10 AM it is.
- The rules live in one module, [`follow-up.ts`](frontend/src/lib/follow-up.ts), as pure functions that take `now`. Vitest runs them in `Asia/Kolkata` and covers the cases that break naive code: 20:00 UTC on the 13th is "today" on the 14th in India, and 18:45 UTC on the 14th is already tomorrow.
- The page re-reads the clock every minute, so "3h ago", the pinned section and the red highlighting stay right on a tab left open all day. The clock is never read while Next.js prerenders the page, so a build-time "now" can't get baked in.

**Why the follow-up update is one transaction.** Saving a note with a follow-up writes two rows: the new discussion and the lead's `next_follow_up_at`. Separate commits could leave a note whose follow-up never reached the list, or a pinned follow-up whose note is missing. With one commit, both land or neither does. The test injects a failure while saving the discussion, then while updating the lead, and checks nothing is left behind. I also split the commit on purpose to confirm the test catches it.

**Latest note in one query.** The list needs each lead's newest discussion. A per-lead query would be N+1, so the list uses a `ROW_NUMBER()` window over discussions, LEFT JOINed onto leads. It works the same on SQLite and Postgres, and a test counts the SQL statements to prove it's one.

**Smaller choices.**
- Pinned leads move to the top rather than appearing twice, and the pinned section respects the active filters.
- Only a lead's *current* follow-up turns red. The "follow-up set for" chips in the timeline are history, so they stay neutral.
- Status and search filter on the server, because they scale with the data. The follow-up filter runs in the browser, because it depends on the rep's local date.
- The latest note with a follow-up wins, even if it's earlier than the current one. A note without a follow-up leaves the existing one alone.
- Tables are created on startup (`create_all`) instead of with migrations. That's fine for a demo, and it's the first item under "next".

## Project structure

```
backend/
  app/            main.py (app, CORS, errors) · db.py (engine, UTCDateTime) · models.py (tables)
                  schemas.py (request/response) · routers/ (health, leads, discussions)
  tests/          one file per router, plus the seed
  seed.py
frontend/
  src/lib/        follow-up.ts and format.ts (+ tests) · api.ts (typed client) · types.ts · status.ts
  src/hooks/      use-leads.ts (queries and mutations) · use-now.ts (shared clock) · use-debounced-value.ts
  src/components/leads/   leads-view → filters, lead-list / lead-card, lead-dialog → timeline + note form, add-lead-dialog
  e2e/            Playwright walkthrough
docker-compose.yml
```

## How this maps to the brief

| Criterion | Where |
|---|---|
| List shows name, status, last note, time ago | [`lead-card.tsx`](frontend/src/components/leads/lead-card.tsx), data from one query in [`leads.py`](backend/app/routers/leads.py) |
| Today's follow-ups pinned correctly | `isFollowUpToday` and `splitPinned` in [`follow-up.ts`](frontend/src/lib/follow-up.ts), tested across the UTC/IST boundary |
| Timeline loads discussions in order | `ORDER BY created_at DESC, id DESC` in [`discussions.py`](backend/app/routers/discussions.py), tested |
| Adding a discussion updates the list immediately | Every mutation invalidates the `leads` query ([`use-leads.ts`](frontend/src/hooks/use-leads.ts)); checked in the e2e walkthrough |
| Add new lead works | [`add-lead-dialog.tsx`](frontend/src/components/leads/add-lead-dialog.tsx), `POST /api/leads` |
| Status update from the dialog persists | [`lead-dialog.tsx`](frontend/src/components/leads/lead-dialog.tsx), `PATCH`; the e2e test reloads and checks |
| Clean frontend component structure | One component per concern in `src/components/leads`; data access only through hooks |
| Correct status codes, clean errors | 201/200/404/422/500 tested for every endpoint; one `{"detail": ...}` shape ([`errors.py`](backend/app/errors.py)) |
| Bonus: search, overdue in red, Docker Compose, seed, filters | All five, plus CI and the e2e walkthrough |

## What I'd do next

- **Migrations** with Alembic, instead of `create_all`.
- **Login and ownership.** The brief made login optional. Real use needs each lead assigned to a rep.
- **Reminders** that reach the rep when a follow-up is due (email or WhatsApp), not only when the page is open.
- **Edit lead details** in the dialog. `PATCH` already accepts name, company and phone; the UI doesn't expose it yet.
- **Paging** once a rep has hundreds of leads. The pinned section would then need its own query, with the browser sending its UTC offset.
- **AI where it saves a rep time**, which fits what Pravar builds for advisors: a short summary of a lead's history before a call, a suggested follow-up date pulled from the note ("call after Diwali"), and a drafted follow-up message for the rep to edit and send.

## Use of AI

I built LeadFlow with **Claude Code** (Anthropic's coding agent) as my pair programmer, which Pravar's brief encourages. Claude Code wrote the code. I decided what it built, checked how it built it, and tested the result. In detail:

**How I directed the work**
- Wrote the spec it worked from: scope, stack, data model, API contract, the follow-up rules, deliverables, and the order (required items first, then bonus, then extras).
- Had it cross-check my spec against Pravar's original email, which caught a missing deliverable (the demo video).
- Reviewed the plan before any code was written. I cut items that weren't worth the time and picked the extras to keep (Mark done, quick follow-up times, the end-to-end test, CI).
- Chose the wealth-advisory theme for the demo data, and set the rules for the repo: small commits under my own name, no planning files in the history.

**What I reviewed and tested myself**
- Reviewed the backend code: the models and schemas, the single-query lead list, the transaction that saves a note and its follow-up, and the error handling.
- Reviewed the frontend code: the component structure, the follow-up rules in `follow-up.ts`, and how data is fetched and refreshed after each change.
- Tested every flow by hand in the browser:
  - adding leads, including the validation errors;
  - logging notes with and without follow-ups;
  - the pinned section and overdue highlighting;
  - status changes surviving a reload;
  - search and both filters;
  - Mark done;
  - the layout at phone width.

**Where the AI's first attempt was wrong, and how it was caught**
- The first version of the clock hook read the time during Next.js prerendering. Next 16 flagged it, and it was rewritten so "now" always comes from the browser.
- The first transaction test (one injected failure) would have passed with a broken implementation. It now fails at both writes, and a deliberately split commit confirmed the test catches it.
- The seed's "later today" rounding could land before "now" just before midnight. It's now guarded and checked at boundary times.
- Vitest 5 doesn't support Node 20, so the project pins Vitest 4. The follow-up checkbox was also missing an accessible label. Both were found by running things, not by reading code.
