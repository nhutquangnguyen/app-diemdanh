-- Migration: Add Salary System
-- This adds support for salary calculations with adjustments

-- 1. Add salary calculation settings to stores table
ALTER TABLE stores
ADD COLUMN IF NOT EXISTS late_penalty_rate DECIMAL(3,2) DEFAULT 1.0,
ADD COLUMN IF NOT EXISTS early_checkout_penalty_rate DECIMAL(3,2) DEFAULT 1.0,
ADD COLUMN IF NOT EXISTS overtime_multiplier DECIMAL(3,2) DEFAULT 1.5,
ADD COLUMN IF NOT EXISTS overtime_grace_minutes INTEGER DEFAULT 15;

COMMENT ON COLUMN stores.late_penalty_rate IS 'Multiplier for late penalty (1.0 = same as hourly rate)';
COMMENT ON COLUMN stores.early_checkout_penalty_rate IS 'Multiplier for early checkout penalty';
COMMENT ON COLUMN stores.overtime_multiplier IS 'Multiplier for overtime pay (1.5 = time and a half)';
COMMENT ON COLUMN stores.overtime_grace_minutes IS 'Minutes of grace period before counting overtime';

-- 2. Create salary_adjustments table
CREATE TABLE IF NOT EXISTS salary_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  adjustment_date DATE NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('bonus', 'penalty', 'overtime', 'deduction', 'other')),
  amount DECIMAL(12,2) NOT NULL,
  calculation_base VARCHAR(20) DEFAULT 'fixed' CHECK (calculation_base IN ('hours', 'fixed', 'percentage')),
  hours DECIMAL(5,2),
  note TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_salary_adjustments_staff_id ON salary_adjustments(staff_id);
CREATE INDEX IF NOT EXISTS idx_salary_adjustments_store_id ON salary_adjustments(store_id);
CREATE INDEX IF NOT EXISTS idx_salary_adjustments_date ON salary_adjustments(adjustment_date);
CREATE INDEX IF NOT EXISTS idx_salary_adjustments_staff_date ON salary_adjustments(staff_id, adjustment_date);

-- 3. Create salary_confirmations table (optional - for tracking payment status)
CREATE TABLE IF NOT EXISTS salary_confirmations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  month VARCHAR(7) NOT NULL, -- Format: YYYY-MM
  provisional_amount DECIMAL(12,2) NOT NULL,
  adjustments_amount DECIMAL(12,2) DEFAULT 0,
  final_amount DECIMAL(12,2) NOT NULL,
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'confirmed', 'paid')),
  confirmed_at TIMESTAMP WITH TIME ZONE,
  paid_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(staff_id, store_id, month)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_salary_confirmations_staff_id ON salary_confirmations(staff_id);
CREATE INDEX IF NOT EXISTS idx_salary_confirmations_store_id ON salary_confirmations(store_id);
CREATE INDEX IF NOT EXISTS idx_salary_confirmations_month ON salary_confirmations(month);
CREATE INDEX IF NOT EXISTS idx_salary_confirmations_status ON salary_confirmations(status);

-- 4. Enable RLS (Row Level Security)
ALTER TABLE salary_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE salary_confirmations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for salary_adjustments
CREATE POLICY "Store owners can view their salary adjustments"
  ON salary_adjustments FOR SELECT
  USING (
    store_id IN (
      SELECT id FROM stores WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Store owners can insert salary adjustments"
  ON salary_adjustments FOR INSERT
  WITH CHECK (
    store_id IN (
      SELECT id FROM stores WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Store owners can update their salary adjustments"
  ON salary_adjustments FOR UPDATE
  USING (
    store_id IN (
      SELECT id FROM stores WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Store owners can delete their salary adjustments"
  ON salary_adjustments FOR DELETE
  USING (
    store_id IN (
      SELECT id FROM stores WHERE owner_id = auth.uid()
    )
  );

-- RLS Policies for salary_confirmations
CREATE POLICY "Store owners can view their salary confirmations"
  ON salary_confirmations FOR SELECT
  USING (
    store_id IN (
      SELECT id FROM stores WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Store owners can manage salary confirmations"
  ON salary_confirmations FOR ALL
  USING (
    store_id IN (
      SELECT id FROM stores WHERE owner_id = auth.uid()
    )
  );

-- 5. Add updated_at trigger for salary_adjustments
CREATE OR REPLACE FUNCTION update_salary_adjustments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_salary_adjustments_updated_at
  BEFORE UPDATE ON salary_adjustments
  FOR EACH ROW
  EXECUTE FUNCTION update_salary_adjustments_updated_at();

-- 6. Add updated_at trigger for salary_confirmations
CREATE OR REPLACE FUNCTION update_salary_confirmations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_salary_confirmations_updated_at
  BEFORE UPDATE ON salary_confirmations
  FOR EACH ROW
  EXECUTE FUNCTION update_salary_confirmations_updated_at();
