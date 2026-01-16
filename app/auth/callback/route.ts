import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const runtime = 'edge';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const returnUrl = requestUrl.searchParams.get('returnUrl') || '/';

  if (code) {
    try {
      const { data: sessionData } = await supabase.auth.exchangeCodeForSession(code);

      // Auto-link staff records and verify email for OAuth signups
      if (sessionData?.user) {
        const userEmail = sessionData.user.email;
        const userName = sessionData.user.user_metadata?.full_name || sessionData.user.user_metadata?.name;

        if (userEmail) {
          try {
            // Auto-verify email for OAuth users (Google already verified their email)
            const verifyResponse = await fetch(new URL('/api/auth/auto-verify-oauth', requestUrl.origin), {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                userId: sessionData.user.id,
                email: userEmail,
              }),
            });

            if (verifyResponse.ok) {
              console.log(`Auto-verified email for OAuth user: ${userEmail}`);
            }
          } catch (verifyError) {
            console.error('Error auto-verifying OAuth user email:', verifyError);
            // Don't block login if verification fails
          }

          try {
            // Call the link-account API (it uses service role to bypass RLS)
            const linkResponse = await fetch(new URL('/api/staff/link-account', requestUrl.origin), {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                userId: sessionData.user.id,
                email: userEmail,
                fullName: userName || null,
                invitationToken: null,
              }),
            });

            const linkResult = await linkResponse.json();
            if (linkResult.success && linkResult.linked) {
              console.log(`Auto-linked ${linkResult.staffRecords.length} staff record(s) for ${userEmail}`);
            }
          } catch (linkError) {
            console.error('Error auto-linking staff records during OAuth:', linkError);
            // Don't block login if linking fails
          }
        }
      }
    } catch (error) {
      console.error('OAuth callback error:', error);
      return NextResponse.redirect(new URL('/auth/login?error=oauth_failed', requestUrl.origin));
    }
  }

  // Redirect to return URL or home
  return NextResponse.redirect(new URL(returnUrl, requestUrl.origin));
}
