# CLAUDE.md

Context for the **YNS Interview Platform**. Read this before making changes.

---

## Project overview

**Your Next Steps (YNS)** is a nonprofit career mentorship org (founded by Dr.
Klyne Smith, UTD professor). The platform helps students practice interviews
using AI assistants tailored to their resume, career stage, and goals.

Four workflows: **onboarding** (built), **interview assistants** (built,
wired into the frontend), **session history** (built, real backend),
**Champions portal** (mentor/admin dashboard — built, real backend, gated by an
email allowlist).

Staging is deployed on Google Cloud (Cloud Run for both apps) — see
`docs/DEPLOYMENT.md` for the pipeline, current URLs, and gotchas. The
database/auth migration off Supabase onto Cloud SQL + Google Identity
Platform is **in progress** — Phases 0-3 are written (backup, Cloud SQL
provisioned + loaded, Identity Platform users imported with preserved UIDs,
and all auth code — both apps — now targets Firebase/Cloud SQL instead of
Supabase). **Not yet actually live**, though: a few manual steps (DB
migration, GitHub Environment vars, Resend sender domain) are still
outstanding — see `docs/migration.md`'s Phase 3 section before assuming
staging is running the new stack. Read `docs/migration.md` before touching
anything auth- or database-connection-related.

**What makes YNS different:** not a recording booth like Big Interview or
Quinncia — no filler-word/eye-contact/delivery scoring. YNS methodology
centers on one question: *"What problem do you want to solve?"* Every prompt
scores substance (specificity, self-awareness, passion alignment), never
speaking style. Feedback is written in a warm, direct mentor voice with real
quotes — never generic ("good communication skills" fails the bar).

---

## Tech stack (locked — do not change without asking)

| Layer | Tool |
|---|---|
| Web framework | Next.js 16 App Router, TypeScript, React 19 |
| Styling | Tailwind v4 + shadcn/ui (`components/ui/`) |
| Auth | Firebase Auth / Google Identity Platform (email + password), via the Firebase JS SDK (`yns-web/lib/firebase/client.ts`) and `firebase-admin` (`yns-api`). Staging only — see migration status above. |
| AI service | FastAPI (Python 3.12) |
| LLM | Gemini Flash-Lite via Vertex AI (`gemini-2.5-flash-lite`, confirm current GA ID before assuming this is still current) |
| Database | Cloud SQL Postgres 15 (`yns-interview-postgres`, staging), no RLS — `require_*` dependency checks in `app/dependencies.py` are the sole authorization layer. Every table, including `interview_sessions`/`interview_turns`/`session_reports`, lives here now. |
| Storage | Supabase Storage, bucket `resumes` — the only thing still on Supabase; deliberately not part of the Cloud SQL/Identity Platform migration |
| Hosting | Cloud Run, both apps (staging: `yns-interview-staging`; prod: `yns-interview-platform`) |

**Rules:** `google-genai` SDK only lives in `yns-api/` — never import it in
`yns-web/`. `yns-web` has no direct database access at all anymore (writes
that used to go through Next.js server actions straight to Supabase now call
authenticated `yns-api` endpoints with a Firebase bearer token, same pattern
as the AI routes). Anything involving Gemini goes through a FastAPI endpoint.

Repo layout: `yns-web/` (Next.js), `yns-api/` (FastAPI), both containerized
and deployed to Cloud Run via `.github/workflows/deploy.yml` at the **true
repo root** (`NextStepsInterviewPlatform/.github/workflows/`, not under
`yns-platform/` — see `docs/DEPLOYMENT.md`). `docs/` (schema.sql,
rls-policies.sql, champion-dashboard.md, DEPLOYMENT.md). Independent apps,
HTTP only, no shared tooling.

---

## Data model (Cloud SQL Postgres, no RLS — staging)

