-- Migration: Add penalty and overtime enable/disable toggles to stores table
-- Date: 2026-01-22
-- Description: Add boolean fields to control whether penalties and overtime are applied

-- Add late penalty toggle (default to true to maintain existing behavior)
ALTER TABLE stores
ADD COLUMN IF NOT EXISTS late_penalty_enabled BOOLEAN DEFAULT TRUE;

-- Add early checkout penalty toggle (default to true to maintain existing behavior)
ALTER TABLE stores
ADD COLUMN IF NOT EXISTS early_checkout_penalty_enabled BOOLEAN DEFAULT TRUE;

-- Add overtime toggle (default to true to maintain existing behavior)
ALTER TABLE stores
ADD COLUMN IF NOT EXISTS overtime_enabled BOOLEAN DEFAULT TRUE;

-- Add comments for documentation
COMMENT ON COLUMN stores.late_penalty_enabled IS 'Enable or disable late check-in penalties';
COMMENT ON COLUMN stores.early_checkout_penalty_enabled IS 'Enable or disable early checkout penalties';
COMMENT ON COLUMN stores.overtime_enabled IS 'Enable or disable overtime pay';
