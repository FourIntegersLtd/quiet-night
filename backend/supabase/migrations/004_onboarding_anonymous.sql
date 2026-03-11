-- Support saving onboarding for users who have not yet created an account (user research).
-- Run after 003_onboarding_table.sql.
-- Adds anonymous_id and id PK; user_id becomes nullable so we can insert before account exists.

-- New primary key column
ALTER TABLE public.onboarding ADD COLUMN IF NOT EXISTS id uuid NOT NULL DEFAULT gen_random_uuid();

-- Drop existing primary key (user_id)
ALTER TABLE public.onboarding DROP CONSTRAINT IF EXISTS onboarding_pkey;

-- Set new primary key
ALTER TABLE public.onboarding ADD PRIMARY KEY (id);

-- Allow rows without user_id (anonymous submissions)
ALTER TABLE public.onboarding ALTER COLUMN user_id DROP NOT NULL;

-- Client-generated id for anonymous submissions; used to link row when user signs up
ALTER TABLE public.onboarding ADD COLUMN IF NOT EXISTS anonymous_id text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_onboarding_anonymous_id ON public.onboarding(anonymous_id) WHERE anonymous_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_onboarding_user_id_unique ON public.onboarding(user_id) WHERE user_id IS NOT NULL;

COMMENT ON COLUMN public.onboarding.anonymous_id IS 'Client-generated id before account creation; sent with PATCH /me to link row to user_id.';
