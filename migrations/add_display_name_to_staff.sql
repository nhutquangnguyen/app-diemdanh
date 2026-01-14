-- Migration: Add display_name to staff table
-- This simplifies UI code by always having a non-null display name

-- Add display_name column
ALTER TABLE public.staff
ADD COLUMN IF NOT EXISTS display_name TEXT NOT NULL DEFAULT '';

-- Populate display_name for existing records
UPDATE public.staff
SET display_name = COALESCE(name, full_name, email, 'Unknown');

-- Create a function to auto-update display_name and sync status with is_active
CREATE OR REPLACE FUNCTION update_staff_display_name()
RETURNS TRIGGER AS $$
BEGIN
  -- Auto-update display_name
  NEW.display_name := COALESCE(NEW.name, NEW.full_name, NEW.email, 'Unknown');

  -- Sync is_active with status for backward compatibility
  IF NEW.status = 'active' THEN
    NEW.is_active := true;
  ELSIF NEW.status = 'inactive' THEN
    NEW.is_active := false;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update display_name on insert/update
DROP TRIGGER IF EXISTS staff_display_name_trigger ON public.staff;
CREATE TRIGGER staff_display_name_trigger
  BEFORE INSERT OR UPDATE OF name, full_name, email
  ON public.staff
  FOR EACH ROW
  EXECUTE FUNCTION update_staff_display_name();

-- Add comment
COMMENT ON COLUMN public.staff.display_name IS 'Auto-computed display name: name > full_name > email';
