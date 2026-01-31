-- Check if there are any views involving shift_templates
SELECT
  table_schema,
  table_name,
  view_definition
FROM information_schema.views
WHERE table_schema = 'public'
  AND (
    view_definition LIKE '%shift_templates%'
    OR view_definition LIKE '%class_id%'
  )
ORDER BY table_name;
