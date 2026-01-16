import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  try {
    const { userId } = await req.json();

    if (!userId) {
      return NextResponse.json(
        { error: 'Missing userId' },
        { status: 400 }
      );
    }

    // Create Supabase admin client with service role key (server-side only)
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

    // Manually unconfirm the user's email
    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      {
        email_confirm: false,
      }
    );

    if (error) {
      console.error('[UNCONFIRM-EMAIL] Error:', error);
      return NextResponse.json(
        { error: 'Failed to unconfirm email' },
        { status: 500 }
      );
    }

    console.log('[UNCONFIRM-EMAIL] Successfully unconfirmed email for user:', userId);

    return NextResponse.json({
      success: true,
      message: 'Email unconfirmed successfully',
    });
  } catch (error: any) {
    console.error('[UNCONFIRM-EMAIL] Unexpected error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
