-- Verify and fix auto-schedule warnings columns
-- Run this in Supabase SQL Editor to ensure all columns exist

-- Check if columns exist and add them if missing
DO $$
BEGIN
    -- Add warnings column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'schedule_generations'
        AND column_name = 'warnings'
    ) THEN
        ALTER TABLE schedule_generations ADD COLUMN warnings JSONB DEFAULT '[]'::jsonb;
    END IF;

    -- Add stats column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'schedule_generations'
        AND column_name = 'stats'
    ) THEN
        ALTER TABLE schedule_generations ADD COLUMN stats JSONB DEFAULT '{}'::jsonb;
    END IF;

    -- Add is_auto_generated column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'schedule_generations'
        AND column_name = 'is_auto_generated'
    ) THEN
        ALTER TABLE schedule_generations ADD COLUMN is_auto_generated BOOLEAN DEFAULT false;
    END IF;

    -- Add auto_triggered_at column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'schedule_generations'
        AND column_name = 'auto_triggered_at'
    ) THEN
        ALTER TABLE schedule_generations ADD COLUMN auto_triggered_at TIMESTAMP WITH TIME ZONE;
    END IF;

    -- Add has_been_viewed column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'schedule_generations'
        AND column_name = 'has_been_viewed'
    ) THEN
        ALTER TABLE schedule_generations ADD COLUMN has_been_viewed BOOLEAN DEFAULT false;
    END IF;

    -- Add viewed_at column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'schedule_generations'
        AND column_name = 'viewed_at'
    ) THEN
        ALTER TABLE schedule_generations ADD COLUMN viewed_at TIMESTAMP WITH TIME ZONE;
    END IF;

    -- Add resolved_warnings column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'schedule_generations'
        AND column_name = 'resolved_warnings'
    ) THEN
        ALTER TABLE schedule_generations ADD COLUMN resolved_warnings JSONB DEFAULT '[]'::jsonb;
    END IF;

    -- Add needs_review column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'schedule_generations'
        AND column_name = 'needs_review'
    ) THEN
        ALTER TABLE schedule_generations ADD COLUMN needs_review BOOLEAN DEFAULT false;
    END IF;

    -- Add auto_schedule_enabled to stores if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'stores'
        AND column_name = 'auto_schedule_enabled'
    ) THEN
        ALTER TABLE stores ADD COLUMN auto_schedule_enabled BOOLEAN DEFAULT true;
    END IF;

    -- Add is_owner_override to staff_availability if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'staff_availability'
        AND column_name = 'is_owner_override'
    ) THEN
        ALTER TABLE staff_availability ADD COLUMN is_owner_override BOOLEAN DEFAULT false;
    END IF;
END $$;

-- Verify columns were added
SELECT
    'schedule_generations' as table_name,
    column_name,
    data_type,
    column_default
FROM information_schema.columns
WHERE table_name = 'schedule_generations'
    AND column_name IN ('warnings', 'stats', 'is_auto_generated', 'auto_triggered_at',
                        'has_been_viewed', 'viewed_at', 'resolved_warnings', 'needs_review')
ORDER BY column_name;
