-- ================================================================
-- ADD LOCATION AND SELFIE FIELDS TO ATTENDANCE_RECORDS
-- Run this in Supabase SQL Editor after running add_education_workspace.sql
-- ================================================================

-- Add GPS location and selfie fields to attendance_records table
-- These fields enable geofencing and photo verification for student check-ins

ALTER TABLE public.attendance_records
ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8),
ADD COLUMN IF NOT EXISTS distance_meters DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS selfie_url TEXT;

-- Add comments to explain fields
COMMENT ON COLUMN public.attendance_records.latitude IS 'Student GPS latitude when checking in (if gps_required)';
COMMENT ON COLUMN public.attendance_records.longitude IS 'Student GPS longitude when checking in (if gps_required)';
COMMENT ON COLUMN public.attendance_records.distance_meters IS 'Distance from classroom location in meters';
COMMENT ON COLUMN public.attendance_records.selfie_url IS 'URL to student selfie photo (if selfie_required)';

-- Create index for location queries (optional but recommended)
CREATE INDEX IF NOT EXISTS idx_attendance_has_location
ON public.attendance_records(class_id, attendance_date)
WHERE latitude IS NOT NULL;

-- Verify the changes
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'attendance_records'
AND column_name IN ('latitude', 'longitude', 'distance_meters', 'selfie_url')
ORDER BY column_name;

-- Show sample attendance record structure
SELECT
  id,
  student_id,
  attendance_date,
  status,
  check_in_time,
  latitude,
  longitude,
  distance_meters,
  selfie_url,
  marked_by
FROM public.attendance_records
LIMIT 1;
