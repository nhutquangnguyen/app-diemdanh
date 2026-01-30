-- ================================================================
-- FIX STORES RLS TO ALLOW STUDENTS POLICY CHECKS
-- The student INSERT policy needs to read from stores table
-- This ensures stores table RLS allows that
-- ================================================================

-- Check current stores policies
SELECT policyname, cmd, permissive
FROM pg_policies
WHERE tablename = 'stores'
ORDER BY policyname;

-- Ensure owners can always read their own stores
-- This is needed for the students INSERT policy subquery to work
DROP POLICY IF EXISTS "Owners can view their stores" ON stores;

CREATE POLICY "Owners can view their stores"
  ON stores FOR SELECT
  USING (owner_id = auth.uid());

-- Verify
SELECT policyname, cmd
FROM pg_policies
WHERE tablename = 'stores'
AND policyname = 'Owners can view their stores';

-- Done
SELECT 'Stores RLS policy created/updated to allow policy subqueries' as status;
