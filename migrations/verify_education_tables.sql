-- Verify all education tables were created successfully

-- 1. Check tables exist
SELECT
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = 'public' AND t.table_name = table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public'
  AND table_name IN ('class_sessions', 'attendance_records', 'session_schedules')
ORDER BY table_name;

-- 2. Check RLS is enabled
SELECT
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('class_sessions', 'attendance_records', 'session_schedules')
ORDER BY tablename;

-- 3. Check policies exist
SELECT
  tablename,
  COUNT(*) as policy_count,
  string_agg(policyname, ', ' ORDER BY policyname) as policies
FROM pg_policies
WHERE tablename IN ('class_sessions', 'attendance_records', 'session_schedules')
GROUP BY tablename
ORDER BY tablename;

-- 4. Check triggers exist
SELECT
  event_object_table as table_name,
  trigger_name
FROM information_schema.triggers
WHERE event_object_schema = 'public'
  AND event_object_table IN ('class_sessions', 'attendance_records', 'session_schedules')
ORDER BY event_object_table, trigger_name;
