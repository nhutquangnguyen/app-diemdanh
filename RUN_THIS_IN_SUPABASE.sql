-- COMPLETE MIGRATION: Run this in your Supabase SQL Editor
-- This includes both the checkout feature columns AND the status constraint fix

-- Step 1: Add check-out columns to check_ins table
ALTER TABLE public.check_ins
ADD COLUMN IF NOT EXISTS check_out_time TIMESTAMP WITH TIME ZONE;

ALTER TABLE public.check_ins
ADD COLUMN IF NOT EXISTS check_out_selfie_url TEXT;

ALTER TABLE public.check_ins
ADD COLUMN IF NOT EXISTS check_out_latitude DECIMAL(10, 8);

ALTER TABLE public.check_ins
ADD COLUMN IF NOT EXISTS check_out_longitude DECIMAL(11, 8);

ALTER TABLE public.check_ins
ADD COLUMN IF NOT EXISTS check_out_distance_meters DECIMAL(10, 2);

ALTER TABLE public.check_ins
ADD COLUMN IF NOT EXISTS duration_minutes INTEGER;

ALTER TABLE public.check_ins
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Step 2: Update status constraint to support new values
ALTER TABLE public.check_ins
DROP CONSTRAINT IF EXISTS check_ins_status_check;

ALTER TABLE public.check_ins
ADD CONSTRAINT check_ins_status_check
CHECK (status IN ('success', 'late', 'wrong_location', 'checked_in', 'checked_out'));

-- Step 3: Add indexes for better performance
-- Simple index on check_in_time for date range queries
CREATE INDEX IF NOT EXISTS idx_check_ins_time
ON public.check_ins (check_in_time);

-- Index on staff_id and store_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_check_ins_staff_store
ON public.check_ins (staff_id, store_id, check_in_time);

-- Step 4: Add comments
COMMENT ON COLUMN public.check_ins.check_out_time IS 'Latest check-out time for the day';
COMMENT ON COLUMN public.check_ins.duration_minutes IS 'Total time in minutes (check_out_time - check_in_time)';
COMMENT ON COLUMN public.check_ins.status IS 'Status values: success (legacy), late (legacy), wrong_location (legacy), checked_in (only in), checked_out (completed)';
