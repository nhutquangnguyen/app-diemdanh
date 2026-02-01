-- Fix: Add missing updated_at column to attendance_records table
-- This column is required by the trigger_update_attendance_records_updated_at trigger

-- Add updated_at column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'attendance_records'
    AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE public.attendance_records
    ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

    RAISE NOTICE 'Added updated_at column to attendance_records table';
  ELSE
    RAISE NOTICE 'updated_at column already exists in attendance_records table';
  END IF;
END $$;

-- Ensure the trigger exists
CREATE OR REPLACE FUNCTION update_attendance_records_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop and recreate trigger to ensure it's current
DROP TRIGGER IF EXISTS trigger_update_attendance_records_updated_at ON public.attendance_records;

CREATE TRIGGER trigger_update_attendance_records_updated_at
  BEFORE UPDATE ON public.attendance_records
  FOR EACH ROW
  EXECUTE FUNCTION update_attendance_records_updated_at();

-- Verify the change
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'attendance_records'
  AND column_name = 'updated_at';
