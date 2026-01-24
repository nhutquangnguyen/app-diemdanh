'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';

/**
 * Global authentication monitor that handles session expiry across the entire app.
 * Listens to Supabase auth state changes and redirects to login when session expires.
 */
export function AuthMonitor() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Don't monitor auth on public pages
    const publicPaths = [
      '/auth/login',
      '/auth/signup',
      '/auth/forgot-password',
      '/auth/reset-password',
      '/auth/verify-email',
      '/auth/verify-code',
      '/auth/callback',
    ];

    if (publicPaths.some(path => pathname?.startsWith(path))) {
      return;
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('🔐 [AUTH MONITOR] State changed:', event, session?.user?.email);

      // Only handle actual sign out, not token refresh
      // Note: We redirect silently without alert because SIGNED_OUT can be:
      // 1. Manual logout (user clicked logout button) - no alert needed
      // 2. Session expiry - user will see the error when they try to do something
      if (event === 'SIGNED_OUT') {
        console.warn('⚠️ [AUTH MONITOR] User signed out or session expired');
        router.push('/auth/login');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [pathname, router]);

  return null;
}
