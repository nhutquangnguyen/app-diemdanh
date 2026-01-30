-- ================================================================
-- DEBUG STUDENTS RLS ISSUE
-- Run this to diagnose why student insertion is failing
-- ================================================================

-- 1. Check if RLS is enabled on students table
SELECT
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename = 'students';

-- 2. Check all policies on students table
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd as operation,
  qual as using_clause,
  with_check as with_check_clause
FROM pg_policies
WHERE tablename = 'students'
ORDER BY policyname;

-- 3. Check if stores table has RLS that might block the policy
SELECT
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename = 'stores';

-- 4. Check stores policies (these might affect the subquery in students policy)
SELECT
  policyname,
  cmd as operation,
  permissive
FROM pg_policies
WHERE tablename = 'stores'
ORDER BY policyname;

-- 5. Test the INSERT policy manually (run as the teacher user)
-- This simulates what happens when you try to insert a student
DO $$
DECLARE
  v_class_id UUID;
  v_current_user UUID;
  v_can_insert BOOLEAN;
BEGIN
  -- Get current user
  SELECT auth.uid() INTO v_current_user;
  RAISE NOTICE 'Current user: %', v_current_user;

  -- Get an education class you own
  SELECT id INTO v_class_id
  FROM stores
  WHERE workspace_type = 'education'
  AND owner_id = auth.uid()
  AND deleted_at IS NULL
  LIMIT 1;

  RAISE NOTICE 'Test class ID: %', v_class_id;

  -- Test if the policy condition would pass
  SELECT EXISTS (
    SELECT 1 FROM stores
    WHERE stores.id = v_class_id
    AND stores.owner_id = auth.uid()
    AND stores.workspace_type = 'education'
  ) INTO v_can_insert;

  RAISE NOTICE 'Policy check result: %', v_can_insert;

  IF v_can_insert THEN
    RAISE NOTICE 'SUCCESS: Policy should allow insertion';
  ELSE
    RAISE NOTICE 'FAILED: Policy would block insertion';
  END IF;
END $$;

-- 6. Try to actually insert a test student (this will show the real error)
-- Replace 'YOUR_CLASS_ID_HERE' with your actual class ID
/*
INSERT INTO students (
  class_id,
  full_name,
  email,
  status
) VALUES (
  'YOUR_CLASS_ID_HERE',
  'Test Student',
  'test@example.com',
  'active'
);
*/

-- If the above INSERT fails, uncomment and run this to bypass RLS temporarily for testing:
-- ALTER TABLE students DISABLE ROW LEVEL SECURITY;
-- Then try the insert again
-- Then re-enable: ALTER TABLE students ENABLE ROW LEVEL SECURITY;
