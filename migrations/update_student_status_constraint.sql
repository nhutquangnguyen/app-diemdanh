-- Update students table status constraint to support pending and rejected statuses
-- This is required for the self-enrollment feature

-- Drop the old check constraint
ALTER TABLE students
DROP CONSTRAINT IF EXISTS students_status_check;

-- Add new check constraint with all status values
ALTER TABLE students
ADD CONSTRAINT students_status_check
CHECK (status IN ('active', 'invited', 'inactive', 'withdrawn', 'pending', 'rejected'));
