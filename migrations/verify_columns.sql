-- Verify deleted_at columns exist
SELECT
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('stores', 'students', 'staff', 'shift_templates')
  AND column_name = 'deleted_at'
ORDER BY table_name;
