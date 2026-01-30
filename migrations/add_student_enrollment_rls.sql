-- Add RLS policy to allow students to enroll themselves
-- This enables the self-enrollment feature

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Students can enroll themselves" ON students;

-- Create policy to allow users to INSERT their own enrollment with pending status
CREATE POLICY "Students can enroll themselves"
ON students
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND status = 'pending'
);

-- Also ensure students can read their own records
DROP POLICY IF EXISTS "Students can view their own record" ON students;

CREATE POLICY "Students can view their own record"
ON students
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);