```
app_users            user_type (high_school|college_student|recent_graduate CHECK),
                      onboarding_completed, created via POST /api/onboarding/submit
career_profiles      shared by BOTH career and high-school flows:
                      major/target_field/target_level/skills (career)
                      grade_level/intended_major/colleges_preparing_for/
                        interview_type (high school)
                      target_level CHECK: internship|entry_level|junior|mid_level|senior
job_postings         optional, one row per user, filled if prepping for a specific job
resumes              file metadata + storage_path; extracted_text populated by
                      /api/resume/parse (Gemini-based parsing, not a local PDF lib)
onboarding_status     tracks wizard completion
signup_otp_codes     sign-up email-verification codes (hashed, 10 min TTL) — not
                      part of the original Supabase schema, added in Phase 3
interview_sessions   user_id, session_type, status, session_plan (jsonb SessionPlan),
                      started_at, completed_at
interview_turns      session_id, turn_index, question (jsonb), answer_text,
                      evaluation (jsonb), unique(session_id, turn_index)
session_reports      session_id (PK), overall, category_breakdown, strengths,
                      growth_areas, recommended_next_steps (jsonb), generated_at
```

No RLS on Cloud SQL (it's a Supabase-only feature, `auth.uid()` doesn't
exist here) — `docs/cloudsql-schema.sql` is the real schema, `docs/schema.sql`
is stale. Authorization for every table above is enforced entirely by
`app/dependencies.py`'s `require_*`/ownership checks — there is nothing
underneath to catch a miss, so any new endpoint needs one of those
dependencies explicitly (see migration.md's Phase 3 authz audit for how this
was verified across every existing endpoint).

