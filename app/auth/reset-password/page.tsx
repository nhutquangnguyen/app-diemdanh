'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/Header';
import { validatePassword, getPasswordErrorMessage } from '@/lib/password-validation';
import PasswordRequirements from '@/components/PasswordRequirements';

export const runtime = 'edge';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Get email and code from sessionStorage
    const storedEmail = sessionStorage.getItem('reset_email');
    const storedCode = sessionStorage.getItem('reset_code');

    if (!storedEmail || !storedCode) {
      // No email/code stored, redirect back to forgot password
      router.push('/auth/forgot-password');
      return;
    }

    setEmail(storedEmail);
    setCode(storedCode);
  }, [router]);

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();

    if (password !== confirmPassword) {
      setError('Mật khẩu không khớp');
      return;
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      setError(getPasswordErrorMessage(password));
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/verify-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          code,
          newPassword: password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Có lỗi xảy ra');
      }

      // Clear sessionStorage
      sessionStorage.removeItem('reset_email');
      sessionStorage.removeItem('reset_code');

      alert('Đặt lại mật khẩu thành công!');
      router.push('/auth/login');
    } catch (error: any) {
      setError(error.message || 'Có lỗi xảy ra. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  }

  if (!email || !code) {
    return null; // Will redirect
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
              <div className="w-16 h-1 bg-green-500"></div>
              <div className="w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center text-sm font-semibold">
                ✓
              </div>
              <div className="w-16 h-1 bg-blue-500"></div>
              <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center text-sm font-semibold">
                3
              </div>
            </div>
          </div>

          <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2 text-center">
            Đặt Mật Khẩu Mới
          </h2>
          <p className="text-gray-600 mb-6 text-center text-sm">
            Bước 3: Tạo mật khẩu mới cho tài khoản
          </p>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleResetPassword} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Mật Khẩu Mới
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Nhập mật khẩu mới"
                autoFocus
              />
            </div>

            {/* Always show password requirements */}
            <PasswordRequirements password={password} />

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Xác Nhận Mật Khẩu
              </label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Nhập lại mật khẩu mới"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white px-6 py-3 rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Đang xử lý...' : 'Hoàn Tất'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => {
                sessionStorage.removeItem('reset_email');
                sessionStorage.removeItem('reset_code');
                router.push('/auth/forgot-password');
              }}
              className="text-gray-600 hover:text-gray-700 text-sm"
            >
              ← Bắt đầu lại
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
