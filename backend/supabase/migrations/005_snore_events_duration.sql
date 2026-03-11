-- Add clip duration to snore_events (from native detector).
ALTER TABLE public.snore_events
  ADD COLUMN IF NOT EXISTS duration_seconds real;
