-- Add access mode and enrollment capacity to stores table
-- This enables teachers to control how students can join their classes

-- First, drop the old check constraint if it exists
ALTER TABLE stores
DROP CONSTRAINT IF EXISTS stores_access_mode_check;

-- Add access_mode column if it doesn't exist (no constraint yet)
ALTER TABLE stores
ADD COLUMN IF NOT EXISTS access_mode TEXT;

-- Update the check constraint to support both business and education modes
ALTER TABLE stores
ADD CONSTRAINT stores_access_mode_check
CHECK (access_mode IN ('staff_only', 'anyone', 'roster_only', 'open_enrollment'));

-- Set default values for existing rows based on workspace type
UPDATE stores
SET access_mode = CASE
  WHEN workspace_type = 'education' THEN 'roster_only'
  WHEN workspace_type = 'business' THEN 'staff_only'
  ELSE 'roster_only'
END
WHERE access_mode IS NULL;

-- Add enrollment_capacity to limit class size
ALTER TABLE stores
ADD COLUMN IF NOT EXISTS enrollment_capacity INTEGER;

-- Add auto_close_when_full option
ALTER TABLE stores
ADD COLUMN IF NOT EXISTS auto_close_when_full BOOLEAN DEFAULT false;

-- Update students table status to support pending and rejected
-- Note: The students table should already have a status column
-- We're just documenting the new valid values: 'active', 'inactive', 'pending', 'rejected'

-- Create index for faster queries on pending students
CREATE INDEX IF NOT EXISTS idx_students_status_class
ON students(class_id, status)
WHERE status = 'pending';

-- Add comment to document the feature
COMMENT ON COLUMN stores.access_mode IS 'Controls access: For business (staff_only, anyone), For education (roster_only, open_enrollment)';
COMMENT ON COLUMN stores.enrollment_capacity IS 'Maximum number of students allowed in class (education only). NULL means unlimited.';
COMMENT ON COLUMN stores.auto_close_when_full IS 'Automatically switch to roster_only when enrollment_capacity is reached (education only)';
