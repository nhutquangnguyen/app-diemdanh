-- Add soft delete support to shift_templates table
-- Run this in Supabase SQL Editor

-- Add deleted_at column to shift_templates table
ALTER TABLE public.shift_templates
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_shift_templates_deleted_at ON public.shift_templates(deleted_at);

-- Add comment
COMMENT ON COLUMN public.shift_templates.deleted_at IS 'Timestamp when the shift template was soft deleted. NULL means active.';
