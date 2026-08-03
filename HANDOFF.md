# YNS Interview Platform — Migration Handoff

This is the task list for moving the platform onto YNS-owned Google Cloud
infrastructure. Work happens against **staging**; production is locked down and
managed separately.

## Environments

| | Project ID | Who has access | Purpose |
|---|---|---|---|
| **Staging** | `yns-interview-staging` | You (full admin) | Build, deploy, break things freely. No real data. |
| **Production** | `yns-interview-platform` | Mentor only | Real users/data. You deploy here via the pipeline, never by hand. |

You never need direct production access — the deploy pipeline reaches prod on
your behalf through a service account. Do all hands-on work in staging.

Region for everything: **us-central1**.

---

## Workstream 1 — Move the AI layer from Claude to Gemini (Vertex AI)

The app currently calls Anthropic's Claude. YNS is standardizing on **Gemini via
Vertex AI**, so the AI calls run inside the GCP project and authenticate through
the Cloud Run runtime service account — **no API key to manage**. This is a
contained rewrite of the AI layer only; routes, auth, DB, and frontend are
untouched.

Files that change (all under `yns-platform/yns-api/`):

1. **`app/services/anthropic_client.py`** → replace with a Gemini client.
   - Use the `google-genai` SDK in Vertex mode: a client constructed with
     `vertexai=True`, the project ID, and location `us-central1`.
   - Auth is automatic on Cloud Run (the `yns-api-runtime` service account
     already has `roles/aiplatform.user`). For local dev, run
     `gcloud auth application-default login` once.
2. **`app/core/assistants/*.py`** (planner, interviewer, evaluator, reporter) →
   the four `call_claude(...)` calls become Gemini calls. Their structured-output
   need (`response_model=...`) maps to Gemini's **structured output**: pass a
   response schema + JSON mime type instead of Anthropic tool-use. The existing
   Pydantic schemas (`SessionPlan`, `TurnEvaluation`, `SessionReport`) can drive
   this directly.
3. **`app/config.py`** → drop `anthropic_api_key`; add `GCP_PROJECT_ID` /
   `GCP_LOCATION` (or read them from the ambient environment on Cloud Run).
4. **`requirements.txt`** → remove `anthropic`; add the Gemini SDK
   (`google-genai`).
5. **Model + prompts** → pick a Flash-tier Gemini model (the current Claude model
   is a fast/cheap tier, so match it). Retune prompts lightly and re-run the
   assistant unit tests.

> ⚠️ Confirm the exact current Gemini model ID and the `google-genai` method
> signatures against Google's current Vertex AI docs before finalizing — model
> IDs change and these notes describe the shape, not a frozen API.

Definition of done: the four assistants return the same structured objects they
do today, all unit tests pass, and a local run completes a full interview
session end to end.

---

## Workstream 2 — Stand up the staging deploy pipeline

The production deploy identity (Artifact Registry, deploy service account,
runtime service account, and keyless GitHub auth via Workload Identity
Federation) is **already built on production**. You mirror it on **staging** —
you have the rights to do this yourself. Run everything below against
`yns-interview-staging`.

