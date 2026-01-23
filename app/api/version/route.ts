import { NextResponse } from 'next/server';

/**
 * Version endpoint to detect app updates
 * Returns current version and build ID
 */
export async function GET() {
  // Use environment variable or package.json version
  const version = process.env.NEXT_PUBLIC_APP_VERSION || process.env.VERCEL_GIT_COMMIT_SHA || 'development';
  const buildId = process.env.VERCEL_DEPLOYMENT_ID || Date.now().toString();

  return NextResponse.json(
    {
      version: version.substring(0, 8), // Short hash
      buildId,
      timestamp: new Date().toISOString(),
    },
    {
      headers: {
        // Never cache this endpoint
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    }
  );
}
