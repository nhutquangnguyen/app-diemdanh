-- ================================================================
-- ADD STORE SETTINGS COLUMNS
-- Run this in Supabase SQL Editor
-- ================================================================

-- Add new columns to stores table for check-in settings
ALTER TABLE public.stores
ADD COLUMN IF NOT EXISTS gps_required BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS selfie_required BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS access_mode TEXT DEFAULT 'staff_only' CHECK (access_mode IN ('staff_only', 'anyone'));

-- Add comment to explain columns
COMMENT ON COLUMN public.stores.gps_required IS 'Whether GPS verification is required for check-in';
COMMENT ON COLUMN public.stores.selfie_required IS 'Whether selfie photo is required for check-in';
COMMENT ON COLUMN public.stores.access_mode IS 'Access control: staff_only (only registered staff) or anyone (open check-in)';

-- Update existing stores to have default values
UPDATE public.stores
SET
  gps_required = true,
  selfie_required = true,
  access_mode = 'staff_only'
WHERE gps_required IS NULL;

-- Verify the changes
SELECT id, name, radius_meters, gps_required, selfie_required, access_mode
FROM public.stores
LIMIT 5;
