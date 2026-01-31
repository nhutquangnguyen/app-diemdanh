-- Check if class_sessions table exists and has deleted_at column
SELECT
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'class_sessions'
ORDER BY ordinal_position;
