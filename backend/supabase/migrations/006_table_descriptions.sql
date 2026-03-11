-- Detailed table descriptions: what each table stores and how it links to others.
-- Run after 005_snore_events_duration.sql.
--
-- Relationship overview:
--   auth.users (Supabase) → profiles (1:1), couple_connections (sleeper/partner),
--   invite_codes (sleeper), partner_invites (sleeper), experiments (sleeper),
--   sleep_sessions (sleeper), epworth_assessments (user), onboarding (user_id or anonymous_id)
--   sleep_sessions → snore_events (1:many), partner_checkin_tokens (1:1 per token)
--   experiments → sleep_sessions (optional experiment_id)
--   couple_connections links two auth.users (sleeper_id, partner_id)

-- -----------------------------------------------------------------------------
-- profiles
-- -----------------------------------------------------------------------------
-- Extends Supabase auth.users with app profile data. One row per user.
-- id = auth.users(id); created/updated by backend GET/PATCH /api/me.
-- Links: id is referenced by almost every other table (sleeper_id, partner_id, user_id).
COMMENT ON TABLE public.profiles IS
  'App profile per user. id = auth.users(id). Stores: email, role (SLEEPER/PARTNER), first_name, onboarding_done, weight_kg, height_cm. Backend reads/updates via GET/PATCH /api/me. Referenced by: couple_connections (sleeper_id, partner_id), invite_codes, partner_invites, experiments, sleep_sessions, epworth_assessments; onboarding links by user_id after signup.';

-- -----------------------------------------------------------------------------
-- couple_connections
-- -----------------------------------------------------------------------------
-- One row per linked couple. Used for "Ask partner" and partner check-in flow.
-- Links: sleeper_id and partner_id both reference auth.users(id). No direct link to sleep_sessions; partner identifies via partner_checkin_tokens + session.
COMMENT ON TABLE public.couple_connections IS
  'Links one sleeper to one partner. One row per couple. sleeper_id and partner_id reference auth.users(id). Used for profile "Linked with Partner" and generating partner check-in links. Not a direct FK from sleep_sessions; partner reports are stored on sleep_sessions.partner_report via partner_checkin_tokens.';

-- -----------------------------------------------------------------------------
-- invite_codes
-- -----------------------------------------------------------------------------
-- 6-digit codes so partner can link without an account. Code is the PK.
-- Links: sleeper_id → auth.users(id). Consumed when partner calls link API.
COMMENT ON TABLE public.invite_codes IS
  '6-digit codes for partner linking. sleeper_id references auth.users(id). Partner enters code in app to create a couple_connections row. Code expires at expires_at; one code per sleeper at a time (app generates new code on demand).';

-- -----------------------------------------------------------------------------
-- partner_invites
-- -----------------------------------------------------------------------------
-- Email invites (e.g. to join app or report on a night). Token used in link.
-- Links: sleeper_id → auth.users(id). No FK to sleep_sessions; token may be for a generic invite or a night-specific check-in (check-in uses partner_checkin_tokens).
COMMENT ON TABLE public.partner_invites IS
  'Email invites sent by sleeper to partner. sleeper_id references auth.users(id). Stores email and token for the invite link. Distinct from partner_checkin_tokens (which are per-session check-in links).';

-- -----------------------------------------------------------------------------
-- experiments
-- -----------------------------------------------------------------------------
-- A multi-day remedy trial (e.g. "Try nasal strip for 7 days"). Optional parent for sleep_sessions.
-- Links: sleeper_id → auth.users(id). sleep_sessions.experiment_id → experiments(id) when a night is part of a formal trial.
COMMENT ON TABLE public.experiments IS
  'Multi-day remedy trial (e.g. 7-day nasal strip test). sleeper_id references auth.users(id). One row per experiment: remedy_type, status (IN_PROGRESS etc), start_date, end_date. Optional: sleep_sessions can set experiment_id to associate a night with this experiment.';

-- -----------------------------------------------------------------------------
-- sleep_sessions
-- -----------------------------------------------------------------------------
-- One row per night of recording. All snore clips for that night live in snore_events; partner report and check-in tokens reference this row.
-- Links: sleeper_id → auth.users(id); experiment_id → experiments(id) (optional); id referenced by snore_events(session_id) and partner_checkin_tokens(session_id).
COMMENT ON TABLE public.sleep_sessions IS
  'One night of recording per sleeper. sleeper_id references auth.users(id). night_key = app night key (e.g. night_2025-03-09). Stores: start_time, end_time, total_duration_minutes, snore_percentage, loud_snore_minutes, partner_report (good/bad from check-in), remedy_type, factors (jsonb e.g. room_result, alcohol). experiment_id optionally references experiments(id). Child rows: snore_events (session_id), partner_checkin_tokens (session_id). Created by POST /api/sessions; updated on session end and when partner submits check-in.';

-- -----------------------------------------------------------------------------
-- partner_checkin_tokens
-- -----------------------------------------------------------------------------
-- One-time token for partner to open check-in link and submit good/bad for a session.
-- Links: session_id → sleep_sessions(id) ON DELETE CASCADE. Token is in URL; partner does not need to be logged in.
COMMENT ON TABLE public.partner_checkin_tokens IS
  'One-time token for partner check-in link. session_id references sleep_sessions(id) ON DELETE CASCADE. Partner opens link, submits good/bad; backend writes to sleep_sessions.partner_report and typically deletes the token. No reference to auth.users; partner may be unauthenticated.';

-- -----------------------------------------------------------------------------
-- snore_events
-- -----------------------------------------------------------------------------
-- Individual snore detections within a sleep_session. One row per clip.
-- Links: session_id → sleep_sessions(id) ON DELETE CASCADE.
COMMENT ON TABLE public.snore_events IS
  'One row per snore clip within a sleep_session. session_id references sleep_sessions(id) ON DELETE CASCADE. Stores: timestamp (epoch ms), confidence (model score), audio_uri, duration_seconds. Written by app on session end via appendSnores; used for tip-of-the-day and night detail playback.';

-- -----------------------------------------------------------------------------
-- epworth_assessments
-- -----------------------------------------------------------------------------
-- Epworth Sleepiness Scale results. One row per assessment.
-- Links: user_id → auth.users(id) ON DELETE CASCADE.
COMMENT ON TABLE public.epworth_assessments IS
  'Epworth Sleepiness Scale results. user_id references auth.users(id). One row per submission: total_score, answers_json (array of 8 answers), completed_at. Backend: POST /api/epworth, GET /api/epworth/latest. No link to sleep_sessions or experiments.';

-- -----------------------------------------------------------------------------
-- onboarding
-- -----------------------------------------------------------------------------
-- Onboarding answers (26-step wizard). Can be stored before signup (anonymous_id) and linked to user_id when they create an account.
-- Links: user_id → auth.users(id) (nullable until linked). anonymous_id is client-generated; sent with PATCH /me to link row to user.
COMMENT ON TABLE public.onboarding IS
  'Onboarding wizard answers (jsonb: user_name, partner_name, has_partner, remedy goals, etc). Before signup: row keyed by anonymous_id (client-generated), user_id NULL. After signup: PATCH /me with onboarding_responses + anonymous_id links row to user_id. One row per user (or per anonymous_id). Backend GET /api/me reads onboarding to return preferred_name and partner_name. Used for user research and in-app personalisation (greeting, partner name).';
