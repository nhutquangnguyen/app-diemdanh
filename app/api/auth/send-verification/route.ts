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

function generateVerificationCode(): string {
  // Generate random 6-digit code
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function sendVerificationEmail(email: string, code: string, fullName: string) {
  const RESEND_API_KEY = process.env.RESEND_API_KEY;

  if (!RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY not configured');
  }

  const htmlContent = `
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background-color: #f3f4f6;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 600px;
      margin: 40px auto;
      background-color: #ffffff;
      border-radius: 8px;
      padding: 40px;
    }
    h2 {
      color: #1f2937;
      margin: 0 0 20px 0;
      font-size: 24px;
    }
    p {
      color: #4b5563;
      line-height: 1.6;
      margin: 0 0 20px 0;
      font-size: 16px;
    }
    .code-box {
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      border-radius: 12px;
      padding: 30px;
      margin: 30px 0;
      text-align: center;
    }
    .code {
      font-size: 42px;
      font-weight: 700;
      letter-spacing: 8px;
      color: #ffffff;
      font-family: 'Courier New', monospace;
      text-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .code-label {
      color: #d1fae5;
      font-size: 14px;
      margin-bottom: 10px;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .link-box {
      background-color: #f0fdf4;
      border-left: 4px solid #10b981;
      padding: 16px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .link-box p {
      margin: 0;
      font-size: 14px;
      color: #064e3b;
    }
    .link-box a {
      color: #059669;
      text-decoration: none;
      font-weight: 600;
    }
    .warning {
      background-color: #fef3c7;
      border-left: 4px solid #f59e0b;
      padding: 16px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .warning p {
      margin: 0;
      font-size: 14px;
      color: #92400e;
    }
    .note {
      font-size: 14px;
      color: #6b7280;
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
    }
    .footer {
      text-align: center;
      margin-top: 30px;
      font-size: 12px;
      color: #9ca3af;
    }
  </style>
</head>
<body>
  <div class="container">
    <h2>Xác thực email của bạn</h2>

    <p>Xin chào ${fullName || 'bạn'},</p>

    <p>Cảm ơn bạn đã đăng ký tài khoản tại <strong>diemdanh.net</strong>! Để hoàn tất quá trình đăng ký, vui lòng xác thực địa chỉ email của bạn.</p>

    <div class="code-box">
      <div class="code-label">Mã xác thực của bạn</div>
      <div class="code">${code}</div>
    </div>

    <div class="link-box">
      <p>📱 Nhập mã này tại: <a href="https://app.diemdanh.net/auth/verify-email">app.diemdanh.net/auth/verify-email</a></p>
    </div>

    <div class="warning">
      <p>⏱️ Mã này sẽ hết hạn sau <strong>15 phút</strong></p>
    </div>

    <p class="note">
      <strong>Lưu ý bảo mật:</strong>
    </p>
    <ul style="color: #6b7280; font-size: 14px; line-height: 1.6;">
      <li>Không chia sẻ mã này với bất kỳ ai</li>
      <li>Nếu bạn không đăng ký tài khoản, vui lòng bỏ qua email này</li>
      <li>Mã chỉ có thể sử dụng một lần</li>
    </ul>

    <div class="footer">
      © 2025 diemdanh.net - Hệ thống điểm danh thông minh
    </div>
  </div>
</body>
</html>
  `;

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Điểm danh thông minh - diemdanh.net <onboarding@resend.dev>',
      to: [email],
      subject: 'Xác thực email - diemdanh.net',
      html: htmlContent,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to send email: ${error}`);
  }

  return await response.json();
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, email, fullName } = body;

    if (!userId || !email) {
      return NextResponse.json(
        { error: 'Thiếu thông tin bắt buộc' },
        { status: 400 }
      );
    }

    const trimmedEmail = email.trim().toLowerCase();

    // Check rate limiting - max 1 request per user per 1 minute
    const oneMinuteAgo = new Date(Date.now() - 1 * 60 * 1000);
    const { data: recentTokens } = await supabaseAdmin
      .from('email_verification_tokens')
      .select('created_at')
      .eq('user_id', userId)
      .gte('created_at', oneMinuteAgo.toISOString())
      .order('created_at', { ascending: false })
      .limit(1);

    if (recentTokens && recentTokens.length > 0) {
      return NextResponse.json(
        { error: 'Vui lòng đợi 1 phút trước khi yêu cầu mã mới' },
        { status: 429 }
      );
    }

    // Generate verification code
    const verificationCode = generateVerificationCode();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Store token in database
    const { error: insertError } = await supabaseAdmin
      .from('email_verification_tokens')
      .insert({
        user_id: userId,
        email: trimmedEmail,
        token: verificationCode,
        expires_at: expiresAt.toISOString(),
        attempts: 0,
      });

    if (insertError) {
      console.error('Error storing verification token:', insertError);
      return NextResponse.json(
        { error: 'Không thể tạo mã xác thực. Vui lòng thử lại.' },
        { status: 500 }
      );
    }

    // Send email with verification code
    try {
      await sendVerificationEmail(trimmedEmail, verificationCode, fullName);
    } catch (emailError) {
      console.error('Error sending verification email:', emailError);
      // Delete the token since we couldn't send the email
      await supabaseAdmin
        .from('email_verification_tokens')
        .delete()
        .eq('token', verificationCode);

      return NextResponse.json(
        { error: 'Không thể gửi email. Vui lòng thử lại sau.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Mã xác thực đã được gửi đến email của bạn.'
    });

  } catch (error: any) {
    console.error('Error in send-verification API:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
