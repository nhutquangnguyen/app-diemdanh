-- Migration: Add name field to staff table
-- This adds a custom name field for staff members

ALTER TABLE staff
ADD COLUMN IF NOT EXISTS name VARCHAR(255);

COMMENT ON COLUMN staff.name IS 'Custom memorable name for staff (optional, separate from full_name)';
