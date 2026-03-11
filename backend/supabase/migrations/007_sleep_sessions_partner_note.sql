-- Partner can leave an optional note with their check-in (good/bad).
ALTER TABLE public.sleep_sessions
  ADD COLUMN IF NOT EXISTS partner_note text;

COMMENT ON COLUMN public.sleep_sessions.partner_note IS 'Optional note from partner when they submitted check-in (e.g. "Woke up 3 times. Feeling exhausted.").';
