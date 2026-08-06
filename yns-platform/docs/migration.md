# Supabase → Cloud SQL + Identity Platform — Migration Runbook

This is the plan for moving the database to Cloud SQL and auth to Google
Identity Platform (Firebase Auth). Do the entire thing on staging first with
test data, prove it works, then do production as a controlled cutover.

**Do not touch the Supabase project during any of this.** It stays live and
untouched as the rollback path until production is migrated and verified.
Nothing here deletes Supabase.

Related context: `docs/claude.md` (current architecture — auth, data model,
Champion Dashboard) and `docs/DEPLOYMENT.md` (the staging Cloud Run pipeline
this migration builds on top of). Read both before starting Phase 1 — this
migration changes the auth model the rest of the app is built on
(`app/dependencies.py`'s `require_*` checks, RLS reliance called out below).

---

## The one thing that must not go wrong: preserve user IDs

Every row in the database points at a user by their Supabase Auth UID
(`app_users.id`, and every `user_id` foreign key). Identity Platform will
assign brand-new UIDs unless you explicitly import each user with their
existing UID. If the UIDs change, every student's data silently detaches
from their account.

The whole migration succeeds or fails on this. It's doable because auth is
email/password with bcrypt hashes, which Identity Platform can import with
the UID preserved — but only if you do it deliberately. Verify it before
trusting anything else.

---

## Phase 0 — Prep ✅ done (2026-08-06)

- [x] Full logical backup of the Supabase database (`pg_dump`), stored safely.
      Done via the Session Pooler connection (the direct `db.<ref>.supabase.co`
      host is IPv6-only and unreachable from a network without IPv6 egress —
      use `aws-*.pooler.supabase.com:5432` instead, and a **matching major
      version** `pg_dump`/`psql` client: Supabase runs Postgres 17, so a v14
      client fails with a version-mismatch error. `brew install postgresql@17`
      (keg-only, doesn't disturb an existing `postgresql@14`) and invoke it by
      full path: `/usr/local/opt/postgresql@17/bin/pg_dump`.
- [x] Export of Supabase `auth.users` (`id`, `email`, `encrypted_password`, `created_at`).
      15 users exported.
- [x] Confirm the runtime service account will get `roles/cloudsql.client` and
      `roles/secretmanager.secretAccessor` (staging: grant it yourself;
      production: the mentor grants it at cutover).
      `yns-api-runtime@yns-interview-staging.iam.gserviceaccount.com` granted
      `roles/cloudsql.client` at the project level.
- **Backups are in `~/yns-migration-backups-2026-08-06/` on Kaushik's machine
  (NOT in the repo — contains real bcrypt hashes, never commit these):**
  `supabase_full_backup_20260806.sql` (full pg_dump), `auth_users_export_20260806.csv`
  (the 15 users), `live_public_schema_20260806.sql` (raw schema dump incl. RLS/auth FK,
  for reference), `firebase_import_all.json` / `firebase_import_test.json` (the
  base64-encoded-bcrypt Identity Platform import payloads actually used in Phase 2).
  `cloudsql_schema.sql`/`cloudsql_data.sql` there are the same content now committed
  as `docs/cloudsql-schema.sql` (schema) — the data-only dump wasn't committed
  (PII), regenerate from Supabase if ever needed again (see Phase 1 notes).

## Phase 1 — Cloud SQL (staging) ✅ done (2026-08-06)

- [x] Create a Cloud SQL Postgres instance in the staging project, a database,
      and a user.
      **Instance name: `yns-interview-postgres`** (not `-staging-postgres` —
      redundant with the project name, deliberately renamed once mid-session).
      POSTGRES_15, `db-f1-micro`, `us-central1`, ZONAL, 10GB SSD, no automated
      backups (staging). Database: `yns_interview`. User: `yns_app` / password
      chosen by Kaushik (`Yns-platform@123` — rotate before this becomes
      anything more permanent than a scoping exercise).
      ⚠️ **A stray, undocumented Cloud SQL instance named
      `yns-interview-staging-postgres` already existed at the start of this
      session** (with an empty `yns_interview` db and `yns_app` user) — nobody
      remembered creating it. It was deleted and recreated clean under the
      corrected name above. If you ever find more undocumented infra like
      this again, don't assume it's safe to build on — check what's actually
      in it first.
      **Gotcha:** Cloud SQL instance names stay reserved for about a week
      after deletion — you cannot immediately recreate an instance with a
      name you just deleted.
- [x] Load the schema. `docs/schema.sql` in the repo was **stale** — it only
      had 3 of the 8 tables (the onboarding tables were never captured as
      DDL). The accurate current schema was pulled live from Supabase via
      `pg_dump --schema-only --schema=public` and is now committed as
      **`docs/cloudsql-schema.sql`** — use that file going forward, not
      `docs/schema.sql`. Two things were stripped before loading into Cloud
      SQL: the `app_users_id_fkey -> auth.users(id)` FK (no `auth` schema on
      Cloud SQL) and every RLS policy / `ENABLE ROW LEVEL SECURITY` statement
      (all keyed off `auth.uid()`, which doesn't exist here — see Phase 3).
- [x] `pg_dump --data-only` the app tables from Supabase and restore into
      Cloud SQL. Do not copy `auth.*` — that's Supabase's; users go to
      Identity Platform in Phase 2.
      Row counts landed: app_users 11, career_profiles 11, job_postings 1,
      resumes 17, onboarding_status 11, interview_sessions 39,
      interview_turns 48, session_reports 12.
      **Gotchas hit:** `pg_dump --disable-triggers` errors with "permission
      denied: ... is a system trigger" when loaded as a non-superuser
      (`yns_app`) — harmless here since data loads in FK dependency order
      anyway, but don't rely on `--disable-triggers` working as a non-owner/
      non-superuser. Also: the dump preamble runs
      `SELECT pg_catalog.set_config('search_path', '', false)`, which persists
      for the rest of that `psql` session — `SET search_path TO public;`
      after loading, or unqualified table names will 404.
- [x] Point the backend at Cloud SQL: `--add-cloudsql-instances` on the
      `yns-api` Cloud Run service, and `DATABASE_URL` (Secret Manager
      `database-url`, version 2) updated to Cloud SQL's Unix-socket format
      (this app uses plain SQLAlchemy/psycopg2, not the Cloud SQL Python
      connector library):
      `postgresql://yns_app:Yns-platform%40123@/yns_interview?host=/cloudsql/yns-interview-staging:us-central1:yns-interview-postgres`
      Verified live: `GET /api/onboarding-summary/{user_id}` (SQLAlchemy/
      `DATABASE_URL` path) returns real data pulled from Cloud SQL, using a
      still-valid Supabase-issued bearer token (auth hasn't moved yet — see
      Phase 3). `deploy.yml` was updated to pass `--add-cloudsql-instances`
      permanently (commit `b7e527d`), since `gcloud run deploy` from CI
      replaces the full service spec and won't carry that flag forward from
      a manual `gcloud run services update` the way you might expect.
      **Note:** the AI routers (`/api/sessions/*`, `/api/reports/*`,
      `/api/resume/parse`) still use `supabase-py` + the Supabase service
      role key, untouched — only the SQLAlchemy/`DATABASE_URL` path
      (onboarding + champion routers) is on Cloud SQL so far.

## Phase 2 — Identity Platform (staging) — the critical phase ✅ done (2026-08-06)

- [x] Enable Identity Platform; enable Email/Password.
      ⚠️ **This was already enabled before this session started**, with
      Email/Password already on, a Firebase app already provisioned
      (`yns-interview-staging.firebaseapp.com`, API key already generated),
      undocumented in migration.md same as the stray Cloud SQL instance
      above. Unlike Cloud SQL, Identity Platform isn't something you can
      cleanly delete/recreate (`gcloud` has no `identity-platform` command
      group at all — it's configured via the Identity Toolkit Admin REST API,
      `identitytoolkit.googleapis.com/admin/v2/projects/{id}/config`, plus a
      required `x-goog-user-project` header on every call or you'll get a
      confusing 403 about ADC quota projects).
      **More concerning:** 16 users already existed in it. 14 had UIDs
      matching Supabase (a prior partial import attempt) but **almost none
      had a `passwordHash`** — meaning that prior import was broken/
      incomplete and none of those accounts could actually log in. One
      account, `3h6xd@web-library.net` (UID `wEV9quSZDudgoDnoTRVmgvrzPPu2`,
      `customAttributes: {"role": "champion"}`), is **not** from Supabase at
      all — random Firebase-generated UID, disposable-looking email domain.
      **Resolved (2026-08-06, start of Phase 3):** Cloud Audit Logs
      (`identitytoolkit.googleapis.com` Admin Activity) show Identity
      Platform was enabled and configured by `sobhiralakarthik@gmail.com`
      (a named, authenticated Google account, not anonymous/a service
      account) at 2026-08-05T19:58-20:01Z — the evening before this
      migration session started, matching exactly what this section
      already suspected ("already enabled before this session"). Data
      Access audit logging isn't enabled on this project (no
      `auditConfigs` in the project IAM policy), so the actual
      `accounts:create`/import call for this specific user isn't logged —
      but `accounts:lookup` shows `createdAt` and `lastLoginAt` only ~1.2s
      apart, i.e. someone created it and immediately signed into it by
      hand, consistent with a teammate's manual exploratory test rather
      than anything automated or malicious. No anomalous IPs or
      unauthenticated access in the trail. **Action taken:** disabled via
      `accounts:update` (`disableUser: true`), verified via
      `accounts:lookup` (`"disabled": true`). Left in place rather than
      deleted, in case whoever made it needs to explain/reclaim it — safe
      to delete once confirmed with the team.
- [x] Build the user-import file from the Supabase `auth.users` export.
      `passwordHash` must be **base64-encoded** before handing it to
      `firebase auth:import` — confirmed straight from `firebase-tools`'
      source (`src/accountImporter.ts`), which validates but does not encode
      for you. For BCRYPT specifically, no separate `salt` field is needed
      (bcrypt embeds its own salt in the hash string). Docs pages fetched
      via WebFetch kept returning only nav/index content, not the real
      body — the source code was the reliable source of truth here.
- [x] Import with `firebase auth:import users.json --hash-algo=BCRYPT`.
      Ran a single-user test first (Kaushik's own account, since he's the
      one who could actually verify a real password), then the full set of
      15 — this overwrote the 14 broken pre-existing entries in place.
- [x] **Verify preservation:** signed in via
      `POST https://identitytoolkit.googleapis.com/v1/accounts:signInPassword`
      (the app's frontend still talks to Supabase — Phase 3 isn't done — so
      verification here was direct against the Identity Toolkit REST API,
      not through the UI) with Kaushik's real password. Returned
      `localId: 88e92204-aefb-414d-9e96-98064aed3fbd`, exactly matching his
      Supabase UID / `app_users.id` in Cloud SQL. **Confirmed for all 15**
      via a follow-up `accounts:query` REST call showing a fresh
      `passwordUpdatedAt` timestamp (matching the import's exact moment) on
      every migrated account. (Note: `firebase auth:export`'s CLI JSON
      output does NOT surface `passwordHash` for BCRYPT-imported accounts —
      don't use it to check for hash presence, it's a display quirk, not a
      real absence. The `accounts:query` REST endpoint also redacts the hash
      value itself as literal string `"REDACTED"`, base64'd — that's normal;
      it doesn't mean the hash is missing.)

## Phase 3 — Code changes ✅ done (2026-08-06), three manual steps remain before it's live

- [x] **Backend auth** (`app/middleware/auth.py`): replaced Supabase JWT/JWKS
      verification with Firebase ID token verification via the Firebase Admin
      SDK's `verify_id_token(..., check_revoked=True)`. `check_revoked=True`
      was a deliberate choice, not the default — it adds one Identity
      Platform lookup per request but means a disabled/revoked account is
      rejected immediately instead of up to an hour later (relevant given the
      `3h6xd@web-library.net` account disable above). Firebase's `sub`/`uid`
      claim is the preserved UID, so `app/dependencies.py`'s
      `_claims_subject`/`_claim_roles` needed no logic change — Firebase
      custom claims land at the top level of the token (unlike Supabase's
      nested `app_metadata.role`), which the existing defensive claim-reading
      code already checked. Simplified away the now-dead
      `app_metadata`/`user_metadata` nesting checks. Champion/admin roles are
      now granted via `firebase_admin.auth.set_custom_user_claims(uid,
      {"role": "champion"})` — note this only takes effect on the user's next
      token refresh, not retroactively.
- [x] **Frontend auth:** `yns-web` now uses the Firebase Auth JS SDK
      (`lib/firebase/client.ts`) end to end — `@supabase/ssr`/`supabase-js`
      removed entirely (nothing in `yns-web` touches Postgres/Storage
      directly anymore; see the write-path item below). `middleware.ts`'s
      route-protection check reads a plain (unverified) `yns-session`/
      `yns-role` cookie kept in sync by a `onIdTokenChanged` listener — this
      was already documented as "not a security boundary, the API enforces
      it independently," and stays that way deliberately: real server-side
      verification of a Firebase session in Next.js middleware needs
      `firebase-admin`, which doesn't run on the Edge runtime `middleware.ts`
      uses. Real enforcement is still 100% server-side in `yns-api`.
      **Sign-up UX changed**: Supabase's inline 6-digit-code flow has no
      Firebase equivalent (Firebase's native email verification is a
      clickable link, a different UX). Rebuilt the exact code-entry UX as a
      custom flow: `POST /api/auth/otp/start` (generate + hash + store in a
      new `signup_otp_codes` Cloud SQL table + email via Resend) →
      `POST /api/auth/otp/verify` (check code, then
      `firebase_admin.auth.create_user(..., email_verified=True)` +
      `create_custom_token` → frontend calls `signInWithCustomToken`). See
      "Manual steps before Phase 3 is actually live" below — this specific
      piece needs a DB migration applied and won't send real email until
      Resend's sandbox sender is replaced with a verified domain.
- [x] **Authorization audited.** Every endpoint was checked: all
      `/user/{id}`-shaped routes use `get_current_student` +
      `require_user_ownership`; session/report/resume-parse endpoints scope
      to the token's own subject (no client-suppliable user id at all);
      champion routes are gated at the router level via
      `require_champion_user`. No gaps found — the `require_*` dependency
      pattern already built pre-migration held up correctly under the
      Firebase claims shape once `_claim_roles`/`_claims_subject` were
      updated (see above).
- [x] **A second, unplanned data-fork was found and closed.** Auditing
      Phase 3 surfaced that `yns-web`'s onboarding/resume/job-posting writes
      went **straight to Supabase Postgres** (anon key + RLS keyed on the
      Supabase session) — a path that would have broken outright the moment
      Supabase Auth was removed (no more session for RLS to key off), and
      that Cloud SQL was never kept in sync with in the first place. Worse,
      `yns-api`'s own AI routers (`/api/sessions/*`, `/api/resume/parse`)
      were *also* independently reading/writing those same four tables
      (`app_users`, `career_profiles`, `job_postings`, `resumes`) via
      `supabase-py`/service-role — meaning a naive fix would have created a
      **third** copy of the truth. Fixed by: (1) new authenticated FastAPI
      write endpoints (`POST /api/onboarding/submit`, `POST /api/resumes`,
      `POST /api/job-postings`) on Cloud SQL/SQLAlchemy, replacing
      `yns-web`'s direct Supabase writes; (2) migrating
      `app/services/supabase_client.py`'s onboarding-domain functions
      (`get_student_profile`, resume metadata/extracted-text,
      job-posting-parsed-facts) to the new `app/services/profile_store.py`
      (SQLAlchemy/Cloud SQL). `interview_sessions`/`interview_turns`/
      `session_reports` deliberately stay on Supabase via service-role — a
      separate domain, already a known/documented reconciliation item, not
      part of this fix. Resume *file bytes* stay in Supabase Storage either
      way (not part of this migration) — only the Postgres metadata moved.
- [x] **Config/secrets:** removed `pyjwt`/`certifi` (only used by the old
      JWKS path) and the dead `anthropic==0.116.0` line from
      `requirements.txt`; added `firebase-admin`, `resend`,
      `python-multipart`. Added `RESEND_API_KEY` to Secret Manager
      (`resend-api-key`) and wired it into `deploy.yml`'s `--set-secrets`.
      Added `GCP_PROJECT_ID` explicitly to `--set-env-vars` — it was
      previously only working by coincidence (the Settings default happened
      to match staging's project id); Firebase Admin SDK init makes this
      load-bearing now, not just cosmetic for Vertex AI. **Found but did not
      fix** (unrelated to auth): `google-genai` has never actually been
      pinned in `requirements.txt` — pip has been silently resolving it down
      to `2.8.0` on every install to satisfy the `pydantic==2.11.7` pin
      (current `google-genai` needs `pydantic>=2.12.5`). Left as-is
      (didn't want to change Gemini-layer behavior mid-auth-migration) but
      this is real, pre-existing drift worth its own fix.

### Manual steps before Phase 3 is actually live

- [ ] **Apply `docs/migrations/002_signup_otp_codes.sql` to Cloud SQL.** Could
      not be run from this session — no network path from this machine to
      the instance's public IP (timed out; likely needs an authorized
      network or the Cloud SQL Auth Proxy). Sign-up will 500 on `/otp/start`
      until this table exists.
- [ ] **Set the `staging` GitHub Environment variables**: add
      `NEXT_PUBLIC_FIREBASE_API_KEY` (`AIzaSyAevg9MA8ARO6yEwRijzNp65h4CUgM_umY`),
      `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` (`yns-interview-staging.firebaseapp.com`),
      `NEXT_PUBLIC_FIREBASE_PROJECT_ID` (`yns-interview-staging`); remove the
      old `NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_ANON_KEY` vars
      (`SUPABASE_URL` stays — still used for Storage + `interview_sessions`/
      `interview_turns`/`session_reports`). No `gh` CLI access from this
      session to do this directly — someone with repo admin needs to do it
      by hand (Settings → Environments → staging → Variables) before the
      next push-to-main deploy, or the web build will bake in empty Firebase
      config.
- [ ] **Verify a real sender domain in Resend.** `OTP_FROM_EMAIL` is
      currently the sandbox address `onboarding@resend.dev`, which Resend
      only delivers to the account owner's own verified email — real users
      won't receive codes until a real domain is verified.
- [ ] Decide whether to keep `RESEND_API_KEY` value as pasted into this
      session's `yns-api/.env` (local dev only, gitignored) or rotate it —
      it was shared directly in chat.

## Phase 4 — Prove it on staging (this is the gate)

Run these against the migrated staging app and capture the result of each:

- [ ] An existing user logs in with their pre-migration password.
- [ ] That user's token `uid` equals their `app_users.id` (data still theirs).
- [ ] That user sees only their own sessions/profile/resume (authz holds
      with no RLS).
- [ ] A new sign-up + onboarding works end to end.
- [ ] A champion logs in and sees only their assigned students.
- [ ] Rollback rehearsed: flipping the config back to Supabase brings the
      old setup back (proves cutover is reversible).

## Phase 5 — Production cutover (mentor approval required)

**Do not start this until the mentor has reviewed the staging results and
approved.** Then:

- [ ] Repeat the data load (Phase 1) and user import (Phase 2) against the
      production Cloud SQL instance and Identity Platform — same
      UID-preservation, verified the same way.
- [ ] Cutover = switch production config to point at Cloud SQL + Identity
      Platform. Keep the Supabase project frozen and intact as rollback.
- [ ] Rollback plan: if anything is wrong, switch the config back to
      Supabase. Do not delete the Supabase project until production has run
      clean on the new stack for at least a couple of weeks.

---

## Status (updated 2026-08-06)

**Phases 0, 1, 2, and 3 (code) are done on staging.** Phase 3's code is
written, tested (backend unit tests + frontend typecheck/build all pass),
and merged conceptually — but **not yet actually live**: three manual steps
(DB migration, GitHub Environment variables, Resend sender domain) listed
under Phase 3 above haven't been done, and nothing has been deployed since
these changes were made. Phase 4 (the verification gate) can't start for
real until those are done and a deploy has gone out. Phase 5 (production
cutover) is untouched.

Concrete state as of now:
- Cloud SQL: `yns-interview-postgres` instance, `yns_interview` db, `yns_app`
  user, full schema + full data loaded. As of Phase 3, this now covers the
  full onboarding domain both ways — `yns-web`'s writes and `yns-api`'s AI
  routers' reads/writes for `app_users`/`career_profiles`/`job_postings`/
  `resumes` all go through Cloud SQL. `interview_sessions`/`interview_turns`/
  `session_reports` are the one remaining piece still on Supabase
  (service-role, unaffected by the auth swap) — a known, deliberately
  deferred reconciliation item.
- Identity Platform: all 15 Supabase users imported with preserved UIDs and
  working bcrypt password hashes, verified with a real sign-in test. The
  unexplained `3h6xd@web-library.net` "champion" account has been disabled
  (see Phase 2 notes for the investigation).
- **The app's auth code is now Firebase end to end** — `yns-web` uses the
  Firebase Auth JS SDK (no more `@supabase/ssr`/`supabase-js`, package
  removed), `yns-api`'s `app/middleware/auth.py` verifies Firebase ID
  tokens. Not yet exercised against real staging traffic — see the manual
  steps above before trusting this.
- Migration backup artifacts (pg_dump, auth.users export, Firebase import
  JSON) are at `~/yns-migration-backups-2026-08-06/` on Kaushik's machine —
  outside the repo, contains real password hash material, never commit.

