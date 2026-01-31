-- Fix class_sessions table by adding missing columns

-- Add missing columns
ALTER TABLE public.class_sessions
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS subject TEXT,
  ADD COLUMN IF NOT EXISTS grace_period_minutes INTEGER DEFAULT 15,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Add constraints if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'valid_grace_period'
    AND conrelid = 'public.class_sessions'::regclass
  ) THEN
    ALTER TABLE public.class_sessions
      ADD CONSTRAINT valid_grace_period CHECK (grace_period_minutes >= 0);
  END IF;
END $$;

-- Verify the columns were added
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'class_sessions'
  AND column_name IN ('description', 'subject', 'grace_period_minutes', 'deleted_at')
ORDER BY column_name;