**Every table is on Cloud SQL** — `app_users`/`career_profiles`/`job_postings`/
`resumes`/`onboarding_status` (SQLAlchemy/`DATABASE_URL`,
`app/services/profile_store.py` for the AI-routers' access to these tables)
plus `interview_sessions`/`interview_turns`/`session_reports`
(`app/services/session_store.py`, same pattern). `yns-web`'s writes go
through `yns-api` endpoints (`POST /api/onboarding/submit`,
`POST /api/resumes`, `POST /api/job-postings` — no direct Postgres access
from the frontend at all). Resume *file bytes* still live in Supabase
Storage (not part of this migration) — `app/services/supabase_client.py` is
now Storage-only.

---

## Onboarding

**Frontend:** `components/onboarding/OnboardingForm.tsx` — a react-hook-form +
zod wizard, 5 steps for college/recent-grad, 4 for high school (name/type →
career or school details → skills/activities + optional resume upload →
optional job posting/prompt → review + submit). Validation in
`lib/validations/onboarding.ts`, types in `types/onboarding.ts` (there is no
`types/api.ts` — other services define types inline).

Submit path (Phase 3, was direct-to-Supabase writes): form packs a JSON
payload (resume file stripped) + the raw `File` into `FormData`, calls
`submitOnboarding(formData)` in `app/actions/student.ts` — no longer a
Next.js Server Action, a plain client function (since `yns-web` has no
server-side Firebase session to act as) that attaches a Firebase bearer
token and calls `POST /api/onboarding/submit`. That endpoint
(`app/routers/onboarding.py`) upserts `app_users` → upserts
`career_profiles` → optionally upserts `job_postings` → if a resume was
given, uploads to Supabase Storage (`resumes/{user_id}/{timestamp}-{filename}`),
inserts a `resumes` row, then does a **best-effort** (failure-swallowed)
in-process resume parse → upserts `onboarding_status` → sets
`app_users.onboarding_completed = true`. All in one Cloud SQL transaction,
rolled back on any failure.

`lib/services/resumes.ts` (`uploadResume`) calls the equivalent
`POST /api/resumes` for `components/dashboard/NextStep.tsx` (post-onboarding
resume re-upload widget) — same upload+insert+parse logic, shared
server-side via `app/services/resume_upload.py`.

**Backend resume parsing:** `app/api/resume/router.py` → `POST
/api/resume/parse` (auth required). Downloads the PDF from Storage via
service role, then `resume_parser.py` sends the raw bytes to Gemini directly
as a `Part.from_bytes(mime_type="application/pdf")` content part with
`response_schema=ResumeFacts` — Gemini does extraction *and* structuring
in one call, no local PDF library involved. Writes `raw_text`/`experiences`/
`skills`/`education` back to `resumes.extracted_text` (via
`app/services/profile_store.py`, Cloud SQL — not `supabase_client.py` since
Phase 3).

**Backend onboarding reads:** `app/routers/*.py`, all mounted under `/api`,
plain SQLAlchemy. All now require a Firebase bearer token
(`app/dependencies.py`): unscoped list endpoints require
`require_admin_user`, single-user endpoints require `get_current_student` +
`require_user_ownership(user_id, current_user_id)`:
- `users.py` — `GET /api/users`, `GET /api/users/{id}` (includes
  `onboarding_completed` since Phase 3 — it existed in the DB but wasn't
  mapped/exposed before)
- `onboarding.py` — `POST /api/onboarding/submit` (Phase 3, see above)
- `career_profiles.py` — `GET /api/career-profiles(/user/{id})`
- `high_school_profiles.py` — same table, filtered `grade_level IS NOT NULL`
- `job_postings.py` — `GET /api/job-postings/user/{id}`, `POST /api/job-postings`
  (upsert for the current user, Phase 3)
- `resumes.py` — `GET /api/resumes/user/{id}`, `POST /api/resumes` (upload,
  Phase 3)
- `user_skills.py` — `GET /api/user-skills/user/{id}`
- `onboarding_summary.py` — `GET /api/onboarding-summary/{user_id}`,
  aggregates everything into one payload with a generated
  `ai_context.candidate_summary` string + `has_resume`/`has_job_posting`/
  `has_skills` flags. Backs `ProfileSummaryCard` via
  `lib/services/profile-summary.ts`.

---

## Interview assistants (`yns-api/app/core/assistants/`)

Each is a typed Python function returning a validated Pydantic model, sharing
data through Cloud SQL (not direct calls between each other).

1. **`planner.py` — question planner.** Input: `StudentProfile` + resume
   facts, `session_type` (behavioral|technical|mixed). Output: `SessionPlan`
   (list of `PlannedQuestion`: category, difficulty, text, intent,
   rubric_focus). Rules: 1 warmup + 1 stretch + 2-3 YNS values questions
   ("What problem do you want to solve?"), never "tell me about yourself,"
   reference real resume items.
   - `StudentProfile` assembly: `career_stage` ← `app_users.user_type`;
     `target_role` ← `career_profiles.target_job_title`/`target_field`;
     `interests`/`goals` ← `career_profiles.skills`/`major`/`target_level`
     (or high-school equivalents); `resume_facts` ← `resumes.extracted_text`.

2. **`interviewer.py` — conversational interviewer.** Input: current
   question, answer, last 3 turns. Output: `InterviewerResponse`
   (`action`: ACKNOWLEDGE_AND_ADVANCE|PROBE|REDIRECT, `response_text`).
   Trusted-mentor tone, never grades out loud or says "great answer!". Uses
   the same `response_schema`-enforced structured output as the other three
   assistants (pre-Gemini-migration this was the one plain-JSON/fence-
   stripped exception — no longer needed since Gemini structured output
   doesn't require a tool-use workaround).

3. **`evaluator.py` — scores one answer.** Runs concurrently with the
   interviewer via `asyncio.gather()`. Output: `TurnEvaluation` (scored
   rubric dimensions 1-5 w/ rationale + quote, overall, 1-2 notable
   strengths/gaps). **Never scores delivery/filler words/accent — substance
   only.**

4. **`reporter.py` — full session report,** once at completion. Output:
   `SessionReport` (overall, category_breakdown, 2-3 strengths, 2-3 growth
   areas w/ quotes, 3 concrete next steps). 2nd-person, warm-but-direct,
   never sycophantic, never vague ("good communication" fails the bar).

**Not one of the four, but also lives here and also calls Gemini:**
`job_posting_parser.py` — parses a stored job posting's raw text into
`JobPostingFacts` (required/preferred skills, responsibilities, seniority
signals). Not called at session-plan build time directly; lazily invoked
and cached from `sessions/router.py::_load_profile` the first time a
session is created for a profile that has an unparsed job posting, then the
parsed facts are persisted so it never re-parses.

**Shared plumbing:** all Gemini calls go through `call_gemini()` in
`app/services/gemini_client.py` — never call
`client.models.generate_content()` elsewhere. Structured output passes the
assistant's Pydantic `response_model` directly as `response_schema`
(`response_mime_type="application/json"`) — no hand-written JSON-schema
tool definitions, unlike the old Anthropic tool-use approach. One retry on
validation failure (error appended to `contents`, re-raises on second
failure → clean 502/500 from the global error handler). No manual prompt-
caching code — Vertex AI's implicit caching (on by default, ~90% discount
on repeated-prefix tokens above ~2048 tokens) covers what the old
`cache_control: ephemeral` breakpoint did, with no code required;
`usage_metadata.cached_content_token_count` is logged for visibility.

---

## API endpoints (FastAPI, all mounted under `/api` per `app/main.py`)

```
GET    /api/health
POST   /api/sessions                  → create session + plan
POST   /api/sessions/{id}/turns       → submit answer → interviewer + evaluator (concurrent)
PATCH  /api/sessions/{id}             → update status (end early)
POST   /api/resume/parse              → parse uploaded PDF into ResumeFacts
POST   /api/reports/{session_id}      → generate full report from all turns

GET    /api/sessions/                 → list current user's completed sessions (history)
GET    /api/sessions/{id}             → session detail incl. turns (history)

GET    /api/users, /api/users/{id}
POST   /api/onboarding/submit         → full onboarding write (Phase 3, was direct-to-Supabase)
GET    /api/career-profiles(/user/{id})
GET    /api/job-postings/user/{id}
POST   /api/job-postings              → upsert current user's job posting (Phase 3)
GET    /api/resumes/user/{id}
POST   /api/resumes                   → resume re-upload widget (Phase 3)
GET    /api/user-skills/user/{id}
GET    /api/onboarding-summary/{user_id}

# Sign-up email verification (Phase 3 — Firebase has no built-in code flow)
POST   /api/auth/otp/start            → email a 6-digit code
POST   /api/auth/otp/verify           → verify code, create the Firebase user, return a custom token
GET    /api/auth/champion-access      → {"authorized": bool} for the caller's own token

# Champion portal — real backend, allowlist-gated (see docs/champion-dashboard.md)
GET    /api/champion/me
GET    /api/champion/students?search=&status=&range=&sortBy=&sortOrder=&page=&pageSize=
GET    /api/champion/students/{studentId}?range=
```

Auth (Phase 3): all authenticated routes require
`Authorization: Bearer <Firebase ID token>`, verified by `get_current_claims()`
(`app/middleware/auth.py`) via the Firebase Admin SDK's `verify_id_token(...,
check_revoked=True)` — `check_revoked=True` is deliberate, not the default,
so a disabled/revoked account is rejected immediately instead of up to an
hour later. Returns the token's `sub`/`uid` claim as `user_id`
(`app_users.id`, preserved from Supabase at import time). `/api/champion/*`
requires the same bearer token plus an email on the allowlist in
`app/admin_emails.py`, compared case- and whitespace-insensitively by
`is_admin_email()` and enforced by `require_champion_user` in
`app/dependencies.py`, independent of the frontend guard below. The email is
read out of the verified token (`claims_email()`), never from the request, and
custom claims no longer grant champion access at all — editing that file is the
only way in, so nobody can sign themselves up as a champion.

**Frontend route protection (`yns-web/middleware.ts`):**
`PROTECTED_PREFIXES = ["/onboarding", "/dashboard", "/sessions", "/champion"]`
are gated (redirect to `/sign-in` if not signed in); `/champion` additionally
redirects to `/dashboard` when the `yns-role` cookie says `student`. That cookie
now records only what the API answered about the signed-in user
(`/api/auth/champion-access`), so it can rule champion access *out* but never
in — when it is absent, `components/champion/ChampionAccessGuard.tsx` asks the
API before the dashboard shell renders. What middleware itself sees is still
**unverified, a redirect hint only**, not a security boundary (real
server-side Firebase session verification needs `firebase-admin`, which
doesn't run on the Edge runtime `middleware.ts` uses). This was already true
before Phase 3 too (the comment predates the migration) — the API enforces
the same rule independently either way. `/history`, `/profile`, and
`/settings` are **still not** in that list — reachable by anyone with the
URL, logged in or not, though `/history`'s data calls still require a valid
bearer token server-side (so they 401 without a session). `/login` and
`/signup` redirect to `/sign-in` and `/sign-up` respectively (route naming
migrated).

---

## Interview + dashboard frontend

**Live path (this is the real UI):** `/practice` (mode picker) →
`/practice/session?mode=X` (`components/practice/PracticeSession.tsx`) →
on completion redirects to `/practice/session/{sessionId}/feedback`
(`components/practice/InterviewFeedbackPage.tsx`). Linked from the
dashboard via `components/dashboard/PracticeCards.tsx`.

Turn-by-turn, `PracticeSession` calls `submitAssistantTurn` (real AI
evaluation). On completion it builds a `localStorage`-backed
`InterviewFeedbackSession` (`lib/services/interview-feedback.ts`, keys
`yns.interviewFeedback.*` — falls back to a local heuristic scorer only if
no AI feedback attached). `InterviewFeedbackPage` loads that record and, if
it has an `assistantSessionId`, calls `generateAssistantReport(id)` → `POST
/api/reports/{id}` for the real `SessionReport`, rendered via
`AssistantReportCard`/`FeedbackSummaryCard`/`FeedbackQuestionCard`.

**Dashboard** (`app/dashboard/page.tsx`): `Sidebar`, `WelcomeSection`,
`StatsSection` + `PracticeProgressGraph` (both computed client-side from the
`localStorage` feedback index — **no cross-device sync**, a real gap),
`ProfileSummaryCard` (`getProfileSummary()` → `/api/onboarding-summary/{id}`),
`NextStep` (resume upload widget).

**Two API-calling conventions in active use, both authenticated:**
- `lib/utils/api-client.ts` — `apiFetch`, attaches `Authorization: Bearer
  <token>` via `getFirebaseIdToken()` (`lib/firebase/client.ts`). Used for
  onboarding-read/write and Champion endpoints.
- `lib/services/interview-assistant.ts` — `assistantFetch`, same
  `getFirebaseIdToken()` source, sends `Authorization: Bearer`. Used for
  `createAssistantSession`/`submitAssistantTurn`/`generateAssistantReport`.

**Dead/orphaned — do not build on these, they are unused:**
`app/sessions/[id]/page.tsx` and `app/sessions/[id]/report/page.tsx` (both
`return null`), all of `components/interview/*.tsx` (session-shell,
answer-input, question-card, turn-history, session-status-bar,
session-config-dialog), all of `components/report/*.tsx` (report-shell,
overall-score-card, category-breakdown, strengths/growth-areas/next-steps,
turn-review-accordion), and `app/actions/session.ts` (empty file). These are
an earlier design iteration superseded by the `/practice` flow above.

---

## Session history

`app/history/page.tsx` — list of the current user's last 5 completed
sessions (title, formatted date, answered/question count, average-rating
badge), each linking to `app/history/[sessionId]/page.tsx` →
`components/history/HistorySessionDetail.tsx` (session header + one
`HistoryQuestionCard` per turn + an `AssistantReportCard` generated via
`generateAssistantReport`).

Unlike the dashboard stats, this is **real backend data, not localStorage**:
`getSessionHistory()`/`getSessionDetail(id)` in
`lib/services/interview-assistant.ts` call `GET /api/sessions/` and `GET
/api/sessions/{id}` with a Firebase bearer token.
`yns-api/app/api/sessions/router.py` (`list_sessions`, `get_session_detail`)
reads via SQLAlchemy/Cloud SQL (`get_sessions_for_user`,
`get_turns_for_session` in `app/services/session_store.py`), with an
ownership check (`_get_owned_session`) so one user can't fetch another's
session by id.

`app/sessions/[id]/page.tsx` and `app/sessions/[id]/report/page.tsx` are
still the dead stubs (`return null`) from the earlier design iteration —
session history lives at `/history`, not `/sessions/[id]`.

---

## Champion Dashboard (mentor/admin)

Full detail lives in **`docs/champion-dashboard.md`** — read that before
touching anything under `app/champion/`, `app/api/champion/`, or
`lib/champion/`. Summary:

One real page, `/champion/dashboard` — every authorized champion sees the
same organization-wide student roster (search, activity filter, date range,
sort, pagination), with a read-only details drawer per student. Champions
are **not** assigned individual students; there's no per-mentor scoping.
`app/champion/page.tsx` and `app/champion/students/page.tsx` are thin
redirects into `/champion/dashboard`, kept only so old links/sidebar entries
resolve.

**Real backend, real auth, no mock data on either side.** All numbers are
aggregated in Postgres via `app/api/champion/service.py` (SQLAlchemy over
`DATABASE_URL`, no RLS on Cloud SQL at all — this endpoint needs a
cross-student aggregate, so `require_champion_user` is the only thing
gating it, by design). Gated in three places, only the last of which is a
security boundary: `yns-web/middleware.ts` (unverified redirect hint, see
Frontend route protection above), `components/champion/ChampionAccessGuard.tsx`
(asks `/api/auth/champion-access` before rendering the shell, and sends
non-champions to `/dashboard`), and `require_champion_user` in
`yns-api/app/dependencies.py` (401/403 on every `/api/champion/*` route — the
backend does not trust either frontend gate).

Champion access is an **email allowlist**, `ADMIN_EMAILS` in
`yns-api/app/admin_emails.py` — not a database column, not a token claim. Add
an address there and redeploy the API to grant it; delete the line to revoke it
(checked per request, so it takes effect immediately, unlike the custom claims
this replaced). Comparison is case- and whitespace-insensitive.

Being on the list **adds** the champion experience rather than replacing the
student one: the same account can use either dashboard, and which one it enters
is whatever the user picked on the login page (see Auth below). Nothing about
the choice is persisted.

Known schema gaps (documented, not bugs — see champion-dashboard.md for the
fixes): `school` and `phone` aren't stored anywhere so the drawer shows
"Not provided"; practice time is derived from session wall-clock span, not
a stored duration.

---

## Auth / profile / settings

- Routes: `app/(auth)/sign-in/page.tsx`, `app/(auth)/sign-up/page.tsx`,
  both wrapping `components/auth/AuthFormCard.tsx` inside
  `components/auth/AuthPageFrame.tsx`. `/login` and `/signup` are old paths
  that now just redirect (via `middleware.ts`) to `/sign-in`/`/sign-up`.
- `AuthFormCard.tsx` does **email + password only**
  (`signInWithEmailAndPassword`) — no magic link, no Google SSO. Sign-in offers
  a Student/Champion segmented control (`components/auth/LoginModeSelector.tsx`,
  defaulting to Student) that shares one form: the mode only decides where the
  user lands afterwards, via `getPostLoginRedirect(uid, mode)` in
  `lib/services/auth.ts`. Student keeps the old behaviour (onboarding when
  `onboarding_completed` is false, otherwise `/dashboard`); Champion calls
  `/api/auth/champion-access` and either goes to `/champion/dashboard` or, if
  the API says no, stays put with "This account does not have Champion access."
  plus a *Continue as Student* button — no sign-out, since they are already
  authenticated and may just have picked the wrong mode. Sign-up has no mode
  selector; it always creates a plain student account. Sign-up is
  a custom two-step OTP flow (Phase 3 — Firebase has no built-in "type a
  code" verification): `POST /api/auth/otp/start` emails a 6-digit code via
  Resend, then `POST /api/auth/otp/verify` checks it, creates the Firebase
  user server-side (`email_verified=True`), and returns a custom token the
  client signs in with via `signInWithCustomToken`. `app/auth/callback/route.ts`
  (the old Supabase PKCE callback route) was deleted — it was already dead
  code before Phase 3 (sign-up used `verifyOtp`, not a redirect) and had no
  Firebase equivalent need.
- `app/settings/page.tsx` → `components/settings/SettingsPage.tsx`:
  account info + password update (`updatePassword(user, newPassword)`,
  min 6 chars, confirm-match validation — surfaces a clear message on
  Firebase's `auth/requires-recent-login` rather than building a full
  reauth flow) + other settings rows.
- `app/profile/page.tsx` uses `components/profile/ProfileSummaryCard.tsx`,
  `components/profile/NextStep.tsx` (resume re-upload), and
  `components/profile/ResumeCard.tsx`.

---

## Critical patterns and rules

1. **All Gemini calls go through `call_gemini()`** — see Shared plumbing above.
2. **Pydantic model as `response_schema`** — every assistant passes its
   Pydantic `response_model` straight to `call_gemini()`; there's no
   separate hand-written JSON-schema tool definition to keep in sync
   (that was an Anthropic-tool-use artifact, removed in the Gemini
   migration).
3. **Pydantic validates everything** — every assistant returns a model, not
   a dict; two failed validations → raise → clean error response.
4. **Concurrent interviewer + evaluator** in the turns endpoint via
   `asyncio.gather()` — they don't depend on each other, roughly halves
   per-turn latency.
5. **`yns-web` has no direct database access at all (Phase 3)** — every
   read and write goes through an authenticated `yns-api` endpoint with a
   Firebase bearer token. This replaced the old "server actions straight to
   Supabase" pattern entirely, not just for writes.
6. **`require_*` dependency checks are the *only* authorization layer —
   there is no RLS anywhere in this stack anymore for the tables that
   matter for authz.** Cloud SQL doesn't have RLS as a feature at all — every
   table, including `interview_sessions`/`interview_turns`/`session_reports`,
   is reachable by any query the app code writes. Every endpoint must
   explicitly enforce ownership/role via `app/dependencies.py`'s
   `get_current_student`/`require_admin_user`/`require_champion_user`/
   `require_user_ownership` — there is nothing underneath to catch a miss.
   Verified across every existing endpoint in Phase 3's authz audit (see
   `docs/migration.md`); any *new* endpoint needs the same explicit check.
7. **`resumes` bucket is private** — only a signed URL or the service role
   key can read it; `/api/resume/parse` uses the service role.

---

## Deployment

Full detail in **`docs/DEPLOYMENT.md`** — read it before touching
`.github/workflows/deploy.yml`/`ci.yml`, either Dockerfile, or GCP IAM/Secret
Manager for this project. Key points:

- Both apps are containerized and deploy to **Cloud Run** in
  `yns-interview-staging` on every push to `main`, via keyless Workload
  Identity Federation (no service account keys anywhere).
- The workflow files live at the **true repo root**
  (`NextStepsInterviewPlatform/.github/workflows/`) — a duplicate under
  `yns-platform/.github/workflows/` existed briefly during setup and is
  **not** read by GitHub Actions; it has been deleted. If it ever reappears,
  delete it again.
- Sensitive config (`DATABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`) comes from
  GCP Secret Manager via `--set-secrets`; everything else comes from GitHub
  Environment variables on the `staging` environment.
- CORS on `yns-api` is driven by the `FRONTEND_URL` env var — if it doesn't
  exactly match the deployed web origin, every browser call to the API fails
  as an opaque "failed to fetch" with no server-side error. See
  DEPLOYMENT.md's gotchas section before chasing that as a code bug.

---

## Development commands

```
# yns-web/
npm run dev          # localhost:3000
npm run build        # must pass before commits
npm run lint

# yns-api/
source .venv/bin/activate
uvicorn app.main:app --reload --port 8000
pytest tests/unit -v               # mocked Gemini, fast
pytest tests/integration -v        # real Gemini Flash-Lite API, requires
                                    # `gcloud auth application-default login`
```

---

## Open items / next work

- **Database/auth migration off Supabase → Cloud SQL + Google Identity
  Platform** — Phases 0-3 are written as of 2026-08-06 (see
  `docs/migration.md` for full detail), but **Phase 3 isn't actually live
  yet** — the branch hasn't been merged to `main`, and a real sender domain
  in Resend still isn't verified (currently the sandbox address, which only
  delivers to the account owner). Phase 4 (prove it on staging) can't start
  for real until both are done.
- Delete or archive the dead code listed above (`app/sessions/[id]/*`,
  `components/interview/*`, `components/report/*`, empty
  `app/actions/session.ts`). (`lib/services/onboarding.ts` was deleted in
  Phase 3.)
- Dashboard stats are `localStorage`-only — no server-side practice history,
  so nothing syncs across devices/browsers.
- `middleware.ts` protects `/onboarding`, `/dashboard`, `/sessions`,
  `/champion` — `/history`, `/profile`, `/settings` still aren't in
  `PROTECTED_PREFIXES` and are reachable without a session at the route
  level (though `/history`'s API calls still require a valid token).
- Auth is email/password only right now; no Google SSO. (Magic-link/OAuth
  callback support was removed in Phase 3 along with the rest of
  `@supabase/ssr` — Firebase's redirect-based OAuth flow would need its own
  design if this comes back, not a revival of the old callback route.)
- Production (`yns-interview-platform`) deploy path exists in
  `deploy.yml` (manual `workflow_dispatch` + required reviewer) but hasn't
  been exercised — staging is the only environment actually proven end to
  end so far, and even staging hasn't proven Phase 3 live yet (see above).
- `google-genai` has never actually been pinned in `yns-api/requirements.txt`
  — pip silently resolves it to an older version (`2.8.0`) on every install
  to satisfy the `pydantic==2.11.7` pin (found during Phase 3, unrelated to
  auth — left alone rather than changing Gemini-layer behavior mid-migration).

---

## Things to never do

- Never put the `google-genai` SDK in `yns-web/`.
- Never add a new endpoint without an explicit `require_*`/ownership check
  from `app/dependencies.py` — there is no RLS backstop anywhere in this
  stack to catch a miss (see Critical patterns #6).
- Never store service-role/API keys (`SUPABASE_SERVICE_ROLE_KEY`,
  `RESEND_API_KEY`) in `NEXT_PUBLIC_*` env vars. (Gemini and Firebase client
  auth have no secret key to leak — Gemini is ADC-based, Firebase's client
  `apiKey` is not a secret by design.)
- Never deduct points for filler words, accent, or speaking style in the evaluator.
- Never write generic feedback in the reporter — reference a real quote or rewrite it.
- Never commit `.env`/`.env.local` files.
