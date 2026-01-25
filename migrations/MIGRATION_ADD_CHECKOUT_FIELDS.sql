-- Migration to add check-out fields to check_ins table
-- Run this script in your Supabase SQL Editor

-- ============================================================================
-- STEP 1: Add check-out fields to check_ins table
-- ============================================================================
ALTER TABLE check_ins
ADD COLUMN IF NOT EXISTS check_out_time TIMESTAMP,
ADD COLUMN IF NOT EXISTS check_out_latitude DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS check_out_longitude DECIMAL(11, 8),
ADD COLUMN IF NOT EXISTS check_out_distance_meters DECIMAL(10, 2);

-- ============================================================================
-- VERIFICATION: Check the results
-- ============================================================================

-- Show all columns in check_ins table
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'check_ins'
ORDER BY ordinal_position;

-- Check for any check-ins with check-out data
SELECT
  'Check-ins with check-out' as check_type,
  COUNT(*) as count
FROM check_ins
WHERE check_out_time IS NOT NULL;

-- Check for active check-ins (no check-out)
SELECT
  'Active check-ins (no check-out)' as check_type,
  COUNT(*) as count
FROM check_ins
WHERE check_out_time IS NULL;
