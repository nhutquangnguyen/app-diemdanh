-- Add user_id column to staff table and populate it based on email
-- This creates a proper foreign key relationship between staff and auth.users

-- Step 1: Add user_id column (nullable for now)
ALTER TABLE staff
ADD COLUMN user_id uuid;

-- Step 2: Populate user_id by matching emails
-- This updates existing staff records with their corresponding user IDs
UPDATE staff
SET user_id = au.id
FROM auth.users au
WHERE staff.email = au.email;

-- Step 3: Add foreign key constraint
-- This ensures referential integrity between staff and auth.users
ALTER TABLE staff
ADD CONSTRAINT staff_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES auth.users(id)
ON DELETE CASCADE;

-- Step 4: Make user_id NOT NULL for future records
-- We keep it nullable for backwards compatibility with existing records
-- that might not have matching users
-- (You can uncomment this if you want to enforce it strictly)
-- ALTER TABLE staff
-- ALTER COLUMN user_id SET NOT NULL;

-- Step 5: Add unique constraint on (email, store_id) if not exists
-- This prevents duplicate staff entries
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

-- Step 6: Verify the update
SELECT
  s.id,
  s.email,
  s.user_id,
  au.email as user_email,
  CASE
    WHEN s.user_id IS NULL THEN 'NO USER MATCH'
    ELSE 'OK'
  END as status
FROM staff s
LEFT JOIN auth.users au ON s.user_id = au.id
ORDER BY status DESC, s.email;
