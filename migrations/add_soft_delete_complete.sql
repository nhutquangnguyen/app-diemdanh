-- Add soft delete support to all missing tables
-- Run this in Supabase SQL Editor
-- This adds deleted_at columns to tables that don't have it yet

-- 1. Add deleted_at to staff table
ALTER TABLE public.staff
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_staff_deleted_at ON public.staff(deleted_at);

COMMENT ON COLUMN public.staff.deleted_at IS 'Timestamp when the staff member was soft deleted. NULL means active.';

-- 2. Add deleted_at to shift_templates table
ALTER TABLE public.shift_templates
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_shift_templates_deleted_at ON public.shift_templates(deleted_at);

COMMENT ON COLUMN public.shift_templates.deleted_at IS 'Timestamp when the shift template was soft deleted. NULL means active.';

-- 3. Add deleted_at to students table (for future use)
ALTER TABLE public.students
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_students_deleted_at ON public.students(deleted_at);

COMMENT ON COLUMN public.students.deleted_at IS 'Timestamp when the student was soft deleted. NULL means active.';

-- Verify all tables now have deleted_at
-- You can run this query to check:
-- SELECT
--   table_name,
--   column_name,
--   data_type
-- FROM information_schema.columns
-- WHERE column_name = 'deleted_at'
--   AND table_schema = 'public'
-- ORDER BY table_name;
