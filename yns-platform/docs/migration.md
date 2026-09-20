# Supabase → Cloud SQL + Identity Platform — Migration Runbook

This is the plan for moving the **database** to Cloud SQL and **auth** to Google
Identity Platform (Firebase Auth). Do the entire thing on **staging first** with
test data, prove it works, then do production as a controlled cutover.

**Do not delete, disable, pause, or freeze the Supabase project.** Supabase
Storage remains a live dependency because resume file bytes are stored in the
`resumes` bucket. Supabase also remains part of the rollback plan until resume
storage is migrated to Google Cloud Storage and production is verified.

## The one thing that must not go wrong: preserve user IDs

Every row in the database points at a user by their Supabase Auth UID
(`app_users.id`, and every `user_id` foreign key). Identity Platform will assign
**brand-new** UIDs unless you explicitly import each user with their existing UID.
If the UIDs change, every student's data silently detaches from their account.

The whole migration succeeds or fails on this. It's doable because auth is
email/password with bcrypt hashes, which Identity Platform can import with the
UID preserved — but only if you do it deliberately. Verify it before trusting
anything else.

---

## Phase 0 — Prep

- [x] Full logical backup of the Supabase database (`pg_dump`), stored safely.
- [x] Export of Supabase `auth.users` (id, email, encrypted_password, created_at).
- [x] Confirm the runtime service account will get `roles/cloudsql.client` and
      `roles/secretmanager.secretAccessor` (staging: grant it yourself; production:
      the mentor grants it at cutover).

## Phase 1 — Cloud SQL (staging)

- [x] Create a Cloud SQL **Postgres** instance in the staging project
      (`gcloud sql instances create`), a database, and a user.
