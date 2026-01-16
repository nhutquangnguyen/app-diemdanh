'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/Header';

export const runtime = 'edge';

export default function VerifyEmailPage() {
  const router = useRouter();
  const [userId, setUserId] = useState('');
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendLoading, setResendLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [fromLogin, setFromLogin] = useState(false);
  const codeInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Get signup info from sessionStorage
    const storedUserId = sessionStorage.getItem('signup_user_id');
    const storedEmail = sessionStorage.getItem('signup_email');
    const storedFullName = sessionStorage.getItem('signup_full_name');
    const isFromLogin = sessionStorage.getItem('from_login') === 'true';

    if (!storedUserId || !storedEmail) {
      // No signup info stored, redirect back to signup
      router.push('/auth/signup');
      return;
    }

    setUserId(storedUserId);
    setEmail(storedEmail);
    setFullName(storedFullName || '');
    setFromLogin(isFromLogin);

    // If coming from login, automatically send verification code
    if (isFromLogin) {
      // Send verification code automatically
      fetch('/api/auth/send-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: storedUserId,
          email: storedEmail,
          fullName: storedFullName || '',
        }),
      }).catch(err => {
        console.error('[VERIFY-EMAIL] Error sending auto verification:', err);
      });
    }

    // Auto-focus code input
    codeInputRef.current?.focus();
  }, [router]);

  // Countdown timer for resend
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => {
        setResendCooldown(resendCooldown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  async function handleVerifyEmail(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (code.length !== 6) {
      setError('Mã xác thực phải có 6 chữ số');
      setLoading(false);
      return;
    }

    try {
      // Verify email
      const response = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, email, code }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Mã xác thực không hợp lệ');
      }

      // Email verified successfully! Now link staff accounts if applicable
      const inviteToken = sessionStorage.getItem('signup_invite_token');
      const returnUrl = sessionStorage.getItem('signup_return_url') || '/';

      // Auto-link staff records using server-side API
      let successMessage = 'Email đã được xác thực thành công!';
      try {
        const linkResponse = await fetch('/api/staff/link-account', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            email,
            fullName,
            invitationToken: inviteToken,
          }),
        });

        const linkResult = await linkResponse.json();

        if (linkResult.success && linkResult.linked) {
          // Successfully linked to store(s)
          if (linkResult.storeNames && linkResult.storeNames.length > 0) {
            const storesList = linkResult.storeNames.join(', ');
            successMessage = `Xác thực thành công! Bạn đã được thêm vào: ${storesList}\n\nVui lòng đăng nhập để tiếp tục.`;
          } else {
            successMessage = 'Xác thực thành công! Bạn đã được thêm vào cửa hàng.\n\nVui lòng đăng nhập để tiếp tục.';
          }
        } else {
          successMessage = 'Email đã được xác thực thành công!\n\nVui lòng đăng nhập để tiếp tục.';
        }
      } catch (linkError) {
        console.error('❌ [VERIFY-EMAIL] Error linking staff records:', linkError);
        successMessage = 'Email đã được xác thực thành công!\n\nVui lòng đăng nhập để tiếp tục.';
      }

      // Clear signup data
      sessionStorage.removeItem('signup_user_id');
      sessionStorage.removeItem('signup_email');
      sessionStorage.removeItem('signup_full_name');
      sessionStorage.removeItem('signup_invite_token');
      sessionStorage.removeItem('signup_return_url');
      sessionStorage.removeItem('from_login');

      // Show success message and redirect to login
      alert(successMessage);
      router.push(`/auth/login${returnUrl && returnUrl !== '/' ? `?returnUrl=${returnUrl}` : ''}`);
    } catch (error: any) {
      setError(error.message || 'Có lỗi xảy ra. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  }

  async function handleResendCode() {
    setResendLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/send-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, email, fullName }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Có lỗi xảy ra');
      }

      // Start 60 second cooldown
      setResendCooldown(60);
      setCode(''); // Clear the code input
      codeInputRef.current?.focus();
    } catch (error: any) {
      setError(error.message || 'Không thể gửi lại mã. Vui lòng thử lại.');
    } finally {
      setResendLoading(false);
    }
  }

  if (!userId || !email) {
    return null; // Will redirect
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <Header />

      <main className="max-w-md mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2 text-center">
            {fromLogin ? 'Email Chưa Được Xác Thực' : 'Xác Thực Email'}
          </h2>
          <p className="text-gray-600 mb-2 text-center text-sm">
            {fromLogin
              ? 'Tài khoản của bạn chưa được xác thực. Nhập mã 6 chữ số đã gửi đến'
              : 'Nhập mã 6 chữ số đã gửi đến'
            }
          </p>
          <p className="text-blue-600 mb-6 text-center text-sm font-semibold">
            {email}
          </p>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-green-700 text-sm text-center">
              {fromLogin
                ? '✉️ Mã xác thực đã được gửi lại đến email của bạn. Mã có hiệu lực trong 15 phút.'
                : '✉️ Kiểm tra hộp thư email của bạn. Mã có hiệu lực trong 15 phút.'
              }
            </p>
          </div>

          <form onSubmit={handleVerifyEmail} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2 text-center">
                Mã Xác Thực
              </label>
              <input
                ref={codeInputRef}
                type="text"
                required
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="w-full px-4 py-4 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-center text-3xl font-mono tracking-widest font-bold"
                placeholder="000000"
                maxLength={6}
                pattern="[0-9]{6}"
                autoComplete="off"
              />
              <p className="text-xs text-gray-500 mt-2 text-center">
                Nhập mã 6 chữ số từ email của bạn
              </p>
            </div>

            <button
              type="submit"
              disabled={loading || code.length !== 6}
              className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white px-6 py-3 rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Đang xác thực...' : 'Xác Thực Email'}
            </button>
          </form>

          <div className="mt-6">
            <button
              type="button"
              onClick={handleResendCode}
              disabled={resendLoading || resendCooldown > 0}
              className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-3 rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {resendLoading
                ? 'Đang gửi...'
                : resendCooldown > 0
                ? `Gửi lại mã sau ${resendCooldown}s`
                : 'Gửi Lại Mã'}
            </button>
          </div>

          <div className="mt-6 text-center text-sm text-gray-600">
            <p>
              Email sai?{' '}
              <button
                type="button"
                onClick={() => {
                  sessionStorage.clear();
                  router.push('/auth/signup');
                }}
                className="text-blue-600 hover:text-blue-700 font-semibold"
              >
                Đăng ký lại
              </button>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
