-- Add check-out columns to check_ins table
-- This enables tracking both check-in and check-out times with the latest check-out

-- Add check-out time column
ALTER TABLE public.check_ins
ADD COLUMN IF NOT EXISTS check_out_time TIMESTAMP WITH TIME ZONE;

-- Add check-out selfie URL
ALTER TABLE public.check_ins
ADD COLUMN IF NOT EXISTS check_out_selfie_url TEXT;

-- Add check-out GPS coordinates
ALTER TABLE public.check_ins
ADD COLUMN IF NOT EXISTS check_out_latitude DECIMAL(10, 8);

ALTER TABLE public.check_ins
ADD COLUMN IF NOT EXISTS check_out_longitude DECIMAL(11, 8);

-- Add check-out distance from store
ALTER TABLE public.check_ins
ADD COLUMN IF NOT EXISTS check_out_distance_meters DECIMAL(10, 2);

-- Add duration in minutes (auto-calculated)
ALTER TABLE public.check_ins
ADD COLUMN IF NOT EXISTS duration_minutes INTEGER;

-- Add comments/notes
ALTER TABLE public.check_ins
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Update status values to be more descriptive
-- 'checked_in' = Only checked in, not checked out yet
-- 'checked_out' = Both checked in and checked out (completed)
-- 'success' = Legacy value, treat as 'checked_in'

-- Add index for faster queries by date
CREATE INDEX IF NOT EXISTS idx_check_ins_date
ON public.check_ins (DATE(check_in_time));

-- Add unique constraint to prevent duplicate check-ins on same day
-- (One staff can only have one check-in record per store per day)
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_checkin_per_day
ON public.check_ins (staff_id, store_id, DATE(check_in_time));

COMMENT ON COLUMN public.check_ins.check_out_time IS 'Latest check-out time for the day';
COMMENT ON COLUMN public.check_ins.duration_minutes IS 'Total time in minutes (check_out_time - check_in_time)';
COMMENT ON COLUMN public.check_ins.status IS 'checked_in = only in, checked_out = completed, success = legacy';
