-- ==========================================
-- COMPLETE FIX: All Missing Columns
-- ==========================================
-- This migration fixes all the missing column errors:
-- 1. Adds deleted_at for soft delete support
-- 2. Adds class_id for education workspace support
--
-- Run this in Supabase SQL Editor
-- ==========================================

-- ==========================================
-- PART 1: Add soft delete support (deleted_at)
-- ==========================================

-- Add deleted_at to staff table
ALTER TABLE public.staff
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_staff_deleted_at ON public.staff(deleted_at);

COMMENT ON COLUMN public.staff.deleted_at IS 'Timestamp when the staff member was soft deleted. NULL means active.';

-- Add deleted_at to shift_templates table
ALTER TABLE public.shift_templates
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_shift_templates_deleted_at ON public.shift_templates(deleted_at);

COMMENT ON COLUMN public.shift_templates.deleted_at IS 'Timestamp when the shift template was soft deleted. NULL means active.';

-- Add deleted_at to students table
ALTER TABLE public.students
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_students_deleted_at ON public.students(deleted_at);

COMMENT ON COLUMN public.students.deleted_at IS 'Timestamp when the student was soft deleted. NULL means active.';

-- ==========================================
-- PART 2: Add class_id support for education workspaces
-- ==========================================

-- Add class_id to shift_templates table (for class sessions)
ALTER TABLE public.shift_templates
ADD COLUMN IF NOT EXISTS class_id UUID REFERENCES public.stores(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_shift_templates_class_id ON public.shift_templates(class_id);

COMMENT ON COLUMN public.shift_templates.class_id IS 'Reference to class (stores table) for education workspaces. Mutually exclusive with store_id.';

-- Add constraint: either store_id or class_id must be set, but not both
ALTER TABLE public.shift_templates
DROP CONSTRAINT IF EXISTS shift_templates_workspace_check;

ALTER TABLE public.shift_templates
ADD CONSTRAINT shift_templates_workspace_check
CHECK (
  (store_id IS NOT NULL AND class_id IS NULL) OR
  (store_id IS NULL AND class_id IS NOT NULL)
);

-- Add class_id to staff_schedules table (for session schedules)
ALTER TABLE public.staff_schedules
ADD COLUMN IF NOT EXISTS class_id UUID REFERENCES public.stores(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_staff_schedules_class_id ON public.staff_schedules(class_id);

COMMENT ON COLUMN public.staff_schedules.class_id IS 'Reference to class (stores table) for education workspaces. Mutually exclusive with store_id.';

-- Add class_id to check_ins table (for attendance records)
ALTER TABLE public.check_ins
ADD COLUMN IF NOT EXISTS class_id UUID REFERENCES public.stores(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_check_ins_class_id ON public.check_ins(class_id);

COMMENT ON COLUMN public.check_ins.class_id IS 'Reference to class (stores table) for education workspaces. Mutually exclusive with store_id.';

-- Add class_id to staff table (staff can also represent students in education mode)
ALTER TABLE public.staff
ADD COLUMN IF NOT EXISTS class_id UUID REFERENCES public.stores(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_staff_class_id ON public.staff(class_id);

COMMENT ON COLUMN public.staff.class_id IS 'Reference to class (stores table) for education workspaces. Mutually exclusive with store_id.';

-- ==========================================
-- VERIFICATION QUERIES
-- ==========================================

-- Run these queries to verify the migration worked:

-- 1. Check all tables now have deleted_at
-- SELECT
--   table_name,
--   column_name,
--   data_type
-- FROM information_schema.columns
-- WHERE column_name = 'deleted_at'
--   AND table_schema = 'public'
-- ORDER BY table_name;

-- 2. Check all tables now have class_id
-- SELECT
--   table_name,
--   column_name,
--   data_type
-- FROM information_schema.columns
-- WHERE column_name = 'class_id'
--   AND table_schema = 'public'
-- ORDER BY table_name;

-- 3. Verify no records have both store_id and class_id set
-- SELECT 'shift_templates' as table_name, COUNT(*) as violations FROM shift_templates WHERE store_id IS NOT NULL AND class_id IS NOT NULL
-- UNION ALL
-- SELECT 'staff_schedules', COUNT(*) FROM staff_schedules WHERE store_id IS NOT NULL AND class_id IS NOT NULL
-- UNION ALL
-- SELECT 'check_ins', COUNT(*) FROM check_ins WHERE store_id IS NOT NULL AND class_id IS NOT NULL
-- UNION ALL
-- SELECT 'staff', COUNT(*) FROM staff WHERE store_id IS NOT NULL AND class_id IS NOT NULL;
-- All counts should be 0

-- ==========================================
-- DONE! Your database is now ready for:
-- ✅ Soft delete functionality
-- ✅ Both business and education workspaces
-- ==========================================
