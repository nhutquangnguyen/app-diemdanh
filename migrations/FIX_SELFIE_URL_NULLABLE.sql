-- ================================================================
-- MAKE SELFIE_URL NULLABLE IN CHECK_INS TABLE
-- Run this in Supabase SQL Editor
-- ================================================================

-- Allow selfie_url to be NULL (for when selfie is not required)
ALTER TABLE public.check_ins
ALTER COLUMN selfie_url DROP NOT NULL;

-- Verify the change
SELECT column_name, is_nullable, data_type
FROM information_schema.columns
WHERE table_name = 'check_ins' AND column_name = 'selfie_url';
