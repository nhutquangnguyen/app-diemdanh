import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const runtime = 'edge';

interface AddStaffRequest {
  storeId: string;
  emails: string[]; // Array of emails for bulk invite
  salaryType: 'hourly' | 'monthly' | 'daily';
  hourlyRate: number;
  monthlyRate?: number;
  dailyRate?: number;
  storeName: string;
}

interface AddStaffResult {
  email: string;
  status: 'added' | 'invited' | 'already_exists' | 'error';
  message: string;
}

export async function POST(request: Request) {
  try {
    const body: AddStaffRequest = await request.json();
    const { storeId, emails, salaryType, hourlyRate, monthlyRate, dailyRate, storeName } = body;

    if (!storeId || !emails || emails.length === 0 || !salaryType) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const results: AddStaffResult[] = [];

    // Process each email
    for (const email of emails) {
      const trimmedEmail = email.trim().toLowerCase();

      if (!trimmedEmail || !isValidEmail(trimmedEmail)) {
        results.push({
          email: trimmedEmail || email,
          status: 'error',
          message: 'Email không hợp lệ'
        });
        continue;
      }

      // Check if staff already exists in this store
      const { data: existingStaff } = await supabase
        .from('staff')
        .select('id, status')
        .eq('email', trimmedEmail)
        .eq('store_id', storeId)
        .single();

      if (existingStaff) {
        results.push({
          email: trimmedEmail,
          status: 'already_exists',
          message: existingStaff.status === 'invited'
            ? 'Email đã được mời trước đó'
            : 'Email đã tồn tại trong danh sách nhân viên'
        });
        continue;
      }

      // Check if user exists in auth system
      const { data: existingUsers } = await supabase
        .rpc('get_user_by_email', { email_input: trimmedEmail });

      if (existingUsers && existingUsers.length > 0) {
        // User exists - add directly as active staff
        const registeredUser = existingUsers[0];

        const { error } = await supabase
          .from('staff')
          .insert({
            store_id: storeId,
            user_id: registeredUser.id,
            email: trimmedEmail,
            full_name: registeredUser.full_name || trimmedEmail.split('@')[0],
            phone: registeredUser.phone || null,
            salary_type: salaryType,
            hour_rate: hourlyRate,
            monthly_rate: monthlyRate,
            daily_rate: dailyRate,
            status: 'active'
          });

        if (error) {
          results.push({
            email: trimmedEmail,
            status: 'error',
            message: 'Lỗi khi thêm nhân viên: ' + error.message
          });
        } else {
          results.push({
            email: trimmedEmail,
            status: 'added',
            message: 'Đã thêm thành công'
          });
        }
      } else {
        // User doesn't exist - create invitation
        const invitationToken = crypto.randomUUID();
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiration

        const { error } = await supabase
          .from('staff')
          .insert({
            store_id: storeId,
            email: trimmedEmail,
            user_id: null,
            full_name: null,
            phone: null,
            salary_type: salaryType,
            hour_rate: hourlyRate,
            monthly_rate: monthlyRate,
            daily_rate: dailyRate,
            status: 'invited',
            invited_at: new Date().toISOString(),
            invitation_token: invitationToken,
            invitation_expires_at: expiresAt.toISOString()
          });

        if (error) {
          results.push({
            email: trimmedEmail,
            status: 'error',
            message: 'Lỗi khi tạo lời mời: ' + error.message
          });
        } else {
          // Send invitation email
          try {
            await sendInvitationEmail(trimmedEmail, invitationToken, storeName);
            results.push({
              email: trimmedEmail,
              status: 'invited',
              message: 'Đã gửi lời mời'
            });
          } catch (emailError: any) {
            // Even if email fails, we've created the invitation
            results.push({
              email: trimmedEmail,
              status: 'invited',
              message: 'Đã tạo lời mời (lỗi gửi email: ' + emailError.message + ')'
            });
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      results
    });
  } catch (error: any) {
    console.error('Error in add staff API:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

async function sendInvitationEmail(email: string, token: string, storeName: string) {
  const RESEND_API_KEY = process.env.RESEND_API_KEY;

  if (!RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY not configured');
  }

  const inviteUrl = `https://app.diemdanh.net/auth/signup?invite_token=${token}`;

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
    .invite-box {
      background-color: #eff6ff;
      border-left: 4px solid #2563eb;
      padding: 16px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .invite-box p {
      margin: 0;
      font-size: 15px;
      color: #1e40af;
      font-weight: 600;
    }
    .button-wrapper {
      text-align: center;
      margin: 30px 0;
    }
    .button {
      display: inline-block;
      padding: 14px 32px;
      background-color: #2563eb;
      color: #ffffff !important;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 600;
      font-size: 16px;
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
    <h2>Lời mời tham gia</h2>

    <p>Xin chào,</p>

    <p>Bạn đã được mời tham gia làm nhân viên tại <strong>${storeName}</strong> trên hệ thống điểm danh diemdanh.net.</p>

    <div class="invite-box">
      <p>🏪 Cửa hàng: ${storeName}</p>
    </div>

    <p>Nhấn nút bên dưới để chấp nhận lời mời và tạo tài khoản của bạn:</p>

    <div class="button-wrapper">
      <a href="${inviteUrl}" class="button">Chấp Nhận Lời Mời</a>
    </div>

    <p style="font-size: 14px; color: #6b7280;">Liên kết này sẽ hết hạn sau 7 ngày.</p>

    <p class="note">
      Nếu bạn không mong đợi lời mời này, vui lòng bỏ qua email.
    </p>

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
      from: 'Điểm danh thông minh - diemdanh.net <help@thongbao.diemdanh.net>',
      to: [email],
      subject: 'Lời mời tham gia diemdanh.net',
      html: htmlContent,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to send email: ${error}`);
  }

  return await response.json();
}
