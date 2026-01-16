import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'edge';

// Create admin client with service role (bypasses RLS)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

const MAX_ATTEMPTS = 3;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, email, code } = body;

    if (!userId || !email || !code) {
      return NextResponse.json(
        { error: 'Thiếu thông tin bắt buộc' },
        { status: 400 }
      );
    }

    const trimmedEmail = email.trim().toLowerCase();
    const trimmedCode = code.trim();

    // Find the token
    const { data: tokens, error: findError } = await supabaseAdmin
      .from('email_verification_tokens')
      .select('*')
      .eq('user_id', userId)
      .eq('email', trimmedEmail)
      .eq('token', trimmedCode)
      .is('verified_at', null)
      .order('created_at', { ascending: false })
      .limit(1);

    if (findError || !tokens || tokens.length === 0) {
      return NextResponse.json(
        { error: 'Mã xác thực không hợp lệ' },
        { status: 400 }
      );
    }

    const verificationToken = tokens[0];

    // Check if token is expired
    const now = new Date();
    const expiresAt = new Date(verificationToken.expires_at);
    if (now > expiresAt) {
      return NextResponse.json(
        { error: 'Mã xác thực đã hết hạn. Vui lòng yêu cầu mã mới.' },
        { status: 400 }
      );
    }

    // Check attempts
    if (verificationToken.attempts >= MAX_ATTEMPTS) {
      return NextResponse.json(
        { error: 'Đã vượt quá số lần thử. Vui lòng yêu cầu mã mới.' },
        { status: 400 }
      );
    }

    // Mark email as verified using Supabase Admin API
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { email_confirm: true }
    );

    if (updateError) {
      // Increment attempts
      await supabaseAdmin
        .from('email_verification_tokens')
        .update({ attempts: verificationToken.attempts + 1 })
        .eq('id', verificationToken.id);

      console.error('Error verifying email:', updateError);
      return NextResponse.json(
        { error: 'Không thể xác thực email. Vui lòng thử lại.' },
        { status: 500 }
      );
    }

    // Mark token as used
    await supabaseAdmin
      .from('email_verification_tokens')
      .update({ verified_at: new Date().toISOString() })
      .eq('id', verificationToken.id);

    // Invalidate all other tokens for this user
    await supabaseAdmin
      .from('email_verification_tokens')
      .update({ verified_at: new Date().toISOString() })
      .eq('user_id', userId)
      .is('verified_at', null);

    return NextResponse.json({
      success: true,
      message: 'Email đã được xác thực thành công'
    });

  } catch (error: any) {
    console.error('Error in verify-email API:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
