'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { signUp, signInWithGoogle } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { validatePassword, getPasswordErrorMessage } from '@/lib/password-validation';
import PasswordRequirements from '@/components/PasswordRequirements';

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
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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

    const passwordValidation = validatePassword(formData.password);
    if (!passwordValidation.isValid) {
      setError(getPasswordErrorMessage(formData.password));
      setLoading(false);
      return;
    }

    try {
      console.log('🚀 [SIGNUP] Starting signup process...', { email: formData.email, hasInviteToken: !!inviteToken });

      const data = await signUp(formData.email, formData.password, formData.fullName);

      console.log('✅ [SIGNUP] Signup successful!', { userId: data.user?.id, email: data.user?.email });

      if (data.user) {
        // Check if this is an invited user
        if (inviteToken) {
          console.log('👥 [SIGNUP] Invited user - auto-verifying email');

          // Auto-verify email for invited users (they already proved email access via invitation)
          try {
            const autoVerifyResponse = await fetch('/api/auth/auto-verify-oauth', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                userId: data.user.id,
                email: formData.email,
              }),
            });

            if (autoVerifyResponse.ok) {
              console.log('✅ [SIGNUP] Auto-verified invited user');
            }
          } catch (verifyError) {
            console.error('❌ [SIGNUP] Error auto-verifying invited user:', verifyError);
          }

          // Auto-link staff account
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

            const linkResult = await linkResponse.json();

            if (linkResult.success && linkResult.linked) {
              console.log('✅ [SIGNUP] Linked invited user to store(s)');

              // Sign out and redirect to login
              const { signOut } = await import('@/lib/auth');
              await signOut();

              // Show success message
              const storesList = linkResult.storeNames?.join(', ') || 'cửa hàng';
              alert(`Đăng ký thành công! Bạn đã được thêm vào: ${storesList}\n\nVui lòng đăng nhập để tiếp tục.`);
              router.push(`/auth/login${returnUrl && returnUrl !== '/' ? `?returnUrl=${returnUrl}` : ''}`);
              return;
            }
          } catch (linkError) {
            console.error('❌ [SIGNUP] Error linking invited user:', linkError);
          }

          // If linking failed, still allow login
          const { signOut } = await import('@/lib/auth');
          await signOut();
          alert('Đăng ký thành công! Vui lòng đăng nhập để tiếp tục.');
          router.push(`/auth/login${returnUrl && returnUrl !== '/' ? `?returnUrl=${returnUrl}` : ''}`);
          return;
        }

        // Regular user (not invited) - send verification code
        try {
          const verificationResponse = await fetch('/api/auth/send-verification', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: data.user.id,
              email: formData.email,
              fullName: formData.fullName,
            }),
          });

          const verificationData = await verificationResponse.json();

          if (!verificationResponse.ok) {
            console.error('❌ [SIGNUP] Error sending verification email:', verificationData.error);
            // Continue anyway, user can request resend
          }
        } catch (verificationError) {
          console.error('❌ [SIGNUP] Error calling send-verification API:', verificationError);
          // Continue anyway, user can request resend
        }

        // Store signup info for verification page
        sessionStorage.setItem('signup_user_id', data.user.id);
        sessionStorage.setItem('signup_email', formData.email);
        sessionStorage.setItem('signup_full_name', formData.fullName);
        if (returnUrl && returnUrl !== '/') {
          sessionStorage.setItem('signup_return_url', returnUrl);
        }

        // IMPORTANT: Sign out the user immediately after signup
        // They must verify their email before they can login
        console.log('🔒 [SIGNUP] Signing out user - must verify email first');
        const { signOut } = await import('@/lib/auth');
        await signOut();

        // Redirect to email verification page
        router.push('/auth/verify-email');
        return;
      }

      // If no user was created, show error
      alert('Đăng ký thất bại. Vui lòng thử lại.');
      router.push('/auth/signup');
    } catch (err: any) {
      // Translate common error messages to Vietnamese
      let errorMessage = 'Đăng ký thất bại';
      if (err.message) {
        const msg = err.message.toLowerCase();
        if (msg.includes('user already registered')) {
          errorMessage = 'Email này đã được đăng ký';
        } else if (msg.includes('email rate limit exceeded')) {
          errorMessage = 'Quá nhiều yêu cầu, vui lòng thử lại sau';
        } else if (msg.includes('invalid email')) {
          errorMessage = 'Email không hợp lệ';
        } else if (msg.includes('password') && msg.includes('contain')) {
          errorMessage = getPasswordErrorMessage(formData.password);
        } else if (msg.includes('password') && (msg.includes('weak') || msg.includes('should be at least'))) {
          errorMessage = 'Mật khẩu không đủ mạnh. Vui lòng kiểm tra các yêu cầu bên dưới.';
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
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900 placeholder-gray-400"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                tabIndex={-1}
              >
                {showPassword ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Always show password requirements */}
          <PasswordRequirements password={formData.password} />

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Xác Nhận Mật Khẩu
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                required
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900 placeholder-gray-400"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                tabIndex={-1}
              >
                {showConfirmPassword ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
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
