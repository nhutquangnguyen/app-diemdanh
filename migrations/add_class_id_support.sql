-- Add class_id support to tables for education workspaces
-- This allows tables to support both business (store_id) and education (class_id) workspaces

-- 1. Add class_id to shift_templates table
ALTER TABLE public.shift_templates
ADD COLUMN IF NOT EXISTS class_id UUID REFERENCES public.stores(id) ON DELETE CASCADE;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_shift_templates_class_id ON public.shift_templates(class_id);

-- Add comment
COMMENT ON COLUMN public.shift_templates.class_id IS 'Reference to class (stores table) for education workspaces. Mutually exclusive with store_id.';

-- Add constraint to ensure either store_id or class_id is set, but not both
ALTER TABLE public.shift_templates
DROP CONSTRAINT IF EXISTS shift_templates_workspace_check;

ALTER TABLE public.shift_templates
ADD CONSTRAINT shift_templates_workspace_check
CHECK (
  (store_id IS NOT NULL AND class_id IS NULL) OR
  (store_id IS NULL AND class_id IS NOT NULL)
);

-- 2. Add class_id to staff_schedules table (if needed)
ALTER TABLE public.staff_schedules
ADD COLUMN IF NOT EXISTS class_id UUID REFERENCES public.stores(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_staff_schedules_class_id ON public.staff_schedules(class_id);

COMMENT ON COLUMN public.staff_schedules.class_id IS 'Reference to class (stores table) for education workspaces. Mutually exclusive with store_id.';

-- 3. Add class_id to check_ins table
ALTER TABLE public.check_ins
ADD COLUMN IF NOT EXISTS class_id UUID REFERENCES public.stores(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_check_ins_class_id ON public.check_ins(class_id);

COMMENT ON COLUMN public.check_ins.class_id IS 'Reference to class (stores table) for education workspaces. Mutually exclusive with store_id.';

-- 4. Add class_id to staff table (for students enrolled in a class)
ALTER TABLE public.staff
ADD COLUMN IF NOT EXISTS class_id UUID REFERENCES public.stores(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_staff_class_id ON public.staff(class_id);

COMMENT ON COLUMN public.staff.class_id IS 'Reference to class (stores table) for education workspaces where staff acts as students. Mutually exclusive with store_id.';
