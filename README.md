# Your Next Steps (YNS) — Interview Platform

Four workflows, all built with a real backend (no mock data):

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
  per-student detail drawer.

## Tech stack

| Layer | Tool |
|---|---|
| Web | Next.js (App Router), TypeScript, React, Tailwind + shadcn/ui |
| API | FastAPI (Python) |
| LLM | Gemini (Vertex AI) — question planning, live interviewing, scoring, resume/job-posting parsing |
| Auth | Firebase Auth / Google Identity Platform (email + password, custom OTP sign-up flow) |
| Database | Cloud SQL (Postgres) |
| File storage | Supabase Storage (resume PDFs) |
| Hosting | Google Cloud Run (both apps), deployed via GitHub Actions on push to `main` |

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
project settings, Supabase Storage credentials) — see each app's `.env.example`.

**Tests:**
```
# yns-api/
pytest tests/unit -v          # mocked Gemini, fast
pytest tests/integration -v   # real Gemini calls, needs gcloud ADC

# yns-web/
npm run build                 # must pass before merging
```

## Deployment

Both apps deploy to Cloud Run automatically on push to `main`, via keyless
Workload Identity Federation (no service-account keys in CI). Full pipeline
detail, environment variables, and common failure modes are in
`yns-platform/docs/DEPLOYMENT.md`.
