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

      // Handle session expiry or logout
      if (event === 'SIGNED_OUT' || (event === 'TOKEN_REFRESHED' && !session)) {
        console.warn('⚠️ [AUTH MONITOR] Session expired or user signed out');
        alert('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
        router.push('/auth/login');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [pathname, router]);

  return null;
}
