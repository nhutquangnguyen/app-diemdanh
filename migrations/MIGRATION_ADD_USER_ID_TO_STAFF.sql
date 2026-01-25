-- Complete migration to add user_id to staff table
-- Run this script in your Supabase SQL Editor

-- ============================================================================
-- STEP 1: Create the get_user_by_email function
-- ============================================================================
CREATE OR REPLACE FUNCTION get_user_by_email(email_input text)
RETURNS TABLE (
  id uuid,
  email text,
  full_name text,
  phone text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    au.id,
    au.email::text,
    au.raw_user_meta_data->>'full_name' as full_name,
    au.raw_user_meta_data->>'phone' as phone
  FROM auth.users au
  WHERE LOWER(au.email) = LOWER(email_input);
END;
$$;

GRANT EXECUTE ON FUNCTION get_user_by_email(text) TO authenticated;

-- ============================================================================
-- STEP 2: Delete duplicate staff records (keep oldest)
-- ============================================================================
WITH duplicates AS (
  SELECT
    id,
    email,
    store_id,
    ROW_NUMBER() OVER (
      PARTITION BY email, store_id
      ORDER BY created_at ASC
    ) as row_num
  FROM staff
)
DELETE FROM staff
WHERE id IN (
  SELECT id
  FROM duplicates
  WHERE row_num > 1
);

-- ============================================================================
-- STEP 3: Add user_id column to staff table
-- ============================================================================
ALTER TABLE staff
ADD COLUMN IF NOT EXISTS user_id uuid;

-- ============================================================================
-- STEP 4: Populate user_id for existing staff records
-- ============================================================================
UPDATE staff
SET user_id = au.id
FROM auth.users au
WHERE staff.email = au.email
AND staff.user_id IS NULL;

-- ============================================================================
-- STEP 5: Add foreign key constraint
-- ============================================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'staff_user_id_fkey'
    ) THEN
        ALTER TABLE staff
        ADD CONSTRAINT staff_user_id_fkey
        FOREIGN KEY (user_id)
        REFERENCES auth.users(id)
        ON DELETE CASCADE;
    END IF;
END $$;

-- ============================================================================
-- STEP 6: Add unique constraint on (email, store_id)
-- ============================================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'staff_email_store_unique'
    ) THEN
        ALTER TABLE staff
        ADD CONSTRAINT staff_email_store_unique
        UNIQUE (email, store_id);
    END IF;
END $$;

-- ============================================================================
-- STEP 7: Add unique constraint on (user_id, store_id)
-- This prevents the same user from being added twice to the same store
-- ============================================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'staff_user_store_unique'
    ) THEN
        ALTER TABLE staff
        ADD CONSTRAINT staff_user_store_unique
        UNIQUE (user_id, store_id);
    END IF;
END $$;

-- ============================================================================
-- VERIFICATION: Check the results
-- ============================================================================

-- Check for any staff records without user_id
SELECT
  'Staff without user_id' as check_type,
  COUNT(*) as count
FROM staff
WHERE user_id IS NULL;

-- Check for any remaining duplicates
SELECT
  'Duplicate staff records' as check_type,
  COUNT(*) as count
FROM (
  SELECT email, store_id, COUNT(*)
  FROM staff
  GROUP BY email, store_id
  HAVING COUNT(*) > 1
) duplicates;

-- Show all staff with their user info
SELECT
  s.id as staff_id,
  s.email,
  s.user_id,
  s.full_name,
  s.phone,
  au.email as user_email,
  CASE
    WHEN s.user_id IS NULL THEN '⚠️ NO USER'
    WHEN s.email != au.email THEN '⚠️ EMAIL MISMATCH'
    ELSE '✅ OK'
  END as status
FROM staff s
LEFT JOIN auth.users au ON s.user_id = au.id
ORDER BY status DESC, s.email;
