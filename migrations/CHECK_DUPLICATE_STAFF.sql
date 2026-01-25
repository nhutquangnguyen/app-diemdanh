-- Check for duplicate staff entries
-- This will show all staff records grouped by email and store_id
-- If count > 1, there are duplicates

SELECT
  email,
  store_id,
  COUNT(*) as duplicate_count,
  STRING_AGG(id::text, ', ') as record_ids,
  STRING_AGG(created_at::text, ', ') as created_dates
FROM staff
GROUP BY email, store_id
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC;

-- Also show all staff records for stores to see the full picture
SELECT
  s.id,
  s.store_id,
  st.name as store_name,
  s.email,
  s.full_name,
  s.phone,
  s.created_at
FROM staff s
LEFT JOIN stores st ON s.store_id = st.id
ORDER BY s.store_id, s.email, s.created_at;
