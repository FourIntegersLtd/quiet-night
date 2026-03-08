-- QuietNight Supabase tables
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New query).
-- Order matters: tables with foreign keys come after referenced tables.
--
-- Note: The backend uses the anon key and verifies JWTs itself; it does not pass
-- the user's JWT to Supabase. So for backend-only access you can use the
-- service_role key in the backend (it bypasses RLS). These RLS policies protect
-- direct client access if you ever call Supabase from the app with the user's JWT.

-- 1. profiles (extends auth.users; id = auth user id)
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  role text NOT NULL DEFAULT 'SLEEPER',
  first_name text,
  onboarding_done boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. couple_connections (sleeper–partner link)
CREATE TABLE IF NOT EXISTS public.couple_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sleeper_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  partner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'ACTIVE',
  linked_at timestamptz NOT NULL DEFAULT now(),
  current_arrangement text
);

-- 3. invite_codes (6-digit codes for partner linking)
CREATE TABLE IF NOT EXISTS public.invite_codes (
  code text PRIMARY KEY,
  sleeper_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL
);

-- 4. partner_invites (email invites)
CREATE TABLE IF NOT EXISTS public.partner_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sleeper_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  token text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 5. experiments (remedy experiments, 7-day etc.)
CREATE TABLE IF NOT EXISTS public.experiments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sleeper_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  remedy_type text NOT NULL,
  status text NOT NULL DEFAULT 'IN_PROGRESS',
  start_date date NOT NULL,
  end_date date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 6. sleep_sessions (one per night per sleeper)
CREATE TABLE IF NOT EXISTS public.sleep_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sleeper_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  night_key text NOT NULL,
  start_time timestamptz NOT NULL,
  end_time timestamptz,
  total_duration_minutes int,
  snore_percentage float,
  loud_snore_minutes float,
  partner_report text,
  remedy_type text,
  is_shared_room_night boolean,
  factors jsonb,
  experiment_id uuid REFERENCES public.experiments(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 7. partner_checkin_tokens (one-time links for partner to report on a session)
CREATE TABLE IF NOT EXISTS public.partner_checkin_tokens (
  token text PRIMARY KEY,
  session_id uuid NOT NULL REFERENCES public.sleep_sessions(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL
);

-- 8. snore_events (events within a session)
CREATE TABLE IF NOT EXISTS public.snore_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.sleep_sessions(id) ON DELETE CASCADE,
  "timestamp" bigint NOT NULL,
  confidence float NOT NULL DEFAULT 0,
  audio_uri text
);

-- 9. epworth_assessments (Epworth sleepiness scale)
CREATE TABLE IF NOT EXISTS public.epworth_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  total_score int NOT NULL,
  answers_json jsonb NOT NULL,
  completed_at timestamptz NOT NULL
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_profiles_id ON public.profiles(id);
CREATE INDEX IF NOT EXISTS idx_couple_connections_sleeper ON public.couple_connections(sleeper_id);
CREATE INDEX IF NOT EXISTS idx_couple_connections_partner ON public.couple_connections(partner_id);
CREATE INDEX IF NOT EXISTS idx_invite_codes_code ON public.invite_codes(code);
CREATE INDEX IF NOT EXISTS idx_sleep_sessions_sleeper_created ON public.sleep_sessions(sleeper_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sleep_sessions_night_key ON public.sleep_sessions(night_key);
CREATE INDEX IF NOT EXISTS idx_sleep_sessions_experiment ON public.sleep_sessions(experiment_id);
CREATE INDEX IF NOT EXISTS idx_snore_events_session ON public.snore_events(session_id);
CREATE INDEX IF NOT EXISTS idx_experiments_sleeper ON public.experiments(sleeper_id);
CREATE INDEX IF NOT EXISTS idx_epworth_user_completed ON public.epworth_assessments(user_id, completed_at DESC);
CREATE INDEX IF NOT EXISTS idx_partner_checkin_tokens_token ON public.partner_checkin_tokens(token);

-- Enable Row Level Security (RLS) so the anon key only sees allowed rows
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.couple_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invite_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.experiments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sleep_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_checkin_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.snore_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.epworth_assessments ENABLE ROW LEVEL SECURITY;

-- Policies: allow authenticated users to manage their own data
-- profiles: read/update own row
CREATE POLICY "Users can read own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- couple_connections: read if sleeper or partner
CREATE POLICY "Users can read own connections" ON public.couple_connections FOR SELECT USING (auth.uid() = sleeper_id OR auth.uid() = partner_id);
CREATE POLICY "Users can insert connection" ON public.couple_connections FOR INSERT WITH CHECK (auth.uid() = partner_id OR auth.uid() = sleeper_id);
CREATE POLICY "Users can update own connection" ON public.couple_connections FOR UPDATE USING (auth.uid() = sleeper_id OR auth.uid() = partner_id);

-- invite_codes: sleeper can manage their codes
CREATE POLICY "Sleeper can manage own codes" ON public.invite_codes FOR ALL USING (auth.uid() = sleeper_id);

-- partner_invites: sleeper can insert
CREATE POLICY "Sleeper can create invite" ON public.partner_invites FOR INSERT WITH CHECK (auth.uid() = sleeper_id);
CREATE POLICY "Sleeper can read own invites" ON public.partner_invites FOR SELECT USING (auth.uid() = sleeper_id);

-- experiments: sleeper only
CREATE POLICY "Sleeper can manage own experiments" ON public.experiments FOR ALL USING (auth.uid() = sleeper_id);

-- sleep_sessions: sleeper only
CREATE POLICY "Sleeper can manage own sessions" ON public.sleep_sessions FOR ALL USING (auth.uid() = sleeper_id);

-- partner_checkin_tokens: allow anonymous read/delete by token (for check-in link); insert by session owner
CREATE POLICY "Anyone can read checkin token by token" ON public.partner_checkin_tokens FOR SELECT USING (true);
CREATE POLICY "Anyone can delete checkin token" ON public.partner_checkin_tokens FOR DELETE USING (true);
CREATE POLICY "Session owner can create checkin token" ON public.partner_checkin_tokens FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.sleep_sessions s WHERE s.id = session_id AND s.sleeper_id = auth.uid())
);

-- snore_events: via session ownership
CREATE POLICY "Sleeper can manage own session snores" ON public.snore_events FOR ALL USING (
  EXISTS (SELECT 1 FROM public.sleep_sessions s WHERE s.id = session_id AND s.sleeper_id = auth.uid())
);

-- epworth_assessments: user only
CREATE POLICY "User can manage own epworth" ON public.epworth_assessments FOR ALL USING (auth.uid() = user_id);

-- Optional: trigger to create profile on signup (if you use Supabase Auth signUp)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
