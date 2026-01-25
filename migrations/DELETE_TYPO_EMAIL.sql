-- Delete the staff record with the typo email (vonguyenaimy18102002@gmai.com)
-- This is the duplicate that's causing the issue

DELETE FROM staff
WHERE id = 'f705bf94-8e17-411d'
AND email = 'vonguyenaimy18102002@gmai.com';

-- Verify the deletion
SELECT
  id,
  store_id,
  email,
  full_name,
  created_at
FROM staff
WHERE email LIKE 'vonguyenaimy%'
ORDER BY created_at;
-- Should only show one record now (the correct @gmail.com one)
