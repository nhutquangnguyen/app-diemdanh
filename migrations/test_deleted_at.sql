-- Test: Can we add deleted_at to stores?
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'stores'
    AND column_name = 'deleted_at'
  ) THEN
    RAISE NOTICE 'Adding deleted_at to stores';
    ALTER TABLE public.stores ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;
  ELSE
    RAISE NOTICE 'deleted_at already exists on stores';
  END IF;
END $$;

-- Test: Can we add deleted_at to students?
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'students'
    AND column_name = 'deleted_at'
  ) THEN
    RAISE NOTICE 'Adding deleted_at to students';
    ALTER TABLE public.students ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;
  ELSE
    RAISE NOTICE 'deleted_at already exists on students';
  END IF;
END $$;

-- Verify the columns exist
SELECT
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('stores', 'students')
  AND column_name = 'deleted_at';
