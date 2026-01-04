'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import { supabase } from '@/lib/supabase';
import { Store } from '@/types';

export default function Home() {
  const router = useRouter();
  const [showStoreModal, setShowStoreModal] = useState(false);
  const [myStores, setMyStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    checkUser();

    // Listen for auth state changes (login/logout)
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, _session) => {
      if (event === 'SIGNED_OUT') {
        setUser(null);
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        const { getCurrentUser } = await import('@/lib/auth');
        const currentUser = await getCurrentUser();
        setUser(currentUser);
      }
    });

    // Cleanup subscription on unmount
    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  async function checkUser() {
    try {
      const { getCurrentUser } = await import('@/lib/auth');
      const currentUser = await getCurrentUser();
      setUser(currentUser);
    } catch (error) {
      console.error('Error checking user:', error);
    } finally {
      setLoadingUser(false);
    }
  }

  async function handleCheckInClick() {
    setLoading(true);
    try {
      // Check authentication
      const { getCurrentUser } = await import('@/lib/auth');
      const currentUser = await getCurrentUser();

      if (!currentUser) {
        router.push('/auth/login?returnUrl=' + encodeURIComponent('/'));
        return;
      }

      // Query stores where user is staff
      const { data: staffRecords, error } = await supabase
        .from('staff')
        .select('store_id')
        .eq('email', currentUser.email);

      if (error) throw error;

      if (!staffRecords || staffRecords.length === 0) {
        // No stores → go to QR scanner
        router.push('/checkin');
        return;
      }

      // Get store details
      const storeIds = staffRecords.map(s => s.store_id);
      const { data: stores, error: storesError } = await supabase
        .from('stores')
        .select('*')
        .in('id', storeIds);

      if (storesError) throw storesError;

      // Show modal with stores
      setMyStores(stores || []);
      setShowStoreModal(true);
    } catch (error) {
      console.error('Error checking stores:', error);
      // Fallback to QR scanner on error
      router.push('/checkin');
    } finally {
      setLoading(false);
    }
  }

  // Get current time for greeting
  function getCurrentGreeting() {
    const day = currentTime.toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' });
    const time = currentTime.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    return { day, time };
  }

  const { day, time } = getCurrentGreeting();
  const firstName = user?.full_name?.split(' ').slice(-1)[0] || user?.email?.split('@')[0];

  if (loadingUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col">
      <Header />

      {user ? (
        // ============================================
        // LOGGED-IN VIEW (Image #1)
        // ============================================
        <main className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8 py-8">
          <div className="max-w-2xl w-full">
            {/* Hero Title */}
            <div className="text-center mb-8">
              <h1 className="text-4xl sm:text-4xl md:text-5xl font-bold text-gray-800">
                Hệ Thống Điểm Danh<br />Thông Minh
              </h1>
            </div>

            {/* Greeting */}
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-1">
                Xin chào, {firstName}
              </h2>
              <p className="text-sm text-gray-600">{day}</p>
              <p className="text-lg font-semibold text-orange-600">{time}</p>
            </div>

            {/* Check-in Card */}
            <div className="flex justify-center">
              <button
                onClick={handleCheckInClick}
                disabled={loading}
                className="w-56 h-56 bg-white rounded-3xl shadow-lg hover:shadow-xl transition-all duration-300 flex flex-col items-center justify-center gap-4 active:scale-95"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-green-500 border-t-transparent"></div>
                ) : (
                  <>
                    <div className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center">
                      <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center">
                        <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    </div>
                    <span className="text-gray-800 font-bold text-xl">Điểm Danh</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </main>
      ) : (
        // ============================================
        // NOT LOGGED-IN VIEW (Image #2)
        // ============================================
        <main className="flex-1 flex flex-col">
          {/* Hero Section */}
          <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 text-center flex-1 flex flex-col justify-center">
            {/* Main Headline */}
            <div className="mb-8">
              <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-gray-800 mb-4 leading-tight">
                Quên máy chấm công.<br />
                Chỉ cần 1 link.
              </h1>
              <p className="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto mb-6">
                Nhân viên điểm danh trong <span className="text-blue-600 font-semibold">5 giây</span> bằng điện thoại.<br />
                Không cần cài app. Không cần máy chấm công đắt tiền.
              </p>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-4">
              <Link href="/auth/signup">
                <button className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white px-10 py-4 rounded-lg font-bold text-lg transition-all shadow-lg hover:shadow-xl">
                  Dùng Thử Miễn Phí 7 Ngày
                </button>
              </Link>
            </div>

            <p className="text-sm text-gray-600 mb-12">
              Đã có tài khoản?{' '}
              <Link href="/auth/login" className="text-blue-600 hover:underline font-semibold">
                Đăng nhập ngay
              </Link>
            </p>

            {/* Value Props */}
            <div className="grid sm:grid-cols-3 gap-6 max-w-3xl mx-auto mb-12">
              <div className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-all">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h3 className="font-bold text-gray-800 mb-2">Nhanh chóng</h3>
                <p className="text-sm text-gray-600">Quét QR, chụp ảnh, xong. Chỉ 5 giây mỗi lần điểm danh.</p>
              </div>

              <div className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-all">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <h3 className="font-bold text-gray-800 mb-2">Chính xác GPS</h3>
                <p className="text-sm text-gray-600">Xác thực vị trí thực tế. Chống gian lận điểm danh.</p>
              </div>

              <div className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-all">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <h3 className="font-bold text-gray-800 mb-2">Selfie xác thực</h3>
                <p className="text-sm text-gray-600">Chụp ảnh khuôn mặt mỗi lần. Đảm bảo đúng người.</p>
              </div>
            </div>

            {/* Social Proof */}
            <div className="bg-blue-50 rounded-xl p-6 max-w-2xl mx-auto mb-8">
              <p className="text-sm text-gray-600 mb-2">
                <span className="font-semibold text-blue-600">Miễn phí 100%</span> trong giai đoạn Beta
              </p>
              <p className="text-xs text-gray-500">
                Không cần thẻ tín dụng • Không cam kết dài hạn • Hủy bất cứ lúc nào
              </p>
            </div>

            {/* Link to About */}
            <Link href="/about" className="text-blue-600 hover:text-blue-700 font-semibold text-sm hover:underline">
              Xem chi tiết tính năng và bảng giá →
            </Link>
          </section>
        </main>
      )}

      {/* Store Selection Modal */}
      {showStoreModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowStoreModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-800">Chọn Cửa Hàng</h2>
                <button
                  onClick={() => setShowStoreModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(80vh-180px)]">
              {/* Scan QR Button */}
              <button
                type="button"
                onClick={() => router.push('/checkin')}
                className="w-full mb-6 bg-purple-600 hover:bg-purple-700 text-white px-6 py-4 rounded-xl font-semibold text-lg transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-3"
              >
                <svg className="w-6 h-6 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                </svg>
                <span>Quét Mã QR</span>
              </button>

              {/* My Stores */}
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wider mb-3">
                  Cửa Hàng Của Tôi ({myStores.length})
                </h3>
              </div>

              <div className="space-y-3">
                {myStores.map((store) => (
                  <button
                    key={store.id}
                    onClick={() => router.push(`/checkin/submit?store=${store.id}`)}
                    className="w-full bg-white border-2 border-gray-200 hover:border-green-500 hover:bg-green-50 rounded-xl p-4 transition-all text-left group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center flex-shrink-0">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-800 group-hover:text-green-600 transition-colors">
                          {store.name}
                        </h4>
                        <p className="text-sm text-gray-500 line-clamp-1">{store.address}</p>
                      </div>
                      <svg className="w-5 h-5 text-gray-400 group-hover:text-green-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-white mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <div className="flex flex-col items-center gap-4">
            <Link href="/about" className="text-blue-600 hover:text-blue-700 font-semibold text-sm sm:text-base">
              Giới thiệu về Diemdanh.net
            </Link>
            <p className="text-xs sm:text-sm text-gray-600">
              © 2026 Diemdanh.net - Giải pháp chấm công thông minh
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
