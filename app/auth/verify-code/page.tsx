'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/Header';

export const runtime = 'edge';

export default function VerifyCodePage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendLoading, setResendLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const codeInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Get email from sessionStorage
    const storedEmail = sessionStorage.getItem('reset_email');
    if (!storedEmail) {
      // No email stored, redirect back to forgot password
      router.push('/auth/forgot-password');
      return;
    }
    setEmail(storedEmail);

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

  async function handleVerifyCode(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (code.length !== 6) {
      setError('Mã xác thực phải có 6 chữ số');
      setLoading(false);
      return;
    }

    try {
      // Just verify the code exists and is valid (don't reset password yet)
      const response = await fetch('/api/auth/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Mã xác thực không hợp lệ');
      }

      // Store verified code for next step
      sessionStorage.setItem('reset_code', code);

      // Redirect to password reset page
      router.push('/auth/reset-password');
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
      const response = await fetch('/api/auth/request-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <Header />

      <main className="max-w-md mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-lg shadow-lg p-8">
          {/* Progress indicator */}
          <div className="flex items-center justify-center mb-6">
            <div className="flex items-center">
              <div className="w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center text-sm font-semibold">
                ✓
              </div>
              <div className="w-16 h-1 bg-blue-500"></div>
              <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center text-sm font-semibold">
                2
              </div>
              <div className="w-16 h-1 bg-gray-300"></div>
              <div className="w-8 h-8 rounded-full bg-gray-300 text-gray-600 flex items-center justify-center text-sm font-semibold">
                3
              </div>
            </div>
          </div>

          <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2 text-center">
            Xác Thực Mã
          </h2>
          <p className="text-gray-600 mb-2 text-center text-sm">
            Bước 2: Nhập mã 6 chữ số đã gửi đến
          </p>
          <p className="text-blue-600 mb-6 text-center text-sm font-semibold">
            {email}
          </p>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleVerifyCode} className="space-y-6">
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
              {loading ? 'Đang xác thực...' : 'Xác Thực'}
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

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => {
                sessionStorage.removeItem('reset_email');
                router.push('/auth/forgot-password');
              }}
              className="text-gray-600 hover:text-gray-700 text-sm"
            >
              ← Sử dụng email khác
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
