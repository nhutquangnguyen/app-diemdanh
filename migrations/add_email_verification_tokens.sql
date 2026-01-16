-- Create email_verification_tokens table for email verification during signup
CREATE TABLE IF NOT EXISTS email_verification_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  email VARCHAR(255) NOT NULL,
  token VARCHAR(6) NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  verified_at TIMESTAMP WITH TIME ZONE,
  attempts INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_email_verification_lookup ON email_verification_tokens(token, expires_at) WHERE verified_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_email_verification_email ON email_verification_tokens(email, created_at);
CREATE INDEX IF NOT EXISTS idx_email_verification_user ON email_verification_tokens(user_id);

-- Add RLS policies
ALTER TABLE email_verification_tokens ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only read their own tokens (for verification)
CREATE POLICY "Users can read own verification tokens"
  ON email_verification_tokens
  FOR SELECT
  USING (auth.uid() = user_id);

-- Service role can manage all tokens (for API endpoints)
-- This will be handled via service role key in API routes

-- Add comment
COMMENT ON TABLE email_verification_tokens IS 'Stores email verification codes (6-digit tokens) for signup';
