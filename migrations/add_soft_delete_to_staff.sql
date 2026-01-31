-- Add soft delete support to staff table
-- Run this in Supabase SQL Editor

-- Add deleted_at column to staff table
ALTER TABLE public.staff
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Add index for better query performance when filtering out deleted staff
CREATE INDEX IF NOT EXISTS idx_staff_deleted_at ON public.staff(deleted_at);

-- Add comment
COMMENT ON COLUMN public.staff.deleted_at IS 'Timestamp when the staff member was soft deleted. NULL means active.';

-- Note: RLS policies should be updated to exclude soft-deleted staff
-- This will depend on your existing policies
