-- Onboarding table: one row per user, linked when they complete onboarding (after account creation / payment).
-- Run after 002_profiles_weight_height.sql.

CREATE TABLE IF NOT EXISTS public.onboarding (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  onboarding_responses jsonb NOT NULL DEFAULT '{}',
  completed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.onboarding IS 'Onboarding answers per user; written when user completes onboarding (after payment/account creation).';

CREATE INDEX IF NOT EXISTS idx_onboarding_user_id ON public.onboarding(user_id);

ALTER TABLE public.onboarding ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own onboarding" ON public.onboarding FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own onboarding" ON public.onboarding FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own onboarding" ON public.onboarding FOR UPDATE USING (auth.uid() = user_id);
