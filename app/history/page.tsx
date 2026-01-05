'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { getCurrentUser } from '@/lib/auth';
import { CheckIn } from '@/types';
import Header from '@/components/Header';

export default function CheckInHistory() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [checkIns, setCheckIns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [filterStore, setFilterStore] = useState<string>('all');
  const [stores, setStores] = useState<any[]>([]);
  const [detailsExpanded, setDetailsExpanded] = useState(true); // Expanded by default

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      router.push('/auth/login?returnUrl=/history');
      return;
    }
    setUser(currentUser);
    loadCheckIns(currentUser);
  }

  async function loadCheckIns(currentUser: any) {
    try {
      // Find all staff records for this user (by email)
      const { data: staffRecords, error: staffError } = await supabase
        .from('staff')
        .select('id, store_id, full_name, email, store:stores(*)')
        .eq('email', currentUser.email);

      if (staffError) throw staffError;

      if (!staffRecords || staffRecords.length === 0) {
        setLoading(false);
        return;
      }

      // Get unique stores
      const uniqueStores = Array.from(
        new Map(staffRecords.map((s: any) => [s.store.id, s.store])).values()
      );
      setStores(uniqueStores);

      // Get all staff IDs for this user
      const staffIds = staffRecords.map((s: any) => s.id);

      // Load all check-ins for these staff IDs
      const { data: checkInsData, error: checkInsError } = await supabase
        .from('check_ins')
        .select('*')
        .in('staff_id', staffIds)
        .order('check_in_time', { ascending: false })
        .limit(100);

      if (checkInsError) throw checkInsError;

      // Attach staff info to each check-in
      const checkInsWithStaff = (checkInsData || []).map(checkIn => {
        const staff = staffRecords.find((s: any) => s.id === checkIn.staff_id);
        return {
          ...checkIn,
          staff: staff,
          store: staff?.store
        };
      });

      setCheckIns(checkInsWithStaff);
    } catch (error) {
      console.error('Error loading check-ins:', error);
    } finally {
      setLoading(false);
    }
  }

  const filteredCheckIns = filterStore === 'all'
    ? checkIns
    : checkIns.filter((c) => c.store_id === filterStore);

  // Group check-ins by staff and date to determine shift numbers
  const checkInsWithShift = filteredCheckIns.map((checkIn) => {
    const checkInDate = new Date(checkIn.check_in_time).toDateString();
    const sameDay = filteredCheckIns.filter(
      (c) => c.staff_id === checkIn.staff_id && new Date(c.check_in_time).toDateString() === checkInDate
    );
    const sortedSameDay = sameDay.sort(
      (a, b) => new Date(a.check_in_time).getTime() - new Date(b.check_in_time).getTime()
    );
    const shiftNumber = sortedSameDay.findIndex((c) => c.id === checkIn.id) + 1;
    return { ...checkIn, shiftNumber };
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            Lịch Sử Điểm Danh
          </h1>
          <p className="text-gray-600">
            Xem tất cả các lần điểm danh của bạn
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
          </div>
        ) : checkIns.length === 0 ? (
          <div className="bg-white rounded-lg shadow-lg p-12 text-center">
            <svg className="w-24 h-24 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">
              Chưa có lịch sử điểm danh
            </h3>
            <p className="text-gray-500 mb-6">
              Bạn chưa thực hiện điểm danh lần nào
            </p>
            <Link href="/checkin">
              <button className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold">
                Điểm Danh Ngay
              </button>
            </Link>
          </div>
        ) : (
          <>
            {/* Filter by Store */}
            {stores.length > 1 && (
              <div className="bg-white rounded-lg shadow-lg p-4 mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Lọc theo cửa hàng:
                </label>
                <select
                  value={filterStore}
                  onChange={(e) => setFilterStore(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                >
                  <option value="all">Tất cả ({checkIns.length})</option>
                  {stores.map((store: any) => (
                    <option key={store.id} value={store.id}>
                      {store.name} ({checkIns.filter((c) => c.store_id === store.id).length})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Detailed Check-ins Table */}
            <div className="bg-white rounded-lg shadow-lg overflow-hidden">
              <div
                className="px-6 py-4 border-b border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => setDetailsExpanded(!detailsExpanded)}
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-800">Chi Tiết Điểm Danh</h2>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-600">
                      {filteredCheckIns.length} lượt điểm danh
                    </span>
                    <svg
                      className={`w-5 h-5 text-gray-600 transition-transform ${detailsExpanded ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>

              {detailsExpanded && (
                <>
                  {/* Desktop Table View */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                            Ngày
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                            Cửa hàng
                          </th>
                          <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                            Ca
                          </th>
                          <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                            Giờ vào
                          </th>
                          <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                            Ảnh vào
                          </th>
                          <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                            Giờ ra
                          </th>
                          <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                            Ảnh ra
                          </th>
                          <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                            Thời gian làm
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {filteredCheckIns.length === 0 ? (
                          <tr>
                            <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                              Không có dữ liệu
                            </td>
                          </tr>
                        ) : (
                          checkInsWithShift.map((checkIn) => {
                            const checkInDate = new Date(checkIn.check_in_time);
                            const checkOutTime = checkIn.check_out_time ? new Date(checkIn.check_out_time) : null;

                            // Calculate work duration
                            let workDuration = '-';
                            if (checkOutTime) {
                              const durationMs = checkOutTime.getTime() - checkInDate.getTime();
                              const hours = Math.floor(durationMs / (1000 * 60 * 60));
                              const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
                              workDuration = `${hours}h ${minutes}m`;
                            } else if (checkIn.status === 'success') {
                              workDuration = 'Đang làm';
                            }

                            return (
                              <tr key={checkIn.id} className="hover:bg-gray-50 transition-colors">
                                <td className="px-4 py-3 text-sm text-gray-700">
                                  {checkInDate.toLocaleDateString('vi-VN', {
                                    day: '2-digit',
                                    month: '2-digit',
                                    year: 'numeric',
                                  })}
                                </td>
                                <td className="px-4 py-3">
                                  <div className="text-sm font-semibold text-gray-800">
                                    {checkIn.store?.name || 'N/A'}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {checkIn.store?.address || ''}
                                  </div>
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">
                                    Ca {checkIn.shiftNumber}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-center text-sm text-gray-700">
                                  {checkInDate.toLocaleTimeString('vi-VN', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </td>
                                <td className="px-4 py-3 text-center">
                                  {checkIn.selfie_url ? (
                                    <button
                                      onClick={() => setSelectedImage(checkIn.selfie_url)}
                                      className="inline-block"
                                    >
                                      <img
                                        src={checkIn.selfie_url}
                                        alt="Selfie vào"
                                        className="w-12 h-12 rounded-lg object-cover border border-gray-200 hover:border-green-400 cursor-pointer transition-colors"
                                      />
                                    </button>
                                  ) : (
                                    <span className="text-gray-400 text-xs">-</span>
                                  )}
                                </td>
                                <td className="px-4 py-3 text-center text-sm text-gray-700">
                                  {checkOutTime ? (
                                    checkOutTime.toLocaleTimeString('vi-VN', {
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })
                                  ) : (
                                    <span className="text-blue-600 font-medium">Chưa checkout</span>
                                  )}
                                </td>
                                <td className="px-4 py-3 text-center">
                                  {checkIn.checkout_selfie_url ? (
                                    <button
                                      onClick={() => setSelectedImage(checkIn.checkout_selfie_url)}
                                      className="inline-block"
                                    >
                                      <img
                                        src={checkIn.checkout_selfie_url}
                                        alt="Selfie ra"
                                        className="w-12 h-12 rounded-lg object-cover border border-gray-200 hover:border-green-400 cursor-pointer transition-colors"
                                      />
                                    </button>
                                  ) : (
                                    <span className="text-gray-400 text-xs">-</span>
                                  )}
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <span className={`text-sm font-medium ${
                                    workDuration === 'Đang làm' ? 'text-blue-600' :
                                    workDuration === '-' ? 'text-gray-400' :
                                    'text-gray-700'
                                  }`}>
                                    {workDuration}
                                  </span>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Card View */}
                  <div className="md:hidden divide-y divide-gray-200">
                    {filteredCheckIns.length === 0 ? (
                      <div className="px-4 py-8 text-center text-gray-500">
                        Không có dữ liệu
                      </div>
                    ) : (
                      checkInsWithShift.map((checkIn) => {
                        const checkInDate = new Date(checkIn.check_in_time);
                        const checkOutTime = checkIn.check_out_time ? new Date(checkIn.check_out_time) : null;

                        // Calculate work duration
                        let workDuration = '-';
                        if (checkOutTime) {
                          const durationMs = checkOutTime.getTime() - checkInDate.getTime();
                          const hours = Math.floor(durationMs / (1000 * 60 * 60));
                          const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
                          workDuration = `${hours}h ${minutes}m`;
                        } else if (checkIn.status === 'success') {
                          workDuration = 'Đang làm';
                        }

                        return (
                          <div key={checkIn.id} className="p-4 bg-white">
                            {/* Header: Date + Shift */}
                            <div className="flex items-center justify-between mb-3">
                              <div className="text-sm font-semibold text-gray-700">
                                {checkInDate.toLocaleDateString('vi-VN', {
                                  day: '2-digit',
                                  month: '2-digit',
                                  year: 'numeric',
                                })}
                              </div>
                              <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">
                                Ca {checkIn.shiftNumber}
                              </span>
                            </div>

                            {/* Store Info */}
                            <div className="mb-3 pb-3 border-b border-gray-100">
                              <div className="text-base font-bold text-gray-800">
                                {checkIn.store?.name || 'N/A'}
                              </div>
                              {checkIn.store?.address && (
                                <div className="text-xs text-gray-500 mt-1">
                                  {checkIn.store.address}
                                </div>
                              )}
                            </div>

                            {/* Check-in Section */}
                            <div className="grid grid-cols-2 gap-4 mb-3">
                              <div>
                                <div className="text-xs text-gray-500 mb-1">Giờ vào</div>
                                <div className="text-sm font-semibold text-gray-800">
                                  {checkInDate.toLocaleTimeString('vi-VN', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </div>
                              </div>
                              <div>
                                <div className="text-xs text-gray-500 mb-1">Ảnh vào</div>
                                {checkIn.selfie_url ? (
                                  <button
                                    onClick={() => setSelectedImage(checkIn.selfie_url)}
                                    className="inline-block"
                                  >
                                    <img
                                      src={checkIn.selfie_url}
                                      alt="Selfie vào"
                                      className="w-16 h-16 rounded-lg object-cover border border-gray-200 hover:border-green-400 cursor-pointer transition-colors"
                                    />
                                  </button>
                                ) : (
                                  <span className="text-gray-400 text-xs">-</span>
                                )}
                              </div>
                            </div>

                            {/* Check-out Section */}
                            <div className="grid grid-cols-2 gap-4 mb-3">
                              <div>
                                <div className="text-xs text-gray-500 mb-1">Giờ ra</div>
                                {checkOutTime ? (
                                  <div className="text-sm font-semibold text-gray-800">
                                    {checkOutTime.toLocaleTimeString('vi-VN', {
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })}
                                  </div>
                                ) : (
                                  <span className="text-blue-600 font-medium text-sm">Chưa checkout</span>
                                )}
                              </div>
                              <div>
                                <div className="text-xs text-gray-500 mb-1">Ảnh ra</div>
                                {checkIn.checkout_selfie_url ? (
                                  <button
                                    onClick={() => setSelectedImage(checkIn.checkout_selfie_url)}
                                    className="inline-block"
                                  >
                                    <img
                                      src={checkIn.checkout_selfie_url}
                                      alt="Selfie ra"
                                      className="w-16 h-16 rounded-lg object-cover border border-gray-200 hover:border-green-400 cursor-pointer transition-colors"
                                    />
                                  </button>
                                ) : (
                                  <span className="text-gray-400 text-xs">-</span>
                                )}
                              </div>
                            </div>

                            {/* Work Duration */}
                            <div className="bg-gray-50 rounded-lg px-3 py-2">
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-gray-600">Thời gian làm:</span>
                                <span className={`text-sm font-bold ${
                                  workDuration === 'Đang làm' ? 'text-blue-600' :
                                  workDuration === '-' ? 'text-gray-400' :
                                  'text-green-600'
                                }`}>
                                  {workDuration}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </main>

      {/* Image Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-4xl w-full">
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute -top-12 right-0 text-white hover:text-gray-300 transition-colors"
            >
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <img
              src={selectedImage}
              alt="Full size selfie"
              className="w-full h-auto rounded-lg shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  );
}
