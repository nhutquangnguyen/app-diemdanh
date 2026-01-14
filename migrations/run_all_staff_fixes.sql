-- ==============================================================================
-- CONSOLIDATED MIGRATION: Staff Invitation System + Display Name + Status Sync
-- ==============================================================================
-- Run this in Supabase SQL Editor to fix all staff-related issues
-- This will:
-- 1. Add invitation system columns
-- 2. Add display_name with auto-update trigger
-- 3. Sync old is_active column with new status column
-- 4. Fix invited staff who have created accounts
-- ==============================================================================

-- ==============================================================================
-- STEP 1: Add Staff Invitation System
-- ==============================================================================

-- Add new columns for invitation system
ALTER TABLE public.staff
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active',
ADD COLUMN IF NOT EXISTS invited_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS invitation_token VARCHAR(255) UNIQUE,
ADD COLUMN IF NOT EXISTS invitation_expires_at TIMESTAMP WITH TIME ZONE;

-- Make user_id and full_name nullable for invited users
ALTER TABLE public.staff ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.staff ALTER COLUMN full_name DROP NOT NULL;

-- Add comments
COMMENT ON COLUMN public.staff.status IS 'Status: active, invited, expired, inactive';
COMMENT ON COLUMN public.staff.invitation_token IS 'Unique token for invitation link';
COMMENT ON COLUMN public.staff.invitation_expires_at IS 'Invitation expires after 7 days';

-- ==============================================================================
-- STEP 2: Add display_name Column with Auto-Update Trigger
-- ==============================================================================

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
  BEFORE INSERT OR UPDATE OF name, full_name, email, status
  ON public.staff
  FOR EACH ROW
  EXECUTE FUNCTION update_staff_display_name();

-- Add comment
COMMENT ON COLUMN public.staff.display_name IS 'Auto-computed display name: name > full_name > email';

-- ==============================================================================
-- STEP 3: Sync Status with is_active
-- ==============================================================================

-- Update status based on is_active and user_id for existing records
UPDATE public.staff
SET status = CASE
  WHEN user_id IS NOT NULL AND is_active = true THEN 'active'
  WHEN user_id IS NOT NULL AND is_active = false THEN 'inactive'
  WHEN user_id IS NULL AND invitation_token IS NOT NULL THEN 'invited'
  ELSE 'active'
END
WHERE status IS NULL OR status = '';

-- Ensure all existing staff have correct status
UPDATE public.staff
SET status = CASE
  WHEN is_active = false THEN 'inactive'
  WHEN user_id IS NOT NULL THEN 'active'
  WHEN user_id IS NULL THEN 'invited'
  ELSE status
END;

-- ==============================================================================
-- STEP 4: Fix Invited Staff with Accounts
-- ==============================================================================

-- Update any 'invited' staff who now have user accounts to 'active'
UPDATE public.staff
SET
  status = 'active',
  invitation_token = NULL  -- Clear the token since they're now active
WHERE
  status = 'invited'
  AND user_id IS NOT NULL;

-- ==============================================================================
-- VERIFICATION: Show Results
-- ==============================================================================

SELECT
  email,
  display_name,
  is_active,
  status,
  user_id IS NOT NULL as has_account,
  invitation_token IS NOT NULL as has_invitation
FROM public.staff
ORDER BY created_at DESC;
