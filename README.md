# Your Next Steps (YNS) — Interview Practice Platform

**Website Link**: https://yns-web-899993224058.us-central1.run.app/sign-in

Your Next Steps (YNS) is a nonprofit interview-practice platform for high-school
students, college students, and recent graduates. It helps a student prepare for
a real opportunity by grounding practice in their career goals, resume, and (if
available) a target job posting. The product is built around one central
question: **What problem do you want to solve?** Feedback focuses on the
substance of an answer—specificity, self-awareness, and alignment—not accent,
filler words, eye contact, or speaking style.

## Product experience

The intended student journey is:

1. **Create an account** with email/password sign-up and email OTP verification.
2. **Complete onboarding** through the career or high-school track, adding
  skills, an optional resume, and an optional job posting.
3. **Choose a practice mode**: behavioral, technical, resume-based,
  job-posting-based, or mixed.
4. **Practice in a planned session**. Gemini creates the question plan, asks
  follow-up questions, and evaluates each answer concurrently.
5. **Review feedback** with answer-level evaluations, quotes, growth areas, and
  concrete next steps.
6. **Return to the dashboard or history** to continue practicing and review
  completed sessions.

The platform also includes a Champion Dashboard: authorized mentors/admins can
search and filter an organization-wide student roster and open read-only
student activity details. Champion access is controlled by an API-side email
allowlist, not by the frontend alone.

## Current workflows

- **Onboarding** — a guided wizard (career or high-school track) that captures
  career stage, target role, skills, an optional resume upload, and an
  optional job posting to prep for.
- **Interview practice** — behavioral, technical, resume-based, job-posting,
  or mixed sessions. Each session is planned, conducted, and scored by Gemini
  via three cooperating AI assistants (planner → interviewer + evaluator run
  concurrently → reporter).
- **Session history & dashboard** — past sessions, weekly practice goals,
  a computed "focus area" (your most common growth theme across reports), and
  practice-streak tracking.
- **Champion Dashboard** — a read-only, organization-wide roster for mentors/
  admins to see every student's activity, searchable and filterable, with a
  per-student detail drawer. Access is granted by adding an email to
  `yns-api/app/admin_emails.py`; champions pick Student or Champion on the
  login page, so one account can use both experiences.

The active interview UI lives under `/practice`; `/history` is the active
backend-backed session history experience. Some older `/sessions` and
`components/interview`/`components/report` files remain as unused earlier
iterations and should not be used for new work.

## Tech stack

| Layer | Tool |
|---|---|
| Web | Next.js 14 App Router, TypeScript, React 18, Tailwind CSS + shadcn/ui |
| API | FastAPI (Python) |
| LLM | Gemini via Vertex AI — question planning, live interviewing, scoring, resume/job-posting parsing |
| Auth | Firebase Auth / Google Identity Platform (email + password, custom OTP sign-up flow) |
| Database | Cloud SQL (Postgres) |
| File storage | Supabase Storage (resume PDFs) |
| Hosting | Google Cloud Run (both apps), deployed via GitHub Actions on push to `main` |

The frontend currently uses Node 20 in CI and the API image/CI use Python 3.11.
The database and auth migration from Supabase to Cloud SQL and Firebase is
implemented in the codebase but still has staging rollout prerequisites; see
`yns-platform/docs/migration.md` before assuming the migration is live.

## Repo layout

```
.github/workflows/       CI + Cloud Run deploy pipelines (true repo root — not under yns-platform/)
yns-platform/
  yns-web/                Next.js frontend
  yns-api/                FastAPI backend + the Gemini-powered interview assistants
  docs/
    claude.md             Full architecture reference — read this first if you're working in the code
    DEPLOYMENT.md          CI/CD pipeline, environments, deployment gotchas
    migration.md           History of the Supabase → Cloud SQL + Identity Platform migration
    champion-dashboard.md  Champion Dashboard design + data model
    cloudsql-schema.sql    The real, current Postgres schema
```

`docs/claude.md` is the canonical, continuously-updated architecture doc —
data model, every API endpoint, auth flow, critical patterns, and open items.
Start there.

## Running it locally

