-- Add weight and height to profiles for BMI (body section in app).
-- Run in Supabase SQL Editor after 001_quietnight_tables.sql.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS weight_kg real,
  ADD COLUMN IF NOT EXISTS height_cm real;

COMMENT ON COLUMN public.profiles.weight_kg IS 'User weight in kg (for BMI).';
COMMENT ON COLUMN public.profiles.height_cm IS 'User height in cm (for BMI).';
