# Deployment

Staging is live on Google Cloud. This documents the actual working pipeline
and the gotchas hit standing it up — read this before touching
`.github/workflows/deploy.yml` or `.github/workflows/ci.yml`.

---

## Environments

| | Project ID | Access | Purpose |
|---|---|---|---|
| Staging | `yns-interview-staging` | Full admin for the dev team | Build/break freely, no real data |
| Production | `yns-interview-platform` | Mentor only | Real users; reached only via the pipeline |

Region: **us-central1** for everything.

Current staging URLs:
- API: `https://yns-api-899993224058.us-central1.run.app`
- Web: `https://yns-web-899993224058.us-central1.run.app`

(Cloud Run also serves each on a revision-hash URL, e.g.
`yns-api-3uievcl5ia-uc.a.run.app` — both resolve to the same service, use the
stable `899993224058` one above for anything durable like `FRONTEND_URL`.)

---

## Where the workflows actually live

**`.github/workflows/` at the true repo root** — i.e.
`NextStepsInterviewPlatform/.github/workflows/`, *not*
`NextStepsInterviewPlatform/yns-platform/.github/workflows/`. GitHub Actions
only ever reads workflows from the repo root; a nested `.github/workflows/`
anywhere else is just an ordinary directory that GitHub ignores. A duplicate
copy briefly existed under `yns-platform/.github/workflows/` during the
staging pipeline work and caused real confusion — fixes landed there had no
effect because GitHub was running the stale root copy the whole time. That
duplicate has been deleted. If you ever see two `.github/workflows/`
directories again, that's a bug — there should be exactly one, at the root.

---

## Pipeline shape (`.github/workflows/deploy.yml`)

Push to `main` → deploys to **staging** automatically. Manual
`workflow_dispatch` → deploys to whichever environment you pick (production
is gated behind a required reviewer on that GitHub Environment).

Auth is keyless — Workload Identity Federation (WIF), no service account
keys anywhere. Steps, in order:
1. Authenticate as `github-deployer` via WIF.
2. Build + push the `yns-api` image (`yns-platform/yns-api/Dockerfile`).
3. `gcloud run deploy yns-api` — passes DB/Supabase/Firebase config via
   `--set-env-vars`/`--set-secrets`, runs as `yns-api-runtime`. Captures the
   resulting service URL.
4. Build + push the `yns-web` image (`yns-platform/yns-web/Dockerfile`),
   using the just-captured API URL plus the public Firebase config vars as
   Next.js `--build-arg`s (baked in at build time — `NEXT_PUBLIC_*` cannot be
   injected at runtime).
5. `gcloud run deploy yns-web` — also runs as `yns-api-runtime` (see gotcha
   below for why this is required, not just tidy).

## GitHub Environment variables (`staging`)

Settings → Environments → staging → Variables. All plain vars, nothing
secret — WIF means no keys, and the genuinely sensitive values
(`DATABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`) live in GCP
Secret Manager instead (below), not here.

| Variable | Value |
|---|---|
| `GCP_PROJECT_ID` | `yns-interview-staging` |
| `GCP_WIF_PROVIDER` | WIF provider resource name |
| `GCP_DEPLOY_SA` | `github-deployer@yns-interview-staging.iam.gserviceaccount.com` |
| `GCP_RUNTIME_SA` | `yns-api-runtime@yns-interview-staging.iam.gserviceaccount.com` |
| `SUPABASE_URL` | `https://zsypfhmmuyqpuvbniaxs.supabase.co` (still needed — Storage + `interview_sessions`/`interview_turns`/`session_reports`, see `docs/migration.md` Phase 3) |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | `AIzaSyAevg9MA8ARO6yEwRijzNp65h4CUgM_umY` |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | `yns-interview-staging.firebaseapp.com` |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | `yns-interview-staging` |
| `FRONTEND_URL` | `https://yns-web-899993224058.us-central1.run.app` |

**As of Phase 3 (2026-08-06), the three `NEXT_PUBLIC_FIREBASE_*` rows above
still need to be added by hand** (Settings → Environments → staging →
Variables) — no `gh` CLI access was available to do it from the session that
made this change. The old `NEXT_PUBLIC_SUPABASE_URL`/
`NEXT_PUBLIC_SUPABASE_ANON_KEY` variables should be removed once confirmed
unused. Until the Firebase variables are set, the web image will build with
empty Firebase config and sign-in will fail client-side.

