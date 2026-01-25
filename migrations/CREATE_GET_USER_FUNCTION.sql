-- Create a database function to get user by email
-- This allows us to check if a user exists without needing admin API access

CREATE OR REPLACE FUNCTION get_user_by_email(email_input text)
RETURNS TABLE (
  id uuid,
  email text,
  full_name text,
  phone text
)
LANGUAGE plpgsql
SECURITY DEFINER -- This allows the function to access auth.users
AS $$
BEGIN
  RETURN QUERY
  SELECT
    au.id,
    au.email::text,
    au.raw_user_meta_data->>'full_name' as full_name,
    au.raw_user_meta_data->>'phone' as phone
  FROM auth.users au
  WHERE LOWER(au.email) = LOWER(email_input);
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_user_by_email(text) TO authenticated;

-- Test the function
SELECT * FROM get_user_by_email('hoangyen2503@gmail.com');
