-- Add RLS policies to allow staff members to manage their own availability
-- + Emergency override for owners
-- Run this in Supabase SQL Editor

-- Step 1: Add tracking columns to staff_availability table
ALTER TABLE staff_availability
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS modified_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS is_owner_override BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS override_reason TEXT;

-- Add comments
COMMENT ON COLUMN staff_availability.created_by IS 'User who created this availability record';
COMMENT ON COLUMN staff_availability.modified_by IS 'User who last modified this record';
COMMENT ON COLUMN staff_availability.is_owner_override IS 'True if owner overrode staff availability';
COMMENT ON COLUMN staff_availability.override_reason IS 'Reason for owner override (required if is_owner_override = true)';

-- Step 2: Drop existing policies if they exist
DROP POLICY IF EXISTS "Staff can view their own availability" ON staff_availability;
DROP POLICY IF EXISTS "Staff can insert their own availability" ON staff_availability;
DROP POLICY IF EXISTS "Staff can update their own availability" ON staff_availability;
DROP POLICY IF EXISTS "Staff can delete their own availability" ON staff_availability;
DROP POLICY IF EXISTS "Owners can override staff availability insert" ON staff_availability;
DROP POLICY IF EXISTS "Owners can update overridden availability" ON staff_availability;
DROP POLICY IF EXISTS "Owners can delete overridden availability" ON staff_availability;

-- Step 3: Add RLS policies for staff

-- Staff can view their own availability
CREATE POLICY "Staff can view their own availability"
  ON staff_availability FOR SELECT
  USING (
    staff_id IN (
      SELECT id FROM staff WHERE user_id = auth.uid()
    )
  );

-- Staff can insert their own availability (not as override)
CREATE POLICY "Staff can insert their own availability"
  ON staff_availability FOR INSERT
  WITH CHECK (
    staff_id IN (
      SELECT id FROM staff WHERE user_id = auth.uid()
    )
    AND (is_owner_override IS NULL OR is_owner_override = false)
  );

-- Staff can update their own availability (not overridden by owner)
CREATE POLICY "Staff can update their own availability"
  ON staff_availability FOR UPDATE
  USING (
    staff_id IN (
      SELECT id FROM staff WHERE user_id = auth.uid()
    )
    AND (is_owner_override IS NULL OR is_owner_override = false)
  );

-- Staff can delete their own availability (not overridden by owner)
CREATE POLICY "Staff can delete their own availability"
  ON staff_availability FOR DELETE
  USING (
    staff_id IN (
      SELECT id FROM staff WHERE user_id = auth.uid()
    )
    AND (is_owner_override IS NULL OR is_owner_override = false)
  );

-- Step 4: Add RLS policies for owner override

-- Owners can insert availability with override flag
CREATE POLICY "Owners can override staff availability insert"
  ON staff_availability FOR INSERT
  WITH CHECK (
    store_id IN (
      SELECT id FROM stores WHERE owner_id = auth.uid()
    )
    AND is_owner_override = true
    AND override_reason IS NOT NULL
    AND override_reason != ''
  );

-- Owners can update overridden availability
CREATE POLICY "Owners can update overridden availability"
  ON staff_availability FOR UPDATE
  USING (
    store_id IN (
      SELECT id FROM stores WHERE owner_id = auth.uid()
    )
    AND is_owner_override = true
  );

-- Owners can delete overridden availability
CREATE POLICY "Owners can delete overridden availability"
  ON staff_availability FOR DELETE
  USING (
    store_id IN (
      SELECT id FROM stores WHERE owner_id = auth.uid()
    )
    AND is_owner_override = true
  );
