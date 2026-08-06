# Supabase → Cloud SQL + Identity Platform — Migration Runbook

Moving the database to Cloud SQL and auth to Google Identity Platform
(Firebase Auth). Staging first with test data, prove it works, then
production as a controlled cutover.

**Do not touch the Supabase project during any of this.** It stays live and
untouched as the rollback path until production is migrated and verified.

Related context: `docs/claude.md` (current architecture) and
`docs/DEPLOYMENT.md` (the staging Cloud Run pipeline this builds on).

---

## The one thing that must not go wrong: preserve user IDs

Every row points at a user by their Supabase Auth UID (`app_users.id`, every
`user_id` FK). Identity Platform assigns brand-new UIDs unless each user is
imported with their existing UID explicitly — if UIDs change, every
student's data silently detaches from their account. Doable since auth is
email/password with bcrypt hashes (Identity Platform can import those with
UID preserved), but only if done deliberately. Verify before trusting
anything else.

---

## Phase 0 — Prep ✅ done (2026-08-06)

- [x] Full `pg_dump` backup of Supabase (via the Session Pooler — the direct
      `db.<ref>.supabase.co` host is IPv6-only; matching major-version
      client required, Supabase runs Postgres 17).
- [x] Exported `auth.users` (15 users).
- [x] `yns-api-runtime@yns-interview-staging.iam.gserviceaccount.com`
      granted `roles/cloudsql.client`.
- Backups (pg_dump, auth.users CSV, Firebase import JSON) are in
  `~/yns-migration-backups-2026-08-06/` on Kaushik's machine — **not in the
  repo, contains real bcrypt hashes, never commit.**

## Phase 1 — Cloud SQL (staging) ✅ done (2026-08-06)

- [x] Instance `yns-interview-postgres`, POSTGRES_15, `db-f1-micro`,
      `us-central1`, ZONAL. DB `yns_interview`, user `yns_app` (password
      `Yns-platform@123` — rotate before this is more than a scoping
      exercise). A stray undocumented instance existed at session start and
      was deleted/recreated clean — check unfamiliar infra before building
      on it. Instance names stay reserved ~1 week after deletion.