## GCP Secret Manager (staging project)

```
database-url               -> DATABASE_URL
supabase-service-role-key  -> SUPABASE_SERVICE_ROLE_KEY
resend-api-key              -> RESEND_API_KEY  (added Phase 3 — sign-up OTP emails)
```

All three are mounted into the `yns-api` container via `--set-secrets` in
`deploy.yml`. `yns-api-runtime` needs `roles/secretmanager.secretAccessor` to
read them. `RESEND_API_KEY` won't actually deliver email to real users until
Resend has a verified sender domain — `OTP_FROM_EMAIL` is currently the
sandbox address `onboarding@resend.dev`, which only delivers to the Resend
account owner's own address.

**IAM gotcha:** granting that role *per-secret*
(`gcloud secrets add-iam-policy-binding`) requires
`secretmanager.secrets.setIamPolicy`, which plain `roles/editor` does not
include — you'll get a 403 even though you can create secrets fine. Grant it
at the **project level** instead (same pattern already used for
`roles/aiplatform.user`):
```bash
gcloud projects add-iam-policy-binding yns-interview-staging \
  --member="serviceAccount:yns-api-runtime@yns-interview-staging.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor" --condition=None
```

---

## Gotchas hit while standing this up (read before debugging a failed deploy)

1. **`yns-api-runtime` needs Identity Platform IAM permissions, not just
   `roles/cloudsql.client`/`secretmanager.secretAccessor`/`aiplatform.user`.**
   Found in Phase 4 verification (2026-08-06): `verify_id_token(...,
   check_revoked=True)` in `app/middleware/auth.py` needs to look up the
   user's revocation status server-side, which needs `roles/firebaseauth.admin`
   on the runtime service account. Without it, the Admin SDK call fails and
   `verify_firebase_token`'s blanket `except Exception: raise
   HTTPException(401)` silently turns that permission error into a
   misleading "invalid token" 401 — every authenticated request looked like
   a bad token when it was actually a missing IAM grant. **This won't show
   up in local testing** if you're using your own `gcloud` ADC credentials
   (broad project access masks the gap) — only the actual deployed service
   account is affected. Also grant `roles/iam.serviceAccountTokenCreator` on
   `yns-api-runtime` *to itself* (self-binding) — needed for
   `create_custom_token` (the sign-up OTP flow) to self-sign without a raw
   private key:
   ```bash
   gcloud projects add-iam-policy-binding yns-interview-staging \
     --member="serviceAccount:yns-api-runtime@yns-interview-staging.iam.gserviceaccount.com" \
     --role="roles/firebaseauth.admin" --condition=None

   gcloud iam service-accounts add-iam-policy-binding \
     yns-api-runtime@yns-interview-staging.iam.gserviceaccount.com \
     --member="serviceAccount:yns-api-runtime@yns-interview-staging.iam.gserviceaccount.com" \
     --role="roles/iam.serviceAccountTokenCreator" --project=yns-interview-staging
   ```
2. **CORS breaks silently as "failed to fetch" in the browser, not a visible
   backend error.** `yns-api`'s CORS `allow_origins` comes from
   `FRONTEND_URL` (`app/config.py` → `cors_origins`). If it doesn't exactly
   match the deployed web origin, every browser call to the API (resume
   upload, history, practice sessions) fails client-side with no useful
   message. Diagnose with:
   ```bash
   curl -i -X OPTIONS https://<api-url>/api/sessions/ \
     -H "Origin: https://<web-url>" -H "Access-Control-Request-Method: GET"
   ```
   A `400 Disallowed CORS origin` means `FRONTEND_URL` is wrong. There's a
   chicken-and-egg problem on the *very first* deploy: `yns-web`'s URL
   doesn't exist until after `yns-web` is deployed, but `FRONTEND_URL` has to
   be set before that deploy for CORS to work. Resolve it once by hand
   (`gcloud run services update yns-api --update-env-vars FRONTEND_URL=...`)
   and then keep the GitHub variable in sync so future deploys don't regress
   it back to a placeholder.

3. **`gcloud run deploy yns-web` fails with `iam.serviceaccounts.actAs
   denied`** if no `--service-account` is passed — it silently falls back to
   the project's default compute service account, which `github-deployer`
   was never granted `roles/iam.serviceAccountUser` on. Fix: pass
   `--service-account "$RUNTIME_SA"` explicitly (same account the API uses;
   `github-deployer` already has `actAs` on it from the original setup).

4. **Cloud Run's health check failure looks identical whether the container
   crashed on missing config or the Dockerfile itself is broken** — both show
   up as `HealthCheckContainerError` / "container failed to start and listen
   on $PORT". Check `gcloud run services describe <svc> --format="yaml(status.conditions)"`
   for the human-readable message, and `gcloud logging read` for the
   revision to see the actual Python/Node traceback.

5. **`yns-api/app/database.py` raises at import time** if `DATABASE_URL` is
   unset — this is *why* a container with no env vars never even starts
   listening (the exception happens before uvicorn binds the port). Any
   "container failed to start" failure on `yns-api` should first be checked
   against whether `--set-env-vars`/`--set-secrets` actually landed on that
   revision (`gcloud run services describe yns-api --format="yaml(spec.template.spec.containers[0].env)"`).

---

## Dockerfiles

- **`yns-platform/yns-api/Dockerfile`** — `python:3.11-slim`, installs
  `requirements.txt`, runs
  `uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8080}`. Cloud Run
  always injects `PORT=8080`; never hardcode a port in `CMD`.
- **`yns-platform/yns-web/Dockerfile`** — multi-stage (`node:20-alpine`).
  Build stage takes `NEXT_PUBLIC_API_BASE_URL` / `NEXT_PUBLIC_SUPABASE_URL` /
  `NEXT_PUBLIC_SUPABASE_ANON_KEY` as build `ARG`s (Next.js inlines
  `NEXT_PUBLIC_*` at build time — they cannot be supplied at runtime).
  Requires `output: "standalone"` in `next.config.js`. Runtime stage runs
  `node server.js`, honors `PORT`/`HOSTNAME` env vars automatically.

Test either locally before trusting CI:
```bash
docker build -t yns-api-test yns-platform/yns-api
docker run -e PORT=8080 -e DATABASE_URL=... -e SUPABASE_URL=... -e SUPABASE_SERVICE_ROLE_KEY=... -p 8081:8080 yns-api-test
curl localhost:8081/api/health

