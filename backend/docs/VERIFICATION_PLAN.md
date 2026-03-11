# Backend verification plan

Use this to confirm nothing is broken after refactors and to regression-check main flows.

## 1. Dependency injection

- [ ] **Centralized factories**  
  All routers use `Depends(get_*_service)` from `app.dependencies`. No router defines its own `get_session_service`, `get_auth_service`, etc.
- [ ] **Imports**  
  Run: `grep -r "def get_session_service\|def get_auth_service\|def get_partner_service" app/api/`  
  Expected: no matches (all use `app.dependencies`).

## 2. Auth flow

- [ ] **GET /api/me**  
  With valid Bearer token: returns profile (or fallback from auth user if profile row missing). Uses `_me_response_from_auth_fallback` when profile is None.
- [ ] **PATCH /api/me**  
  Updates profile/onboarding; returns same shape as GET. Uses same fallback when profile missing after update.
- [ ] **Sign-in / sign-up / refresh**  
  Use `get_supabase_auth_service` from dependencies (anon client). No local factory in `auth_credentials.py`.

## 3. Session and verdict flow

- [ ] **Create session**  
  POST /api/sessions with `night_key` (e.g. `night_2026-03-09`). Backend normalizes to `2026-03-09` and stores.
- [ ] **End session**  
  PATCH /api/sessions/:id with duration, snore stats. Then app calls POST /api/insights/night-verdict with same `night_key`; backend runs `compute_and_store_verdict` and writes verdict to that session row.
- [ ] **GET /api/insights/night-verdict?night_key=...**  
  - If **no session** for that user+night: **404** (e.g. night recorded while not logged in).
  - If **session exists but verdict null**: **200** with `verdict="unclear"`, `reason="Verdict not yet available for this night."` (no 404).
  - If **session has verdict**: **200** with stored verdict/reason/suggest_next.
- [ ] **night_key format**  
  App may send `night_2026-03-09` or `2026-03-09`. Backend `SessionService._normalize_night_key` strips `night_` so lookup is by date only.

## 4. Service behaviour

- [ ] **AuthService**  
  `get_profile` uses `_get_connection`, `_get_onboarding_names`; `get_onboarding_responses` uses `_get_onboarding_row`. No duplicate onboarding fetch in `get_profile`.
- [ ] **Night verdict**  
  `compute_and_store_verdict` in `night_verdict_service` does compute + `session_service.update_session_verdict`. Router only calls that and maps to `NightVerdictResponse`.

## 5. Optional runtime checks

- [ ] Start app: `uvicorn app.main:app --reload`. No import errors.
- [ ] GET /health returns 200.
- [ ] With valid token: GET /api/me, GET /api/sessions, GET /api/recommendations/next return 200 (or empty list where applicable).
- [ ] GET /api/insights/night-verdict?night_key=night_2026-03-09 with no session for that night returns 404. With session but no verdict returns 200 and placeholder body.

## 6. What was changed (refactor recap)

- **dependencies.py:** Added `get_session_service`, `get_auth_service`, `get_partner_service`, `get_epworth_service`, `get_experiment_service`, `get_supabase_auth_service`. Routers import these instead of defining their own.
- **auth_service.py:** Extracted `_get_onboarding_row`, `_get_connection`, `_get_onboarding_names`; `get_profile` composes them.
- **auth.py:** Single `_me_response_from_auth_fallback(user_id, ...)` used when profile missing in GET and PATCH.
- **night_verdict_service.py:** Added `compute_and_store_verdict`; POST /night-verdict calls it only.
- **insights.py:** GET /night-verdict returns 404 only when no session; when session exists but verdict null, returns 200 with placeholder (avoids 404 for “session exists, verdict not yet stored”).
