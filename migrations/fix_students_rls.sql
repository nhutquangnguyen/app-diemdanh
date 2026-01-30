-- ================================================================
-- FIX STUDENTS TABLE RLS POLICIES
-- Run this if you're getting RLS errors when adding students
-- ================================================================

-- First, verify the current policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'students'
ORDER BY policyname;

-- Drop existing policies and recreate them
DROP POLICY IF EXISTS "Teachers can insert students in their classes" ON students;
DROP POLICY IF EXISTS "Teachers can view students in their classes" ON students;
DROP POLICY IF EXISTS "Teachers can update students in their classes" ON students;
DROP POLICY IF EXISTS "Teachers can delete students from their classes" ON students;
DROP POLICY IF EXISTS "Students can view their own profile" ON students;

-- Recreate policies with corrected logic

-- Teachers can view students in their classes
CREATE POLICY "Teachers can view students in their classes"
  ON students FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM stores
      WHERE stores.id = students.class_id
      AND stores.owner_id = auth.uid()
      AND stores.workspace_type = 'education'
    )
  );

-- Teachers can insert students in their classes
CREATE POLICY "Teachers can insert students in their classes"
  ON students FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM stores
      WHERE stores.id = class_id
      AND stores.owner_id = auth.uid()
      AND stores.workspace_type = 'education'
    )
  );

-- Teachers can update students in their classes
CREATE POLICY "Teachers can update students in their classes"
  ON students FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM stores
      WHERE stores.id = students.class_id
      AND stores.owner_id = auth.uid()
      AND stores.workspace_type = 'education'
    )
  );

-- Teachers can delete students from their classes
CREATE POLICY "Teachers can delete students from their classes"
  ON students FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM stores
      WHERE stores.id = students.class_id
      AND stores.owner_id = auth.uid()
      AND stores.workspace_type = 'education'
    )
  );

-- Students can view themselves
CREATE POLICY "Students can view their own profile"
  ON students FOR SELECT
  USING (user_id = auth.uid());

-- Verify policies were created
SELECT
  policyname,
  cmd as operation,
  CASE WHEN qual IS NOT NULL THEN 'Yes' ELSE 'No' END as has_using,
  CASE WHEN with_check IS NOT NULL THEN 'Yes' ELSE 'No' END as has_check
FROM pg_policies
WHERE tablename = 'students'
ORDER BY policyname;

-- Test query to debug (run as the teacher user)
-- This will show if the subquery works
SELECT
  auth.uid() as current_user_id,
  s.id as store_id,
  s.owner_id as store_owner_id,
  s.workspace_type,
  CASE WHEN s.owner_id = auth.uid() THEN 'MATCH' ELSE 'NO MATCH' END as ownership_check
FROM stores s
WHERE s.workspace_type = 'education'
AND s.deleted_at IS NULL
LIMIT 5;
