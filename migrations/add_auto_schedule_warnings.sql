-- Add warnings and auto-generation support to schedule_generations table
-- Run this in Supabase SQL Editor

-- Add columns to store warnings and AI metadata
ALTER TABLE schedule_generations
ADD COLUMN IF NOT EXISTS warnings JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS stats JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS is_auto_generated BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS auto_triggered_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS has_been_viewed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS viewed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS resolved_warnings JSONB DEFAULT '[]'::jsonb;

-- Add column to track if owner needs to review
ALTER TABLE schedule_generations
ADD COLUMN IF NOT EXISTS needs_review BOOLEAN DEFAULT false;

-- Comments
COMMENT ON COLUMN schedule_generations.warnings IS 'JSON array of warnings from smart schedule generation';
COMMENT ON COLUMN schedule_generations.stats IS 'JSON object with schedule statistics (total hours, staff distribution, etc)';
COMMENT ON COLUMN schedule_generations.is_auto_generated IS 'True if schedule was auto-generated when all staff submitted availability';
COMMENT ON COLUMN schedule_generations.auto_triggered_at IS 'When the auto-generation was triggered';
COMMENT ON COLUMN schedule_generations.has_been_viewed IS 'Whether owner has viewed this auto-generated schedule';
COMMENT ON COLUMN schedule_generations.viewed_at IS 'When owner first viewed the auto-generated schedule';
COMMENT ON COLUMN schedule_generations.needs_review IS 'Whether owner needs to review this schedule (shows red badge)';
COMMENT ON COLUMN schedule_generations.resolved_warnings IS 'Array of warning indices that owner has resolved/dismissed';

-- Add index for quick lookup of schedules needing review
CREATE INDEX IF NOT EXISTS idx_schedule_generations_needs_review
ON schedule_generations(store_id, needs_review, week_start_date)
WHERE needs_review = true;

-- Add field to staff_availability to track submission order
ALTER TABLE staff_availability
ADD COLUMN IF NOT EXISTS is_owner_override BOOLEAN DEFAULT false;

COMMENT ON COLUMN staff_availability.is_owner_override IS 'True if availability was set by owner, not by staff';

-- Add table to track auto-generation triggers per week (to prevent re-triggering)
CREATE TABLE IF NOT EXISTS auto_schedule_triggers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  week_start_date DATE NOT NULL,
  triggered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  generation_id UUID REFERENCES schedule_generations(id) ON DELETE SET NULL,
  UNIQUE(store_id, week_start_date)
);

CREATE INDEX IF NOT EXISTS idx_auto_schedule_triggers_store_week
ON auto_schedule_triggers(store_id, week_start_date);

COMMENT ON TABLE auto_schedule_triggers IS 'Tracks when auto-schedule was triggered for each week to prevent re-triggering';

-- Enable RLS on auto_schedule_triggers
ALTER TABLE auto_schedule_triggers ENABLE ROW LEVEL SECURITY;

-- RLS Policies for auto_schedule_triggers
-- Allow both owners and staff to view triggers (staff need to check if already triggered)
CREATE POLICY "Users can view triggers for their store"
  ON auto_schedule_triggers FOR SELECT
  USING (
    store_id IN (
      -- Owner can view
      SELECT id FROM stores WHERE owner_id = auth.uid()
      UNION
      -- Staff can view triggers for stores they work at
      SELECT store_id FROM staff WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Allow both owners and staff to insert triggers
-- (Staff need to insert when auto-generation is triggered by their submission)
CREATE POLICY "System can insert triggers"
  ON auto_schedule_triggers FOR INSERT
  WITH CHECK (
    store_id IN (
      -- Owner can insert
      SELECT id FROM stores WHERE owner_id = auth.uid()
      UNION
      -- Staff can insert triggers for stores they work at
      SELECT store_id FROM staff WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Users can update triggers for their store"
  ON auto_schedule_triggers FOR UPDATE
  USING (
    store_id IN (
      SELECT id FROM stores WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete triggers for their store"
  ON auto_schedule_triggers FOR DELETE
  USING (
    store_id IN (
      SELECT id FROM stores WHERE owner_id = auth.uid()
    )
  );

-- Add auto-schedule settings to stores table
ALTER TABLE stores
ADD COLUMN IF NOT EXISTS auto_schedule_enabled BOOLEAN DEFAULT true;

COMMENT ON COLUMN stores.auto_schedule_enabled IS 'Whether to automatically generate schedule when all staff submit availability';
