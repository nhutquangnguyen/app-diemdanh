# Google Authentication Setup Guide

This guide will help you configure Google OAuth authentication for your DiemDanh app.

## Prerequisites

- A Supabase project
- A Google Cloud Console account

## Step 1: Configure Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google+ API:
   - Go to "APIs & Services" > "Library"
   - Search for "Google+ API"
   - Click "Enable"

4. Create OAuth 2.0 credentials:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth client ID"
   - Choose "Web application"
   - Add authorized redirect URIs:
     ```
     https://<your-project-ref>.supabase.co/auth/v1/callback
     https://app.diemdanh.net/auth/callback
     http://localhost:3000/auth/callback (for development)
     ```
   - Click "Create"
   - Copy the **Client ID** and **Client Secret**

## Step 2: Configure Supabase

1. Go to your Supabase project dashboard
2. Navigate to "Authentication" > "Providers"
3. Find "Google" and click to enable it
4. Enter the credentials from Google Cloud Console:
   - **Client ID**: Paste your Google OAuth Client ID
   - **Client Secret**: Paste your Google OAuth Client Secret
5. Click "Save"

## Step 3: Verify Redirect URLs in Supabase

1. In Supabase, go to "Authentication" > "URL Configuration"
2. Add these URLs to "Redirect URLs":
   ```
   https://app.diemdanh.net/auth/callback
   http://localhost:3000/auth/callback
   ```
3. Set "Site URL" to: `https://app.diemdanh.net`

## Step 4: Test the Integration

1. Run your app locally: `npm run dev`
2. Go to `/auth/signup`
3. Click "Đăng ký bằng Google"
4. You should be redirected to Google login
5. After successful login, you should be redirected back to your app

## Troubleshooting

### "redirect_uri_mismatch" Error
- Ensure the redirect URI in Google Cloud Console exactly matches:
  `https://<your-project-ref>.supabase.co/auth/v1/callback`
- Check for trailing slashes and http vs https

### Users Not Being Created
- Check Supabase Auth logs for errors
- Ensure Google+ API is enabled in Google Cloud Console
- Verify Client ID and Secret are correctly configured

### Session Not Persisting
- Check browser console for errors
- Ensure cookies are enabled
- Verify Site URL is correctly set in Supabase

## Security Notes

- Never commit Google OAuth credentials to version control
- Use environment variables for sensitive data
- Regularly rotate OAuth secrets
- Monitor authentication logs for suspicious activity

## Additional Resources

- [Supabase Google Auth Docs](https://supabase.com/docs/guides/auth/social-login/auth-google)
- [Google OAuth 2.0 Guide](https://developers.google.com/identity/protocols/oauth2)