docker build --build-arg NEXT_PUBLIC_API_BASE_URL=http://localhost:8000 \
  --build-arg NEXT_PUBLIC_SUPABASE_URL=https://x.supabase.co \
  --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY=x \
  -t yns-web-test yns-platform/yns-web
docker run -e PORT=8080 -p 8082:8080 yns-web-test
curl localhost:8082/sign-in
```

---

## CI (`.github/workflows/ci.yml`)

Three jobs, all on push/PR to `main`: backend (pytest, `python -m compileall`),
frontend (`tsc --noEmit`), docker (both Dockerfiles actually build — this is
what would have caught the empty/missing Dockerfiles before they ever hit
staging). Backend job needs `yns-platform/yns-api/requirements-dev.txt`
(`-r requirements.txt` + `pytest`) — this file previously didn't exist and
silently broke the backend job's install step.

---

## Still open

- **Database/auth migration off Supabase → Cloud SQL + Google Identity
  Platform**: Phases 0-3 are written as of 2026-08-06 (see
  `docs/migration.md`), but three manual steps are still outstanding before
  it's actually live on staging — apply a DB migration, set the
  `NEXT_PUBLIC_FIREBASE_*` GitHub Environment variables above, verify a
  Resend sender domain. See `docs/migration.md`'s Phase 3 section for the
  full list.
- Production (`yns-interview-platform`) pipeline mirrors this but is
  gated behind manual `workflow_dispatch` + required reviewer — not
  exercised yet.
- `yns-web`'s Cloud Run service currently runs as `yns-api-runtime` (reusing
  the backend's service account) purely to reuse an existing `actAs` grant.
  It doesn't need `roles/aiplatform.user`; a dedicated `yns-web-runtime`
  service account would be tighter if this matters later.
