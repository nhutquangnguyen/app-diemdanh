-- Migration: Sync new status column with old is_active column
-- This fixes the mismatch between is_active (boolean) and status (varchar)

-- Update status based on is_active and user_id
UPDATE public.staff
SET status = CASE
  WHEN user_id IS NOT NULL AND is_active = true THEN 'active'
  WHEN user_id IS NOT NULL AND is_active = false THEN 'inactive'
  WHEN user_id IS NULL AND invitation_token IS NOT NULL THEN 'invited'
  ELSE 'active'
END
WHERE status IS NULL OR status = '';

-- For existing records, sync status with is_active
UPDATE public.staff
SET status = CASE
  WHEN is_active = false THEN 'inactive'
  WHEN user_id IS NOT NULL THEN 'active'
  WHEN user_id IS NULL THEN 'invited'
  ELSE status
END;

-- Show results
SELECT
  email,
  is_active,
  status,
  user_id IS NOT NULL as has_account
FROM public.staff
ORDER BY created_at DESC;
