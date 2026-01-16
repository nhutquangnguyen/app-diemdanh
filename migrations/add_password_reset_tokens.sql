-- Create password_reset_tokens table for token-based password reset
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  email VARCHAR(255) NOT NULL,
  token VARCHAR(6) NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE,
  attempts INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_reset_token_lookup ON password_reset_tokens(token, expires_at) WHERE used_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_reset_token_email ON password_reset_tokens(email, created_at);
CREATE INDEX IF NOT EXISTS idx_reset_token_user ON password_reset_tokens(user_id);

-- Add RLS policies
ALTER TABLE password_reset_tokens ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only read their own tokens (for verification)
CREATE POLICY "Users can read own reset tokens"
  ON password_reset_tokens
  FOR SELECT
  USING (auth.uid() = user_id);

-- Service role can manage all tokens (for API endpoints)
-- This will be handled via service role key in API routes

-- Add comment
COMMENT ON TABLE password_reset_tokens IS 'Stores password reset verification codes (6-digit tokens)';
