-- Migration: Update Salary Adjustment Types
-- Change from bonus/penalty/overtime/deduction/other to increase/decrease

-- Drop the old check constraint
ALTER TABLE salary_adjustments
DROP CONSTRAINT IF EXISTS salary_adjustments_type_check;

-- Add new check constraint with simplified types
ALTER TABLE salary_adjustments
ADD CONSTRAINT salary_adjustments_type_check
CHECK (type IN ('increase', 'decrease', 'bonus', 'penalty', 'overtime', 'deduction', 'other'));

-- The new constraint allows both old and new types for backward compatibility
-- Old types: bonus, penalty, overtime, deduction, other
-- New types: increase, decrease
