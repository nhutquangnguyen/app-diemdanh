import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  try {
    const { userId, email } = await req.json();

    if (!userId || !email) {
      return NextResponse.json(
        { error: 'Missing userId or email' },
        { status: 400 }
      );
    }

    // Create Supabase admin client
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Check if user already has a verified token
    const { data: existingToken } = await supabaseAdmin
      .from('email_verification_tokens')
      .select('id')
      .eq('email', email)
      .not('verified_at', 'is', null)
      .limit(1)
      .single();

    if (existingToken) {
      // User already has a verified token, no need to create another
      console.log('[AUTO-VERIFY-OAUTH] User already has verified token:', email);
      return NextResponse.json({ success: true, message: 'Already verified' });
    }

    // Create a verified token for the OAuth user
    const { error: insertError } = await supabaseAdmin
      .from('email_verification_tokens')
      .insert({
        user_id: userId,
        email: email,
        token: '000000', // Dummy token for OAuth users
        expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(), // 15 minutes from now
        verified_at: new Date().toISOString(), // Mark as already verified
      });

    if (insertError) {
      console.error('[AUTO-VERIFY-OAUTH] Error creating verified token:', insertError);
      return NextResponse.json(
        { error: 'Failed to create verified token' },
        { status: 500 }
      );
    }

    console.log('[AUTO-VERIFY-OAUTH] Created verified token for OAuth user:', email);

    return NextResponse.json({
      success: true,
      message: 'OAuth user auto-verified',
    });
  } catch (error: any) {
    console.error('[AUTO-VERIFY-OAUTH] Unexpected error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
