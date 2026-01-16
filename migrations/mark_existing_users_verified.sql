-- Migration: Mark all existing users as verified
-- Run this ONCE after deploying the email verification feature
-- This creates verified tokens for all users who signed up before email verification was implemented

INSERT INTO email_verification_tokens (user_id, email, token, expires_at, verified_at, created_at)
SELECT
  id as user_id,
  email,
  '000000' as token, -- Dummy token for existing users
  NOW() + INTERVAL '15 minutes' as expires_at,
  NOW() as verified_at, -- Mark as already verified
  created_at
FROM auth.users
WHERE email IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM email_verification_tokens
    WHERE email_verification_tokens.email = auth.users.email
  );

-- This will allow all existing users to login immediately
-- while new users will be required to verify their email
