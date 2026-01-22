-- Migration: Add multiple salary types to staff table
-- Date: 2026-01-22
-- Description: Add salary_type, monthly_rate, and daily_rate fields to support different payment methods

-- Add salary_type column (default to 'hourly' for existing staff)
ALTER TABLE staff
ADD COLUMN IF NOT EXISTS salary_type TEXT DEFAULT 'hourly'
CHECK (salary_type IN ('hourly', 'monthly', 'daily'));

-- Add monthly_rate column
ALTER TABLE staff
ADD COLUMN IF NOT EXISTS monthly_rate NUMERIC(12, 2);

-- Add daily_rate column
ALTER TABLE staff
ADD COLUMN IF NOT EXISTS daily_rate NUMERIC(12, 2);

-- Update existing staff to have hourly salary type
UPDATE staff
SET salary_type = 'hourly'
WHERE salary_type IS NULL;

-- Make salary_type NOT NULL after setting defaults
ALTER TABLE staff
ALTER COLUMN salary_type SET NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN staff.salary_type IS 'Type of salary calculation: hourly, monthly, or daily';
COMMENT ON COLUMN staff.hour_rate IS 'Hourly rate in VND (used when salary_type = hourly)';
COMMENT ON COLUMN staff.monthly_rate IS 'Monthly salary in VND (used when salary_type = monthly)';
COMMENT ON COLUMN staff.daily_rate IS 'Daily rate in VND (used when salary_type = daily)';