- [x] Load the schema (`docs/schema.sql` + the onboarding tables, or your Alembic
      migrations if you've added them).
- [x] `pg_dump` the app tables from Supabase and restore them into Cloud SQL
      (test/subset data is fine for staging). **Do not** copy the `auth.*` schema —
      that's Supabase's; users go to Identity Platform in Phase 2.
- [x] Point the backend at Cloud SQL: connect Cloud Run to the instance
      (`--add-cloudsql-instances`) and set `DATABASE_URL` via the Cloud SQL
      connector. Confirm the API starts and can read a table.

## Phase 2 — Identity Platform (staging) — the critical phase

- [x] Enable Identity Platform in the staging project; enable the
      **Email/Password** provider.
- [x] Build the user-import file from the Supabase `auth.users` export. Each record
      must set:
  - `localId` = **the existing Supabase UID** (this is the preservation step)
  - `email`
  - `passwordHash` = the user's bcrypt hash from Supabase
- [x] Import with `firebase auth:import users.json --hash-algo=BCRYPT`.
      > ⚠️ Confirm the exact `passwordHash` encoding bcrypt expects against the
      > current Firebase `auth:import` docs before running the full set — test with
      > **one** user first.
- [x] **Verify preservation (do not skip):** pick a known test user, sign in with
      their *original* password, read the `uid` from the resulting token, and
      confirm it **exactly equals** that user's `app_users.id` in Cloud SQL. If it
      matches, their data is still theirs. If not, stop and fix the import.
      Re-confirmed 2026-08-15 directly against Firebase Admin SDK + Cloud SQL for
      two accounts — see writeup at the bottom of this doc.

## Phase 3 — Code changes

- [x] **Backend auth** (`app/middleware/auth.py`): replace Supabase JWT
      verification (JWKS / ES256) with Firebase ID token verification (RS256,
      audience = the GCP project). The Firebase Admin SDK's `verify_id_token` is the
      simplest path. Make sure the extracted user id (`sub` / `uid`) is the
      preserved UID that `get_current_student` returns.
- [x] **Frontend auth**: replace the `@supabase/ssr` / `supabase-js` auth (client,
      `middleware.ts`, sign-in / sign-up, `auth/callback`) with the Firebase Auth
      SDK. The shape stays the same: sign in on the client, get the ID token, send
      it as the `Bearer` token to the API.
- [x] **Authorization has no database backstop anymore.** RLS was a Supabase
      feature (`auth.uid()`); it does not exist on plain Cloud SQL. The `require_*`
      / ownership checks you built are now the *only* protection. Audit **every**
      endpoint to confirm it enforces ownership or role — there is nothing
      underneath to catch a miss.
- [x] **Config/secrets**: Cloud SQL connection info and Firebase config live in
      Secret Manager; retain the server-side `SUPABASE_*` settings required for resume Storage; remove
      unused Supabase auth settings and `ANTHROPIC_*` leftovers. (While
      you're here, drop the dead `anthropic` line from `requirements.txt`.)
      `requirements.txt` was already clean; the last leftover (a dummy
      `ANTHROPIC_API_KEY` in `yns-api/tests/conftest.py`) was removed 2026-08-15.

## Phase 4 — Prove it on staging (this is the gate)

Run these against the migrated staging app and capture the result of each:

- [x] An **existing** user logs in with their **pre-migration password**.
- [x] That user's token `uid` **equals** their `app_users.id` (data still theirs).
- [x] That user sees **only their own** sessions/profile/resume (authz holds with
      no RLS).
- [x] A **new** sign-up + onboarding works end to end.
- [x] A **champion** logs in and sees only their assigned students.
- [x] **Rollback rehearsed**: flipping the config back to Supabase brings the old
      setup back (proves cutover is reversible).

All six verified 2026-08-15 against deployed staging — see writeup below.

## Phase 5 — Production cutover (mentor approval required)

Do **not** start this until the mentor has reviewed the staging results and
approved. Then:

- [ ] Repeat the data load (Phase 1) and user import (Phase 2) against the
      **production** Cloud SQL instance and Identity Platform — same
      UID-preservation, verified the same way.
- [ ] Cutover = switch production config to point at Cloud SQL + Identity Platform.
      Keep Supabase **live and intact** for resume-file storage and rollback.
- [ ] Rollback plan: if anything is wrong, switch the config back to Supabase. Do
      **not** delete Supabase until resume files have been migrated to Google Cloud
      Storage, the application uses GCS, and production migration is verified.

---

## What to send the mentor for sign-off

A short writeup, not a meeting:

1. Confirmation of each Phase 4 checkbox (a line each, with proof — a screenshot
   or the actual `uid` == `app_users.id` comparison).
2. The exact cutover steps you'll run in production (so the approval is of a known
   plan).
3. The rollback procedure.

Approval is a yes/no on that writeup plus the production cutover — the mentor owns
the go/no-go on putting real student data on the new stack.

---

## Staging verification writeup (2026-08-15)

**1. Existing user login (pre-migration password)** — ✅ Verified manually.

**2. UID preservation** — ✅ Verified directly against Firebase Admin SDK and
Cloud SQL for two accounts:

| Email | Firebase UID | Cloud SQL `app_users.id` | Match |
|---|---|---|---|
| `kaushik13.shivakumar@gmail.com` | `88e92204-aefb-414d-9e96-98064aed3fbd` | `88e92204-aefb-414d-9e96-98064aed3fbd` | ✅ |
| `lebron@gmail.com` | `239480b0-bb7a-4beb-85d5-ed5d50a3c1b3` | `239480b0-bb7a-4beb-85d5-ed5d50a3c1b3` | ✅ |

Exact match on both — no student data detached from its owner.

**3. Authorization holds (no RLS backstop)** — ✅ Verified an existing user sees
only their own sessions/profile/resume.

**4. New sign-up + onboarding end to end** — ✅ Verified on deployed staging.
This surfaced a real bug during verification: new sign-ups couldn't create any
interview session because `interview_sessions` still referenced Supabase's
frozen pre-migration `app_users` table via a foreign key. Fixed by moving
`interview_sessions`/`interview_turns`/`session_reports` onto Cloud SQL
(`app/services/session_store.py`) and re-verified.

**5. Champion login scoping** — ✅ Verified a champion account sees the correct
student roster.

**6. Rollback rehearsed** — ✅ Flipping config back to Supabase brings the old
setup back cleanly.

**Cutover steps for production:**
1. Repeat the data load (Phase 1) and user import (Phase 2) against the
   production Cloud SQL instance and Identity Platform, with the same
   UID-preservation check run and confirmed before proceeding.
2. Switch production config to point at Cloud SQL + Identity Platform.
3. Keep the Supabase project frozen and untouched as rollback.

**Rollback plan:** if anything's wrong post-cutover, switch config back to
Supabase. Supabase project stays intact and won't be deleted until production
has run clean on the new stack for at least a couple of weeks.
