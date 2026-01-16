import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  let res = NextResponse.next({
    request: {
      headers: req.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          req.cookies.set({
            name,
            value,
            ...options,
          });
          res = NextResponse.next({
            request: {
              headers: req.headers,
            },
          });
          res.cookies.set({
            name,
            value,
            ...options,
          });
        },
        remove(name: string, options: CookieOptions) {
          req.cookies.set({
            name,
            value: '',
            ...options,
          });
          res = NextResponse.next({
            request: {
              headers: req.headers,
            },
          });
          res.cookies.set({
            name,
            value: '',
            ...options,
          });
        },
      },
    }
  );

  // Get current session
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const path = req.nextUrl.pathname;

  console.log('[MIDDLEWARE]', path, 'Session:', session ? 'EXISTS' : 'NO SESSION');

  // TEMPORARILY DISABLED: Authentication check
  // This was causing redirect loops due to session cookie sync issues
  // TODO: Fix cookie handling between client and server

  // // Public routes that don't require authentication or verification
  // const publicRoutes = [
  //   '/auth/login',
  //   '/auth/signup',
  //   '/auth/verify-email',
  //   '/auth/forgot-password',
  //   '/auth/verify-code',
  //   '/auth/reset-password',
  //   '/auth/callback',
  // ];

  // // Check if current path is public
  // const isPublicRoute = publicRoutes.some(route => path.startsWith(route));

  // // If no session and trying to access protected route, redirect to login
  // if (!session && !isPublicRoute) {
  //   const redirectUrl = new URL('/auth/login', req.url);
  //   redirectUrl.searchParams.set('returnUrl', path);
  //   return NextResponse.redirect(redirectUrl);
  // }

  // TEMPORARILY DISABLED: Email verification check
  // This was blocking old users who don't have email_confirmed_at set
  // TODO: Re-enable after migrating existing users to have email_confirmed_at

  // if (session && session.user && !session.user.email_confirmed_at) {
  //   // Allow access to verify-email page
  //   if (path === '/auth/verify-email') {
  //     return res;
  //   }

  //   // Redirect to verify-email for all other routes
  //   if (!isPublicRoute) {
  //     const redirectUrl = new URL('/auth/verify-email', req.url);
  //     return NextResponse.redirect(redirectUrl);
  //   }
  // }

  return res;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - api (API routes)
     */
    '/((?!_next/static|_next/image|favicon.ico|api).*)',
  ],
};
