import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { validatePassword } from '@/lib/password-validation';

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
    const { email, code, newPassword } = body;

    if (!email || !code || !newPassword) {
      return NextResponse.json(
        { error: 'Thiếu thông tin bắt buộc' },
        { status: 400 }
      );
    }

    const trimmedEmail = email.trim().toLowerCase();
    const trimmedCode = code.trim();

    // Validate password
    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.isValid) {
      return NextResponse.json(
        {
          error: 'Mật khẩu không đáp ứng yêu cầu bảo mật',
          failedRequirements: passwordValidation.failedRequirements
        },
        { status: 400 }
      );
    }

    // Find the token
    const { data: tokens, error: findError } = await supabaseAdmin
      .from('password_reset_tokens')
      .select('*')
      .eq('email', trimmedEmail)
      .eq('token', trimmedCode)
      .is('used_at', null)
      .order('created_at', { ascending: false })
      .limit(1);

    if (findError || !tokens || tokens.length === 0) {
      return NextResponse.json(
        { error: 'Mã xác thực không hợp lệ' },
        { status: 400 }
      );
    }

    const resetToken = tokens[0];

    // Check if token is expired
    const now = new Date();
    const expiresAt = new Date(resetToken.expires_at);
    if (now > expiresAt) {
      return NextResponse.json(
        { error: 'Mã xác thực đã hết hạn. Vui lòng yêu cầu mã mới.' },
        { status: 400 }
      );
    }

    // Check attempts
    if (resetToken.attempts >= MAX_ATTEMPTS) {
      return NextResponse.json(
        { error: 'Đã vượt quá số lần thử. Vui lòng yêu cầu mã mới.' },
        { status: 400 }
      );
    }

    // Update password using Supabase Admin API
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      resetToken.user_id,
      { password: newPassword }
    );

    if (updateError) {
      // Increment attempts
      await supabaseAdmin
        .from('password_reset_tokens')
        .update({ attempts: resetToken.attempts + 1 })
        .eq('id', resetToken.id);

      console.error('Error updating password:', updateError);
      return NextResponse.json(
        { error: 'Không thể đặt lại mật khẩu. Vui lòng thử lại.' },
        { status: 500 }
      );
    }

    // Mark token as used
    await supabaseAdmin
      .from('password_reset_tokens')
      .update({ used_at: new Date().toISOString() })
      .eq('id', resetToken.id);

    // Invalidate all other tokens for this user
    await supabaseAdmin
      .from('password_reset_tokens')
      .update({ used_at: new Date().toISOString() })
      .eq('user_id', resetToken.user_id)
      .is('used_at', null);

    return NextResponse.json({
      success: true,
      message: 'Mật khẩu đã được đặt lại thành công'
    });

  } catch (error: any) {
    console.error('Error in verify-reset API:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
