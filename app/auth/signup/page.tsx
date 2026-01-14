'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { signUp, signInWithGoogle } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

export const runtime = 'edge';

function SignupContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [returnUrl, setReturnUrl] = useState('/');
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [invitation, setInvitation] = useState<any>(null);
  const [loadingInvite, setLoadingInvite] = useState(false);

  useEffect(() => {
    const url = searchParams.get('returnUrl');
    const token = searchParams.get('invite_token');

    if (url) {
      setReturnUrl(url);
    }

    if (token) {
      setInviteToken(token);
      loadInvitation(token);
    }
  }, [searchParams]);

  async function loadInvitation(token: string) {
    setLoadingInvite(true);
    try {
      const { data, error } = await supabase
        .from('staff')
        .select(`
          *,
          stores (
            name
          )
        `)
        .eq('invitation_token', token)
        .eq('status', 'invited')
        .single();

      if (error || !data) {
        setError('Lời mời không hợp lệ hoặc đã hết hạn');
        setInviteToken(null);
        return;
      }

      // Check if expired
      const expiresAt = new Date(data.invitation_expires_at);
      if (expiresAt < new Date()) {
        setError('Lời mời đã hết hạn. Vui lòng liên hệ quản lý để gửi lại lời mời.');
        setInviteToken(null);
        return;
      }

      setInvitation(data);
      // Pre-fill email from invitation
      setFormData(prev => ({ ...prev, email: data.email }));
    } catch (err) {
      console.error('Error loading invitation:', err);
      setError('Không thể tải thông tin lời mời');
    } finally {
      setLoadingInvite(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Mật khẩu không khớp');
      setLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setError('Mật khẩu phải có ít nhất 6 ký tự');
      setLoading(false);
      return;
    }

    try {
      console.log('🚀 [SIGNUP] Starting signup process...', { email: formData.email, hasInviteToken: !!inviteToken });

      const data = await signUp(formData.email, formData.password, formData.fullName);

      console.log('✅ [SIGNUP] Signup successful!', { userId: data.user?.id, email: data.user?.email });

      // Auto-link staff records using server-side API (bypasses RLS)
      if (data.user) {
        console.log('🔗 [SIGNUP] Calling link-account API...', {
          userId: data.user.id,
          email: formData.email,
          hasToken: !!inviteToken,
        });

        try {
          const linkResponse = await fetch('/api/staff/link-account', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: data.user.id,
              email: formData.email,
              fullName: formData.fullName,
              invitationToken: inviteToken,
            }),
          });

          console.log('🔗 [SIGNUP] API response status:', linkResponse.status);

          const linkResult = await linkResponse.json();
          console.log('🔗 [SIGNUP] API response:', linkResult);

          if (linkResult.success && linkResult.linked) {
            // Successfully linked to store(s)
            if (linkResult.storeNames && linkResult.storeNames.length > 0) {
              const storesList = linkResult.storeNames.join(', ');
              alert(`Đăng ký thành công! Bạn đã được thêm vào: ${storesList}`);
            } else {
              alert('Đăng ký thành công! Bạn đã được thêm vào cửa hàng.');
            }
            router.push('/');
            return;
          } else if (linkResult.error) {
            console.error('❌ [SIGNUP] Error linking staff records:', linkResult.error);
            alert(`Cảnh báo: Không thể liên kết tài khoản với cửa hàng. Lỗi: ${linkResult.error}`);
          } else {
            console.warn('⚠️ [SIGNUP] No staff records found to link');
          }
        } catch (linkError) {
          console.error('❌ [SIGNUP] Error calling link-account API:', linkError);
          alert('Cảnh báo: Không thể liên kết tài khoản với cửa hàng. Vui lòng liên hệ quản lý.');
        }
      }

      alert('Đăng ký thành công!');
      router.push(returnUrl);
    } catch (err: any) {
      // Translate common error messages to Vietnamese
      let errorMessage = 'Đăng ký thất bại';
      if (err.message) {
        if (err.message.includes('User already registered')) {
          errorMessage = 'Email này đã được đăng ký';
        } else if (err.message.includes('Email rate limit exceeded')) {
          errorMessage = 'Quá nhiều yêu cầu, vui lòng thử lại sau';
        } else if (err.message.includes('Invalid email')) {
          errorMessage = 'Email không hợp lệ';
        } else if (err.message.includes('Password should be at least')) {
          errorMessage = 'Mật khẩu phải có ít nhất 6 ký tự';
        } else {
          errorMessage = err.message;
        }
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSignIn() {
    try {
      setLoading(true);
      setError('');
      await signInWithGoogle();
    } catch (err: any) {
      setError('Đăng nhập Google thất bại. Vui lòng thử lại.');
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Đăng Ký</h1>
          <p className="text-gray-600">Tạo tài khoản mới</p>
        </div>

        {/* Invitation Banner */}
        {invitation && !loadingInvite && (
          <div className="mb-6 bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
            <div className="flex items-start gap-3">
              <svg className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <div>
                <p className="font-semibold text-blue-900 mb-1">Lời mời làm nhân viên</p>
                <p className="text-sm text-blue-800">
                  Bạn đã được mời tham gia <span className="font-semibold">{invitation.stores?.name || 'cửa hàng'}</span>
                </p>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Google Sign In Button */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full bg-white hover:bg-gray-50 text-gray-700 border-2 border-gray-300 px-6 py-3 rounded-lg font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-3"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          {loading ? 'Đang xử lý...' : 'Đăng ký bằng Google'}
        </button>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-4 bg-white text-gray-500">Hoặc đăng ký bằng email</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Họ và Tên
            </label>
            <input
              type="text"
              required
              value={formData.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900 placeholder-gray-400"
              placeholder="Nguyễn Văn A"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Email
            </label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              readOnly={!!invitation}
              className={`w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-400 ${
                invitation ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'
              }`}
              placeholder="email@example.com"
            />
            {invitation && (
              <p className="text-xs text-gray-500 mt-1">
                Email được cung cấp từ lời mời
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Mật Khẩu
            </label>
            <input
              type="password"
              required
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900 placeholder-gray-400"
              placeholder="••••••••"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Xác Nhận Mật Khẩu
            </label>
            <input
              type="password"
              required
              value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900 placeholder-gray-400"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-all disabled:opacity-50"
          >
            {loading ? 'Đang đăng ký...' : 'Đăng Ký'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-gray-600">
            Đã có tài khoản?{' '}
            <Link href={`/auth/login${returnUrl !== '/' ? `?returnUrl=${returnUrl}` : ''}`} className="text-blue-600 hover:underline font-semibold">
              Đăng nhập
            </Link>
          </p>
        </div>

        <div className="mt-6 text-center">
          <Link href="/" className="text-gray-500 hover:text-gray-700 text-sm">
            ← Quay lại trang chủ
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    }>
      <SignupContent />
    </Suspense>
  );
}
