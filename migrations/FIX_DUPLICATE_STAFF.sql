-- Fix duplicate staff entries
-- This script will:
-- 1. Delete duplicate staff records (keeping only the oldest one)
-- 2. Add a unique constraint to prevent future duplicates

-- Step 1: Find and delete duplicates, keeping only the oldest record for each email+store_id
WITH duplicates AS (
  SELECT
    id,
    email,
    store_id,
    ROW_NUMBER() OVER (
      PARTITION BY email, store_id
      ORDER BY created_at ASC  -- Keep the oldest record
    ) as row_num
  FROM staff
)
DELETE FROM staff
WHERE id IN (
  SELECT id
  FROM duplicates
  WHERE row_num > 1  -- Delete all but the first (oldest) record
);

-- Step 2: Add unique constraint to prevent future duplicates
-- This ensures that (email, store_id) combination is unique
ALTER TABLE staff
ADD CONSTRAINT staff_email_store_unique
UNIQUE (email, store_id);

-- Step 3: Verify the fix
SELECT
  email,
  store_id,
  COUNT(*) as count
FROM staff
GROUP BY email, store_id
HAVING COUNT(*) > 1;
-- Should return 0 rows if successful
