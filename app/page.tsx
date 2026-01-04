'use client';

import { useState } from 'react';
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col">
      <Header />

      <main className="flex-1 flex flex-col">
        {/* Hero Section */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 text-center">
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-gray-800 mb-4 sm:mb-6 leading-tight">
            Hệ Thống Điểm Danh Thông Minh
          </h1>
          <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-gray-600 mb-8 sm:mb-10 max-w-3xl mx-auto px-4">
            Giải pháp chấm công hiện đại với QR code, selfie và xác thực vị trí GPS
          </p>
        </section>

        {/* Quick Actions */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8 sm:pb-16 flex-1">
        <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:gap-8 max-w-4xl mx-auto">
          {/* Manage Button */}
          <Link href="/owner">
            <div className="w-full bg-white rounded-xl sm:rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 active:scale-95 sm:hover:-translate-y-2 border-2 border-transparent hover:border-blue-500 cursor-pointer">
              <div className="p-6 sm:p-8 lg:p-12 text-center">
                <div className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
                  <svg className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <h3 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-800">
                  Quản Lý
                </h3>
              </div>
            </div>
          </Link>

          {/* Check-in Button */}
          <button onClick={handleCheckInClick} disabled={loading} className="w-full">
            <div className="w-full bg-white rounded-xl sm:rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 active:scale-95 sm:hover:-translate-y-2 border-2 border-transparent hover:border-green-500 cursor-pointer">
              <div className="p-6 sm:p-8 lg:p-12 text-center">
                <div className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
                  {loading ? (
                    <div className="animate-spin rounded-full h-8 w-8 sm:h-10 sm:w-10 lg:h-12 lg:w-12 border-b-2 border-white"></div>
                  ) : (
                    <svg className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                </div>
                <h3 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-800">
                  Check-in
                </h3>
              </div>
            </div>
          </button>
        </div>
      </section>
      </main>

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
                onClick={() => router.push('/checkin')}
                className="w-full mb-4 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white px-6 py-4 rounded-xl font-semibold transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-3"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                </svg>
                Quét Mã QR
              </button>

              {/* My Stores */}
              <div className="mb-3">
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
