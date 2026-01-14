-- Fix: Update invited staff who have created accounts
-- This handles cases where users signed up without using the invitation link

-- Update any 'invited' staff who now have user accounts to 'active'
UPDATE public.staff
SET
  status = 'active',
  invitation_token = NULL  -- Clear the token since they're now active
WHERE
  status = 'invited'
  AND user_id IS NOT NULL;

-- Show how many records were updated
-- SELECT COUNT(*) as updated_count
-- FROM public.staff
-- WHERE status = 'active' AND user_id IS NOT NULL;