- [x] Schema loaded from a live `pg_dump --schema-only` (not the stale
      `docs/schema.sql`) — now committed as **`docs/cloudsql-schema.sql`**.
      Stripped the `auth.users` FK and all RLS policies (keyed off
      `auth.uid()`, doesn't exist here).
- [x] Data loaded (`pg_dump --data-only`, app tables only — not `auth.*`).
- [x] Backend pointed at Cloud SQL: `--add-cloudsql-instances` on Cloud Run,
      `DATABASE_URL` updated to the Unix-socket format. Verified live. Only
      the onboarding/champion (SQLAlchemy) path was on Cloud SQL at this
      point — the AI routers still used Supabase (see Phase 3).

## Phase 2 — Identity Platform (staging) ✅ done (2026-08-06)

- [x] Identity Platform + Email/Password enabled (found already on from
      prior undocumented setup, along with 14 users with UIDs matching
      Supabase but broken/missing password hashes, and one unrelated
      `champion`-role test account not from Supabase at all — investigated
      via Cloud Audit Logs, traced to legitimate prior exploratory work by a
      teammate, not a security incident. Disabled rather than deleted.).
- [x] Import file built from the Supabase export — `passwordHash` must be
      **base64-encoded** before `firebase auth:import` (validates but
      doesn't encode for you; confirmed from `firebase-tools` source, not
      docs). No separate `salt` needed for BCRYPT.
- [x] Imported via `firebase auth:import users.json --hash-algo=BCRYPT` —
      overwrote the 14 broken entries.
- [x] **Verified preservation:** signed in via the Identity Toolkit REST API
      directly (frontend still on Supabase at this point) — UID matched
      Supabase's exactly. Confirmed for all 15 via `accounts:query`
      (`firebase auth:export`'s CLI output doesn't surface `passwordHash`
      for BCRYPT accounts — that's a display quirk, not a real absence;
      same for `accounts:query`'s `"REDACTED"` hash value).

## Phase 3 — Code changes ✅ done (2026-08-06), one manual step remains

- [x] **Backend auth** (`app/middleware/auth.py`): Firebase ID token
      verification via `verify_id_token(..., check_revoked=True)` —
      deliberate, not the default, so a disabled account is rejected
      immediately rather than up to an hour later. Firebase's `sub`/`uid`
      is the preserved UID; custom claims land flat at the token's top
      level (unlike Supabase's nested `app_metadata.role`), which the
      existing defensive claim-reading code already handled — simplified
      away the now-dead nesting checks. Champion/admin roles now granted
      via `firebase_admin.auth.set_custom_user_claims(uid, {"role":
      "champion"})` (takes effect on next token refresh, not retroactively).
- [x] **Frontend auth:** `yns-web` on the Firebase Auth JS SDK end to end —
      `@supabase/ssr`/`supabase-js` removed entirely. `middleware.ts` reads
      an unverified `yns-session`/`yns-role` cookie kept in sync by
      `onIdTokenChanged` — a redirect hint only, same as before (real
      server-side Firebase session verification needs `firebase-admin`,
      which can't run on the Edge runtime `middleware.ts` uses; enforcement
      is 100% server-side in `yns-api`). **Sign-up UX**: rebuilt Supabase's
      inline 6-digit-code flow as a custom OTP system since Firebase has no
      equivalent (`POST /api/auth/otp/start` emails a code via Resend,
      `POST /api/auth/otp/verify` checks it and creates the Firebase user
      + returns a custom token for `signInWithCustomToken`).
- [x] **Authorization audited** across every endpoint — no gaps found; the
      `require_*` dependency pattern held up under the Firebase claims
      shape.
- [x] **A second, unplanned data-fork was found and closed.** `yns-web`'s
      onboarding/resume/job-posting writes went straight to Supabase
      Postgres (would've broken outright once Supabase Auth was removed),
      while `yns-api`'s AI routers independently read/wrote the *same*
      tables via Supabase service-role — a naive fix would have created a
      third copy of the truth. Fixed with new Cloud SQL write endpoints
      (`POST /api/onboarding/submit`, `/api/resumes`, `/api/job-postings`)
      and migrating the AI layer's access to those tables onto the same
      Cloud SQL path (`app/services/profile_store.py`).
      `interview_sessions`/`interview_turns`/`session_reports` deliberately
      stay on Supabase — separate domain, already a known reconciliation
      item. Resume file bytes stay in Supabase Storage either way.
- [x] **Config/secrets:** dropped `pyjwt`/`certifi`/dead `anthropic` line;
      added `firebase-admin`/`resend`/`python-multipart`. `RESEND_API_KEY`
      in Secret Manager, wired into `deploy.yml`. Added `GCP_PROJECT_ID`
      explicitly (previously only correct by coincidence — now load-bearing
      for Firebase Admin SDK init). **Found, not fixed** (pre-existing,
      unrelated): `google-genai` isn't pinned in `requirements.txt`, pip
      silently resolves it down to `2.8.0` to satisfy `pydantic==2.11.7`.

### Manual steps before Phase 3 is actually live

- [x] **Apply `docs/migrations/002_signup_otp_codes.sql` to Cloud SQL.**
      Done (2026-08-06) via the Cloud SQL Auth Proxy on a local port
      (5432 was taken by local Postgres) — no firewall/authorized-networks
      change needed. Verified via `pg_indexes`.
- [x] **Set `staging` GitHub Environment variables**: added
      `NEXT_PUBLIC_FIREBASE_API_KEY`/`_AUTH_DOMAIN`/`_PROJECT_ID`; removed
      the old `NEXT_PUBLIC_SUPABASE_*` vars. `SUPABASE_URL` (no
      `NEXT_PUBLIC_` prefix) stays — still used for Storage +
      `interview_sessions`/`interview_turns`/`session_reports`.
- [ ] **Verify a real sender domain in Resend.** Currently the sandbox
      address `onboarding@resend.dev`, which only delivers to the account
      owner's own verified email — real users won't get codes until a real
      domain is verified.
- [ ] Decide whether to rotate `RESEND_API_KEY` — it was pasted directly
      into chat during setup (now in `yns-api/.env`, gitignored, local only).

## Phase 4 — Prove it on staging (this is the gate)

- [ ] An existing user logs in with their pre-migration password.
- [ ] That user's token `uid` equals their `app_users.id`.
- [ ] That user sees only their own sessions/profile/resume (authz holds
      with no RLS).
- [ ] A new sign-up + onboarding works end to end.
- [ ] A champion logs in and sees only their assigned students.
- [ ] Rollback rehearsed: flipping config back to Supabase brings the old
      setup back.

**Blocked until:** the Phase 3 branch is merged to `main` (triggers the
staging deploy) — as of now it's on `cloudSQL+IdentityPlatformMigration`,
1 commit ahead of `main`, not yet deployed.

## Phase 5 — Production cutover (mentor approval required)

**Do not start until the mentor has reviewed staging results and approved.**

- [ ] Repeat the data load (Phase 1) and user import (Phase 2) against
      production — same UID-preservation, verified the same way.
- [ ] Cutover = switch production config to Cloud SQL + Identity Platform.
      Keep Supabase frozen and intact as rollback.
- [ ] Rollback: switch config back to Supabase if anything's wrong. Don't
      delete the Supabase project until production has run clean for a
      couple of weeks.

---

## Status (updated 2026-08-06)

**Phases 0-3 (code) done.** Not yet live: the branch hasn't been merged to
`main`, and the Resend sender domain isn't verified. Phase 4 needs both
before it can start for real. Phase 5 untouched.

- Cloud SQL now covers the full onboarding domain both ways —
  `app_users`/`career_profiles`/`job_postings`/`resumes`, both `yns-web`'s
  writes and `yns-api`'s AI-layer reads/writes. `interview_sessions`/
  `interview_turns`/`session_reports` remain on Supabase (deliberate,
  known item).
- Identity Platform: 15 users imported, preserved UIDs, verified working
  passwords. The unrelated champion test account is disabled.
- Auth code is Firebase end to end in both apps — not yet exercised against
  real staging traffic (see "Blocked until" above).
