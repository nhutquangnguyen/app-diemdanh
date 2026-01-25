-- Migration to add checkout_selfie_url field to check_ins table
-- Run this script in your Supabase SQL Editor

-- ============================================================================
-- STEP 1: Add checkout_selfie_url field to check_ins table
-- ============================================================================
ALTER TABLE check_ins
ADD COLUMN IF NOT EXISTS checkout_selfie_url TEXT;

-- ============================================================================
-- VERIFICATION: Check the results
-- ============================================================================

-- Show all columns in check_ins table
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'check_ins'
ORDER BY ordinal_position;

-- Check for any check-ins with checkout selfie data
SELECT
  'Check-ins with checkout selfie' as check_type,
  COUNT(*) as count
FROM check_ins
WHERE checkout_selfie_url IS NOT NULL;
