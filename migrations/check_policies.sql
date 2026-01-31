-- Check what RLS policies exist on stores and students tables
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename IN ('stores', 'students')
ORDER BY tablename, policyname;
