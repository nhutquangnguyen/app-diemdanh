-- Update the status check constraint to support new check-in/check-out flow
-- This allows using 'checked_in' and 'checked_out' status values

-- Drop the old constraint
ALTER TABLE public.check_ins
DROP CONSTRAINT IF EXISTS check_ins_status_check;

-- Add the new constraint with updated status values
ALTER TABLE public.check_ins
ADD CONSTRAINT check_ins_status_check
CHECK (status IN ('success', 'late', 'wrong_location', 'checked_in', 'checked_out'));

-- Add comment explaining the status values
COMMENT ON COLUMN public.check_ins.status IS 'Status values: success (legacy), late (legacy), wrong_location (legacy), checked_in (only checked in), checked_out (completed - both in and out)';