```bash
PROJ=yns-interview-staging
PROJNUM=899993224058
REGION=us-central1
REPO="Kaushikdrko/NextStepsInterviewPlatform"   # update if the repo moves to a YNS org

# 1. Enable the APIs
gcloud services enable \
  run.googleapis.com artifactregistry.googleapis.com \
  iamcredentials.googleapis.com sts.googleapis.com iam.googleapis.com \
  sqladmin.googleapis.com secretmanager.googleapis.com aiplatform.googleapis.com \
  --project=$PROJ

# 2. Artifact Registry (holds the container images)
gcloud artifacts repositories create containers \
  --repository-format=docker --location=$REGION \
  --description="Container images" --project=$PROJ

# 3. Service accounts: one to deploy, one for the app to run as
gcloud iam service-accounts create github-deployer \
  --display-name="GitHub Actions deployer" --project=$PROJ
gcloud iam service-accounts create yns-api-runtime \
  --display-name="Cloud Run runtime" --project=$PROJ

DEPLOYER=github-deployer@$PROJ.iam.gserviceaccount.com
RUNTIME=yns-api-runtime@$PROJ.iam.gserviceaccount.com

# 4. Roles: deployer can deploy + push images; runtime can call Vertex AI
gcloud projects add-iam-policy-binding $PROJ --member="serviceAccount:$DEPLOYER" \
  --role="roles/run.admin" --condition=None
gcloud projects add-iam-policy-binding $PROJ --member="serviceAccount:$DEPLOYER" \
  --role="roles/artifactregistry.writer" --condition=None
gcloud iam service-accounts add-iam-policy-binding $RUNTIME \
  --member="serviceAccount:$DEPLOYER" --role="roles/iam.serviceAccountUser" --project=$PROJ
gcloud projects add-iam-policy-binding $PROJ --member="serviceAccount:$RUNTIME" \
  --role="roles/aiplatform.user" --condition=None

# 5. Workload Identity Federation (keyless GitHub -> GCP auth)
gcloud iam workload-identity-pools create github-pool --location=global \
  --display-name="GitHub Actions" --project=$PROJ
gcloud iam workload-identity-pools providers create-oidc github-provider \
  --location=global --workload-identity-pool=github-pool --display-name="GitHub" \
  --issuer-uri="https://token.actions.githubusercontent.com" \
  --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository,attribute.repository_owner=assertion.repository_owner" \
  --attribute-condition="assertion.repository_owner=='Kaushikdrko'" \
  --project=$PROJ
gcloud iam service-accounts add-iam-policy-binding $DEPLOYER \
  --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/projects/$PROJNUM/locations/global/workloadIdentityPools/github-pool/attribute.repository/$REPO" \
  --project=$PROJ

# Print the provider resource name — you need it for the GitHub variable below
gcloud iam workload-identity-pools providers describe github-provider \
  --location=global --workload-identity-pool=github-pool --project=$PROJ \
  --format="value(name)"
```

Then in the GitHub repo (**Settings → Environments**), create an environment
named **`staging`** with these four **variables** (not secrets — WIF means no
keys):

| Variable | Value |
|---|---|
| `GCP_PROJECT_ID` | `yns-interview-staging` |
| `GCP_WIF_PROVIDER` | *(the provider resource name printed by the last command)* |
| `GCP_DEPLOY_SA` | `github-deployer@yns-interview-staging.iam.gserviceaccount.com` |
| `GCP_RUNTIME_SA` | `yns-api-runtime@yns-interview-staging.iam.gserviceaccount.com` |

The deploy workflow already exists at `.github/workflows/deploy.yml`. A push to
`main` deploys to staging automatically.

---

## Workstream 3 — Finish the Champion (mentor) authentication

Still outstanding from the security pass: the Champion dashboard is on mock auth.
`app/api/champion/router.py` → `current_champion_id()` returns a hardcoded
`MOCK_CHAMPION_ID`, so every mentor endpoint answers anyone. Replace it with a
real dependency (like the `require_admin_user` / ownership pattern you already
built) that verifies the caller is a champion and scopes every query to that
mentor's assigned students. This is the highest-priority security item — once we
move off Supabase, application-level checks are the only protection there is.

---

## Workstream 4 — Prove it works

Push to `main`, watch the `Deploy` workflow run, and confirm both Cloud Run
services come up in staging. Then run a full interview end to end against the
deployed staging app: sign in, complete a session, and confirm a student can see
only their own history.

---

## Things to keep in mind

- **`NEXT_PUBLIC_*` values are public.** They get baked into the browser bundle
  at build time — fine for the API URL and Supabase anon key, never for a secret.
  The Gemini call stays on the backend; no AI credential goes near the frontend.
- **The WIF trust is pinned to repo owner `Kaushikdrko`.** If the repo moves to a
  YNS GitHub org, the pipeline auth breaks until the owner condition and repo
  binding are updated (both staging and production).
- **Staging has no real data — keep it that way.** Use fake/test accounts only.
  Before any real student data ever lands in production, staging access gets
  tightened.
