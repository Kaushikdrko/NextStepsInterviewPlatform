# Champion Dashboard

One page — `/champion/dashboard` — that lets an authorized champion see every
student in the organization, search them, filter by activity, and open a small
read-only details panel.

Champions are **not** assigned students. Every authorized champion sees the same
organization-wide data; the only champion-specific information on the page is
their own name and role in the header.

## Authorization

Both the route and the API require a `champion` (or `admin`) role.

The role lives in the **Supabase JWT**, not in a database column — the same
mechanism `require_admin_user` already uses. Grant it with the Supabase admin
API:

```python
supabase.auth.admin.update_user_by_id(
    user_id, {"app_metadata": {"role": "champion"}}
)
```

Enforcement happens in two independent places, and the backend does not trust
the frontend:

| Layer | File | What it does |
|---|---|---|
| Frontend | `yns-web/middleware.ts` | Redirects signed-out users to `/sign-in` and signed-in non-champions to `/dashboard` |
| Backend | `yns-api/app/dependencies.py` → `require_champion_user` | Rejects every `/api/champion/*` request without the role (401 / 403) |

### Row Level Security

The RLS policies in `rls-policies.sql` are all student-self-scoped
(`user_id = auth.uid()`), so they cannot serve a cross-student aggregate. The
dashboard queries therefore run over `DATABASE_URL` through SQLAlchemy, which
connects as the table owner and is not subject to RLS — exactly the path the
existing admin-only endpoints (for example `GET /api/career-profiles`) already
use.

**No RLS policy changes are required, and none were made.** The browser never
queries these tables directly; it only ever calls the authorized API. If the
anon-key client is ever given champion read access, that would need new
policies — deliberately not done here, because it would widen access to student
data beyond the API.

## API

All routes are mounted under `/api/champion` and require the role above.

```
GET /api/champion/me
GET /api/champion/students?search=&status=&range=&sortBy=&sortOrder=&page=&pageSize=
GET /api/champion/students/{studentId}?range=
```

| Parameter | Allowed values | Default |
|---|---|---|
| `search` | free text, max 100 chars | none |
| `status` | `all`, `active`, `inactive`, `never_started` | `all` |
| `range` | `7d`, `30d`, `school_year`, `all_time` | `30d` |
| `sortBy` | `fullName`, `questionsAnswered`, `interviewsCompleted`, `practiceTime` | `fullName` |
| `sortOrder` | `asc`, `desc` | `asc` |
| `page` | 1–10000 | `1` |
| `pageSize` | 1–100 | `25` |

Anything outside these sets is rejected with a 422 before it reaches the
database. Sort fields are mapped through an allowlist
(`domain.SORT_COLUMNS`) — the ORDER BY clause is the only interpolated SQL
fragment anywhere, and it can only ever contain a value from that dict. Every
other request value is a bound parameter. Search terms have their `%`, `_` and
`\` escaped so a search for `%` matches a literal percent sign instead of every
student.

## How each number is calculated

Everything is aggregated in Postgres. The browser receives one page of students
and never does any counting.

| Field | Source |
|---|---|
| Student list | `app_users` where `user_type` is a student type |
| Full name | `app_users.name`, falling back to `email` when blank |
| Questions answered | `interview_turns` with a non-null `answer_text`, joined to the student's sessions |
| Interviews completed | `interview_sessions` with `status = 'completed'` |
| Practice time | `SUM(completed_at - started_at)` over completed sessions |
| Grade / year | latest `career_profiles.grade_level` |
| Student type | `app_users.user_type`, mapped to a readable label |
| Email | `app_users.email` |

### Activity status

Defined once, in `app/api/champion/domain.py`, and enforced in SQL:

- **Active** — answered a question or completed an interview *inside the
  selected range*.
- **Inactive** — has lifetime activity but none inside the range.
- **Never Started** — zero questions, zero interviews and zero practice time,
  ever. Widening the range never moves a student out of this bucket.

### School year

Treated as starting **1 August**. Before August the range starts on the previous
1 August.

## Known limitations

These are schema gaps, not bugs. The drawer shows an honest "Not provided"
rather than a plausible-looking wrong value.

1. **`school` is not stored anywhere.** The nearest column,
   `career_profiles.colleges_preparing_for`, holds the colleges a student is
   *preparing for* — displaying it as their school would be wrong. Fix: add
   `app_users.school text` (or `career_profiles.school`) and populate it during
   onboarding, then read it in `service.get_student_details`.
2. **`phone` is not stored anywhere.** Onboarding never collects it. Fix: add
   `app_users.phone text`.
3. **Practice time is derived, not recorded.** No column stores session
   duration, so it is computed from a completed session's wall-clock span. A
   student who leaves a tab open and finishes hours later would inflate the
   total, so each session contributes at most `MAX_SESSION_SECONDS` (4 hours).
   Practice time is deliberately **never** inferred from question count. Fix:
   persist the real elapsed time the client already tracks (`totalTimeSeconds`
   in `lib/services/interview-feedback.ts` currently only reaches localStorage).
4. **In-progress sessions contribute no practice time**, because they have no
   `completed_at`. Their answered questions still count.
5. **Champions are identified by JWT role, not by a database column.** A
   champion whose `app_users.user_type` is a student type will also appear in
   the student list. Fix: add an `app_users.role` column and filter on it.

## Indexes

Apply `docs/champion-dashboard.sql` before the roster grows. It adds a trigram
extension and index for the search box (a leading-wildcard `ILIKE` cannot use a
btree index) plus composite indexes for the date-window aggregates.

### Scaling note

Activity filtering and sorting by any of the three metric columns both depend on
the aggregate, so the query aggregates before it paginates. That is the right
trade-off for a roster in the hundreds or low thousands, which is what this
organization has. If it ever reaches tens of thousands of students, replace the
`turn_totals` / `session_totals` CTEs with a per-student rollup table refreshed
on a schedule; the API contract would not change.

## Verifying locally

The unit and API tests run with no database:

```bash
cd yns-platform/yns-api && python -m pytest -m "not integration"
```

The SQL itself is covered by an opt-in suite that needs a real PostgreSQL. It
builds and drops its own `champion_test` schema and never touches `public`:

```bash
CHAMPION_TEST_DATABASE_URL=postgresql+psycopg2://... \
  python -m pytest tests/integration/test_champion_queries.py
```
