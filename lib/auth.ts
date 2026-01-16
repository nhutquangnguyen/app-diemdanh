import { supabase } from './supabase';

export async function signUp(email: string, password: string, fullName: string) {
  // Sign up WITHOUT auto-confirming email
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      },
      // This tells Supabase to NOT send confirmation email
      // and NOT auto-confirm the email
      emailRedirectTo: undefined,
    },
  });

  if (error) throw error;

  return data;
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;

  console.log('[AUTH] SignIn data:', {
    userId: data.user?.id,
    email: data.user?.email,
  });

  // Check if email is verified using our custom email_verification_tokens table
  if (data.user) {
    // Check if user has ANY record in email_verification_tokens (verified or not)
    const { data: allTokens, error: verificationError } = await supabase
      .from('email_verification_tokens')
      .select('verified_at, user_id')
      .eq('email', data.user.email)
      .limit(1);

    if (verificationError) {
      console.error('[AUTH] Error checking verification status:', verificationError);
      // Continue with login - don't block on database errors
    } else if (allTokens && allTokens.length > 0) {
      // User has a record - check if it's verified
      const token = allTokens[0];
      if (!token.verified_at) {
        // New user who hasn't verified their email yet
        console.log('[AUTH] Email not verified (unverified token exists), blocking login');

        // Store user info for verification page
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('signup_user_id', token.user_id);
          sessionStorage.setItem('signup_email', data.user.email || '');
          sessionStorage.setItem('signup_full_name', data.user.user_metadata?.full_name || '');
        }

        await supabase.auth.signOut();

        // Return a special error object that includes redirect info
        const error = new Error('UNVERIFIED_EMAIL');
        (error as any).needsVerification = true;
        throw error;
      }
      console.log('[AUTH] Email verified (verified token exists), allowing login');
    } else {
      // No record found - old user who signed up before email verification was implemented
      console.log('[AUTH] No verification record found - old user, allowing login');
    }
  }

  return data;
}

export async function signInWithGoogle() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
  });

  if (error) throw error;
  return data;
}

export async function signOut() {
  try {
    const { error } = await supabase.auth.signOut();

    // Ignore session missing errors - user is already signed out
    if (error && error.message !== 'Auth session missing!') {
      throw error;
    }
  } catch (error: any) {
    // Gracefully handle session missing errors
    if (error?.message !== 'Auth session missing!') {
      console.error('Sign out error:', error);
      throw error;
    }
  } finally {
    // Always clear local storage to ensure clean state
    if (typeof window !== 'undefined') {
      localStorage.removeItem('diemdanh-auth');
    }
  }
}

// Fast synchronous check from localStorage
export function getCurrentUserSync() {
  if (typeof window === 'undefined') return null;

  try {
    const stored = localStorage.getItem('diemdanh-auth');
    if (!stored) return null;

    const data = JSON.parse(stored);
    // Check if session is expired
    if (data?.expires_at && data.expires_at * 1000 < Date.now()) {
      return null;
    }

    return data?.user || null;
  } catch {
    return null;
  }
}

// Async verification (validates token)
export async function getCurrentUser() {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user || null;
}

export async function getUserMetadata() {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.user_metadata;
}
