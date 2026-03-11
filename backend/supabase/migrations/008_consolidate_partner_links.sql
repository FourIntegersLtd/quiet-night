-- Consolidate invite_codes, partner_checkin_tokens, and partner_invites into one table.
-- Run after 007_sleep_sessions_partner_note.sql.

-- New single table: kind = 'invite_code' | 'checkin' | 'email_invite'
CREATE TABLE IF NOT EXISTS public.partner_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL CHECK (kind IN ('invite_code', 'checkin', 'email_invite')),
  value text NOT NULL UNIQUE,
  sleeper_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id uuid REFERENCES public.sleep_sessions(id) ON DELETE CASCADE,
  email text,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_partner_links_value ON public.partner_links(value);
CREATE INDEX IF NOT EXISTS idx_partner_links_sleeper_kind ON public.partner_links(sleeper_id, kind);
CREATE INDEX IF NOT EXISTS idx_partner_links_session ON public.partner_links(session_id) WHERE session_id IS NOT NULL;

COMMENT ON TABLE public.partner_links IS
  'Consolidated: invite codes (6-digit link), check-in links (one-time per session), and email invites. kind=invite_code: value=code, expires_at; kind=checkin: value=token, session_id, expires_at; kind=email_invite: value=token, email.';

-- Migrate existing data (no-op if old tables are empty)
INSERT INTO public.partner_links (kind, value, sleeper_id, expires_at, created_at)
  SELECT 'invite_code', code, sleeper_id, expires_at, now()
  FROM public.invite_codes
  ON CONFLICT (value) DO NOTHING;

INSERT INTO public.partner_links (kind, value, sleeper_id, session_id, expires_at, created_at)
  SELECT 'checkin', p.token, s.sleeper_id, p.session_id, p.expires_at, now()
  FROM public.partner_checkin_tokens p
  JOIN public.sleep_sessions s ON s.id = p.session_id
  ON CONFLICT (value) DO NOTHING;

INSERT INTO public.partner_links (kind, value, sleeper_id, email, created_at)
  SELECT 'email_invite', token, sleeper_id, email, created_at
  FROM public.partner_invites
  ON CONFLICT (value) DO NOTHING;

-- Drop old tables (policies are dropped with the table)
DROP TABLE IF EXISTS public.partner_checkin_tokens;
DROP TABLE IF EXISTS public.partner_invites;
DROP TABLE IF EXISTS public.invite_codes;

-- RLS
ALTER TABLE public.partner_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sleeper can manage own invite_code and email_invite"
  ON public.partner_links FOR ALL
  USING (auth.uid() = sleeper_id AND kind IN ('invite_code', 'email_invite'));

CREATE POLICY "Sleeper can create checkin link for own session"
  ON public.partner_links FOR INSERT
  WITH CHECK (
    kind = 'checkin'
    AND auth.uid() = sleeper_id
    AND EXISTS (SELECT 1 FROM public.sleep_sessions s WHERE s.id = session_id AND s.sleeper_id = auth.uid())
  );

CREATE POLICY "Anyone can read partner_links by value (for check-in link)"
  ON public.partner_links FOR SELECT USING (true);

CREATE POLICY "Anyone can delete partner_links by value (consume checkin token)"
  ON public.partner_links FOR DELETE USING (true);

CREATE POLICY "Sleeper can read own checkin links"
  ON public.partner_links FOR SELECT USING (auth.uid() = sleeper_id);