**API** (`yns-platform/yns-api/`):
```
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

**Web** (`yns-platform/yns-web/`):
```
npm install
npm run dev
```

Both need environment variables (Firebase config, `DATABASE_URL`, Gemini/GCP
project settings, Supabase Storage credentials). The API template is at
`yns-platform/yns-api/.env.example`; configure the frontend values in its
local environment as documented by the Next.js app configuration.

**Tests:**
```
# yns-api/
pytest tests/unit -v          # mocked Gemini, fast
pytest tests/integration -v   # real Gemini calls, needs gcloud ADC

# yns-web/
npm run build                 # must pass before merging
npm run lint                  # currently available; add it to CI with the frontend tests
```

## Improvement roadmap

The strongest next improvements are below, ordered by user impact and risk.

### 1. Make practice sessions recoverable

- Replace the current hardcoded-question fallback with a clear retry state, or
  persist a local/partial session that can still finish and produce feedback if
  session creation temporarily fails.
- Preserve typed answers and recording/transcription state across network
  failures, with explicit retry, cancel, and resume behavior.
- Support idempotent turn submission so refreshes and retries cannot duplicate
  or overwrite answers.

### 2. Make progress persistent and useful

- Move dashboard stats, streaks, goals, and focus areas from browser-derived
  state into the authenticated API model so they sync across devices.
- Add server-side pagination and aggregate queries for session history before
  the dataset grows; the current per-session turn loading will not scale well.
- Let students compare progress over time and turn feedback into a small,
  prioritized practice plan rather than only a report at the end of a session.

### 3. Harden the API and uploads

- Validate session turn indexes, ordering, session status, and allowed status
  transitions with typed request models and useful 4xx responses.
- Add streaming size limits and file-signature checks for resume uploads instead
  of relying primarily on the client-provided MIME type.
- Add IP/device-aware OTP rate limiting, cleanup/retention for expired codes,
  generic provider errors, and operational metrics.
- Make report generation idempotent so retries return an existing report instead
  of repeatedly spending on Gemini calls.

### 4. Improve navigation and accessibility

- Route-gate `/practice`, `/history`, `/profile`, and `/settings` consistently;
  API authorization remains the security boundary, while the frontend should
  avoid flashing public versions of authenticated workflows.
- Audit keyboard navigation, focus management, loading/error/empty states,
  mobile layouts, contrast, and screen-reader labels across onboarding,
  interview, feedback, and Champion flows.
- Make the interview state visible at every moment: current question, elapsed
  progress, recording/transcription status, save state, and what happens next.

### 5. Build a dependable quality and release loop

- Run frontend lint and the existing frontend test in CI; add tests for
  onboarding failures, session retries/abandonment, feedback loading, route
  protection, and API authorization boundaries.
- Add API contract tests for session state transitions, duplicate requests,
  upload limits, OTP abuse controls, and report idempotency.
- Reconcile the documented target versions with `package.json`, Dockerfiles,
  CI, and lockfiles before upgrading; avoid a partial Next/React or Python
  runtime migration.
- Add deployment preflight checks for required environment variables, sender
  domain configuration, database migrations, and least-privilege runtime
  identities.

## Product principles

- **Substance over performance:** never score accent, filler words, eye contact,
  or delivery style.
- **Specific over generic:** feedback should quote the student's answer and
  offer a concrete rewrite or next action.
- **Recoverable by default:** a network or AI error should not erase work or
  strand a student in a session.
- **Private by default:** resumes and student records require authenticated,
  ownership-checked access; Champion access is enforced by the API.
- **Useful before impressive:** every new feature should help a student prepare
  for a real opportunity or help a mentor support that preparation.

## Known project status

- The primary student, interview, history, and Champion flows are implemented,
  but production readiness still depends on the migration and deployment
  prerequisites documented in `yns-platform/docs/migration.md` and
  `yns-platform/docs/DEPLOYMENT.md`.
- Dashboard progress is not yet fully cross-device because some statistics are
  derived from browser-local feedback data.
- Frontend automated coverage is currently narrow compared with the backend;
  the roadmap above should be treated as engineering work, not completed
  functionality.

## Deployment

Both apps deploy to Cloud Run automatically on push to `main`, via keyless
Workload Identity Federation (no service-account keys in CI). Full pipeline
detail, environment variables, and common failure modes are in
`yns-platform/docs/DEPLOYMENT.md`.
