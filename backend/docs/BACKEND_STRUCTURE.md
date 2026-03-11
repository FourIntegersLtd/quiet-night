# Backend structure and conventions

## Layout

```
app/
  main.py              # FastAPI app, CORS, health, router mount
  config.py            # Settings from env (Supabase, OpenAI)
  dependencies.py      # Auth (verify_token), Supabase clients, shared service factories
  cache.py             # In-memory TTL cache for LLM responses

  api/v1/              # All routes under /api
    router.py          # Aggregates all v1 routers
    auth.py            # GET/PATCH /me
    auth_credentials.py# Signup, signin, signout, refresh
    onboarding.py      # POST onboarding (no auth)
    partner.py         # Partner code, invite, check-in
    sessions.py        # Session CRUD, snores, factors
    experiments.py     # Experiments list, create, update
    epworth.py         # Epworth submit, latest, gp-report
    journey.py         # Best-remedy summary (LLM)
    insights.py        # Night insights, personalized tip, night verdict
    recommendations.py # GET next remedy recommendation

  db/
    supabase.py        # get_supabase(), get_supabase_admin()

  llm/
    client.py          # get_client(), parse_chat() for structured LLM output
    schemas.py         # Pydantic models for LLM JSON (BestRemedySummary, etc.)

  models/
    schemas.py         # Pydantic request/response for all API and DB alignment

  services/            # Domain logic; inject Supabase via constructor
    auth_service.py        # Profile, onboarding, connection (AuthService)
    supabase_auth_service.py  # Sign-in/up/out, refresh; get_user_by_id, update_user_metadata
    session_service.py    # Sessions, snores, verdict by night_key (SessionService)
    partner_service.py    # Partner codes, invite, check-in (PartnerService)
    epworth_service.py    # Epworth assessments (EpworthService)
    experiment_service.py # Experiments (ExperimentService)
    insights_service.py   # Night insight text (LLM + fallback)
    tip_service.py       # Personalized tip (LLM + fallback)
    night_verdict_service.py  # Verdict + suggest_next; compute_and_store_verdict
    recommendation_service.py # Next remedy + reason (LLM + order)
    journey_summary_service.py # Best-remedy summary (LLM + fallback)
```

## Conventions

### Dependency injection

- **Single place for service factories:** `app.dependencies` defines `get_session_service`, `get_auth_service`, `get_partner_service`, `get_epworth_service`, `get_experiment_service`, `get_supabase_auth_service`. Routers use `Depends(get_*_service)` and do not define their own factories.
- **Supabase:** Use `get_supabase_client` (anon) for RLS-respecting ops; use `get_supabase_admin_client` for profile/onboarding and other admin-only ops.

### Services

- **Class-based services** take `supabase` in `__init__` and use `self._supabase` for DB calls (e.g. `SessionService`, `AuthService`, `PartnerService`, `EpworthService`, `ExperimentService`).
- **Stateless LLM helpers** (e.g. `get_night_insight`, `get_personalized_tip`, `get_night_verdict`, `compute_and_store_verdict`) accept dependencies as arguments to avoid circular imports (e.g. `night_verdict_service` calls `recommendation_service` via lazy import).

### Routers

- **Thin routers:** Handlers validate input, call one or more services, map to response models. No business logic in routers.
- **Compute + persist in one place:** Operations that compute and then store (e.g. verdict) live in a single service method (e.g. `compute_and_store_verdict`); the router only calls that and returns the response.

### Auth

- **JWT:** `verify_token` (alias `get_current_user_id`) validates Bearer token with Supabase Auth and returns `user_id`.
- **Profile fallback:** When profile row is missing or has no email, `auth.py` uses `_me_response_from_auth_fallback(user_id, ...)` to build `MeResponse` from Supabase Auth user.

### LLM

- **Structured output:** Use `parse_chat(system, user, response_format)` from `app.llm` with a Pydantic model from `app.llm.schemas`. Returns `None` on missing key or parse failure; callers implement fallback.
- **Caching:** Optional `@cached("prefix")` from `app.cache` for idempotent LLM calls (e.g. best-remedy summary).

## Data flow

- **Sessions:** Created/updated via `SessionService`; verdict columns written by `night_verdict_service.compute_and_store_verdict` when the user ends a recording.
- **Verdict:** Backend is source of truth. Stored on `sleep_sessions` (verdict, verdict_reason, suggest_next, suggest_next_reason). GET `/api/insights/night-verdict?night_key=...` reads from DB. Returns 404 only when no session exists; when session exists but verdict is null, returns 200 with a placeholder so the app does not treat it as an error.

## Verification

See **docs/VERIFICATION_PLAN.md** for a checklist to confirm nothing is broken after refactors (DI, auth, session/verdict flow, service behaviour).

## Optimisations still to be made

- **LLM services:** The five LLM-backed services (insights, tip, journey_summary, night_verdict, recommendation) share a similar pattern (prompt → `parse_chat` → schema → fallback). A small shared helper (e.g. `llm.parse_with_fallback(system, user, schema, fallback_fn)`) would reduce duplication; optional for now.
- **Supabase “select then update”:** Several services do “select by id/user, then update”. Could be abstracted into a small repository or helper if the pattern grows.
- **Tests:** No automated tests yet. Adding pytest and a few integration tests for auth, session create/end, and verdict compute+store would lock behaviour and prevent regressions.
- **Logging:** 404 for GET /night-verdict when no session is expected (e.g. night recorded while not logged in). The app already handles it; no change required unless you want to reduce log noise for this endpoint.
