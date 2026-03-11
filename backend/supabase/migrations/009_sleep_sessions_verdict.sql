-- Store experiment verdict and "what to try next" on the session (backend source of truth).
-- Written when user ends recording via POST /api/insights/night-verdict; read by GET /api/insights/night-verdict and night detail.
ALTER TABLE public.sleep_sessions
  ADD COLUMN IF NOT EXISTS verdict text,
  ADD COLUMN IF NOT EXISTS verdict_reason text,
  ADD COLUMN IF NOT EXISTS suggest_next text,
  ADD COLUMN IF NOT EXISTS suggest_next_reason text;

COMMENT ON COLUMN public.sleep_sessions.verdict IS 'Experiment verdict for this night: worked, unclear, or didnt_work. Set when user ends recording.';
COMMENT ON COLUMN public.sleep_sessions.verdict_reason IS 'Short LLM-generated explanation for the verdict.';
COMMENT ON COLUMN public.sleep_sessions.suggest_next IS 'Remedy type suggested to try next (e.g. NASAL_STRIPS).';
COMMENT ON COLUMN public.sleep_sessions.suggest_next_reason IS 'Short reason why that remedy is suggested.';
