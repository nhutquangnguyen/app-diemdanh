'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import { supabase } from '@/lib/supabase';
import { getCurrentUserSync } from '@/lib/auth';
import { calculateDistance, formatDistance, getCurrentPosition, getStoreStatus } from '@/lib/geo';
import { Store } from '@/types';

interface CheckInStatus {
  type: 'none' | 'active' | 'completed';
  activeCheckIn?: any;
  lastCompletedCheckIn?: any;
}

interface StoreWithDistance extends Store {
  distance?: number;
  status?: 'in-range' | 'near' | 'far' | 'no-gps' | 'no-gps-required';
  checkInStatus?: CheckInStatus;
  staffId?: string;
}

export default function Home() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [stores, setStores] = useState<StoreWithDistance[]>([]);
  const [initialLoading, setInitialLoading] = useState(true); // Only for first load
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [submitting, setSubmitting] = useState<string | null>(null); // store ID being submitted
  const [showActionDialog, setShowActionDialog] = useState(false);
  const [selectedStore, setSelectedStore] = useState<StoreWithDistance | null>(null);

  // Hydrate user state on mount (client-side only)
  useEffect(() => {
    setUser(getCurrentUserSync());
  }, []);

  // Auth verification
  useEffect(() => {
    let mounted = true;

    async function verifyAuth() {
      try {
        const { getCurrentUser } = await import('@/lib/auth');
        const currentUser = await getCurrentUser();
        if (mounted) {
          setUser(currentUser);
        }
      } catch (error) {
        console.error('Error verifying user:', error);
        if (mounted) {
          setUser(null);
        }
      }
    }

    verifyAuth();

    const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      if (event === 'SIGNED_OUT') {
        setUser(null);
      } else if (event === 'SIGNED_IN') {
        setUser(session?.user || null);
      }
    });

    return () => {
      mounted = false;
      data.subscription.unsubscribe();
    };
  }, []);

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Load stores with GPS when user is logged in
  useEffect(() => {
    if (user) {
      loadStoresWithGPS(true); // Initial load with spinner

      // Refresh GPS every 30 seconds (background update, no spinner)
      const interval = setInterval(() => loadStoresWithGPS(false), 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  async function loadStoresWithGPS(isInitialLoad = false) {
    if (!user) return;

    // Only show loading spinner on initial load
    if (isInitialLoad) {
      setInitialLoading(true);
    }
    setGpsError(null);
    setGpsLoading(true);

    try {
      // Start GPS fetch early (runs in parallel with DB queries)
      const gpsPromise = getCurrentPosition().catch(err => {
        console.warn('GPS fetch failed:', err);
        return null;
      });

      // Fetch user's stores with staff IDs
      const { data: staffRecords, error } = await supabase
        .from('staff')
        .select('id, store_id')
        .eq('email', user.email);

      if (error) throw error;

      if (!staffRecords || staffRecords.length === 0) {
        setStores([]);
        setInitialLoading(false);
        return;
      }

      // Create map of store_id -> staff_id
      const staffMap = new Map(staffRecords.map(s => [s.store_id, s.id]));

      const storeIds = staffRecords.map(s => s.store_id);

      // Get today's date range
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const todayStart = today.toISOString();
      const tomorrowStart = tomorrow.toISOString();

      const staffIds = staffRecords.map(s => s.id);

      // Run stores and check-ins queries in parallel
      const [storesResult, checkInsResult] = await Promise.all([
        supabase.from('stores').select('*').in('id', storeIds),
        supabase.from('check_ins')
          .select('*')
          .in('staff_id', staffIds)
          .gte('check_in_time', todayStart)
          .lt('check_in_time', tomorrowStart)
          .order('check_in_time', { ascending: false })
      ]);

      const { data: fetchedStores, error: storesError } = storesResult;
      if (storesError) throw storesError;

      const { data: checkIns } = checkInsResult;

      // Create check-in status map
      const checkInMap = new Map<string, CheckInStatus>();

      (fetchedStores || []).forEach(store => {
        const staffId = staffMap.get(store.id);
        if (!staffId) return;

        const storeCheckIns = (checkIns || []).filter(ci => ci.staff_id === staffId && ci.store_id === store.id);

        const activeCheckIn = storeCheckIns.find(ci => !ci.check_out_time);
        const completedCheckIns = storeCheckIns.filter(ci => ci.check_out_time);
        const lastCompleted = completedCheckIns[0]; // Most recent

        if (activeCheckIn) {
          checkInMap.set(store.id, { type: 'active', activeCheckIn });
        } else if (lastCompleted) {
          checkInMap.set(store.id, { type: 'completed', lastCompletedCheckIn: lastCompleted });
        } else {
          checkInMap.set(store.id, { type: 'none' });
        }
      });

      // Wait for GPS position (started earlier in parallel)
      const position = await gpsPromise;

      if (position) {
        const userLat = position.coords.latitude;
        const userLon = position.coords.longitude;

        // Calculate distances
        const storesWithDistance: StoreWithDistance[] = (fetchedStores || []).map(store => {
          const checkInStatus = checkInMap.get(store.id) || { type: 'none' };
          const staffId = staffMap.get(store.id);

          // If store doesn't require GPS, skip distance calculation
          if (!store.gps_required) {
            return {
              ...store,
              status: 'no-gps-required' as const,
              checkInStatus,
              staffId,
            };
          }

          const distance = calculateDistance(userLat, userLon, store.latitude, store.longitude);
          const status = getStoreStatus(distance, store.radius_meters);

          return {
            ...store,
            distance,
            status,
            checkInStatus,
            staffId,
          };
        });

        // Sort: no-gps-required first, then in-range, then by distance
        storesWithDistance.sort((a, b) => {
          // No GPS required stores first
          if (a.status === 'no-gps-required' && b.status !== 'no-gps-required') return -1;
          if (a.status !== 'no-gps-required' && b.status === 'no-gps-required') return 1;

          // Then in-range stores
          if (a.status === 'in-range' && b.status !== 'in-range') return -1;
          if (a.status !== 'in-range' && b.status === 'in-range') return 1;

          // Then sort by distance
          return (a.distance || 0) - (b.distance || 0);
        });

        setStores(storesWithDistance);
      } else {
        // GPS failed - show stores without GPS info
        console.warn('GPS not available');
        setGpsError('Không thể lấy vị trí GPS. Vui lòng bật GPS và cấp quyền.');

        // Show stores without GPS info
        setStores((fetchedStores || []).map(store => {
          const checkInStatus = checkInMap.get(store.id) || { type: 'none' };
          const staffId = staffMap.get(store.id);

          // If store doesn't require GPS, still allow check-in
          if (!store.gps_required) {
            return {
              ...store,
              status: 'no-gps-required' as const,
              checkInStatus,
              staffId,
            };
          }

          // For stores that need GPS, mark as no-gps
          return {
            ...store,
            status: 'no-gps' as const,
            checkInStatus,
            staffId,
          };
        }));
      }
    } catch (error) {
      console.error('Error loading stores:', error);
    } finally {
      if (isInitialLoad) {
        setInitialLoading(false);
      }
      setGpsLoading(false);
    }
  }

  async function handleStoreClick(store: StoreWithDistance) {
    // Check if too far
    if (store.status === 'far') {
      alert(`Bạn quá xa cửa hàng (${formatDistance(store.distance || 0)}). Vui lòng đến gần hơn để điểm danh.`);
      return;
    }

    // Check if GPS needed but not available
    if (store.status === 'no-gps') {
      alert('Vui lòng bật GPS để điểm danh');
      return;
    }

    const checkInStatus = store.checkInStatus || { type: 'none' };

    // Third+ click: Show dialog to choose action
    if (checkInStatus.type === 'completed') {
      setSelectedStore(store);
      setShowActionDialog(true);
      return;
    }

    // First click (no check-in) or Second click (active check-in)
    // Both go through selfie page if required
    if (store.selfie_required) {
      // Pass GPS coordinates if we have them (saves re-fetching GPS)
      if (store.gps_required && store.distance !== undefined) {
        // We have GPS data - pass it along
        getCurrentPosition().then(position => {
          const params = new URLSearchParams({
            store: store.id,
            lat: String(position.coords.latitude),
            lon: String(position.coords.longitude),
          });
          router.push(`/checkin/submit?${params.toString()}`);
        }).catch(() => {
          // GPS failed, go without coordinates (will fetch again)
          router.push(`/checkin/submit?store=${store.id}`);
        });
      } else {
        // No GPS required or GPS not available - go directly
        router.push(`/checkin/submit?store=${store.id}`);
      }
      return;
    }

    // Instant check-in or check-out (no selfie required)
    await handleInstantAction(store, checkInStatus);
  }

  async function handleInstantAction(store: StoreWithDistance, checkInStatus: CheckInStatus, actionType?: 'check-in' | 'check-out' | 're-checkout') {
    setSubmitting(store.id);

    try {
      const staffId = store.staffId;
      if (!staffId) {
        throw new Error('Không tìm thấy thông tin nhân viên');
      }

      const currentTime = new Date();

      // Determine action
      let action = actionType;
      if (!action) {
        if (checkInStatus.type === 'none') {
          action = 'check-in';
        } else if (checkInStatus.type === 'active') {
          action = 'check-out';
        }
      }

      // Get location based on GPS requirement
      let latitude: number;
      let longitude: number;
      let distance = 0;

      if (store.gps_required) {
        const position = await getCurrentPosition();
        latitude = position.coords.latitude;
        longitude = position.coords.longitude;
        distance = calculateDistance(latitude, longitude, store.latitude, store.longitude);
      } else {
        latitude = store.latitude || 0;
        longitude = store.longitude || 0;
        distance = 0;
      }

      // Perform action
      if (action === 'check-in') {
        // Instant check-in
        const { error } = await supabase.from('check_ins').insert({
          staff_id: staffId,
          store_id: store.id,
          check_in_time: currentTime.toISOString(),
          latitude,
          longitude,
          distance_meters: distance,
          status: 'success',
        });

        if (error) throw error;
        alert('✅ Check-in thành công!');

      } else if (action === 'check-out' && checkInStatus.activeCheckIn) {
        // Instant check-out
        const { error } = await supabase
          .from('check_ins')
          .update({
            check_out_time: currentTime.toISOString(),
            check_out_latitude: latitude,
            check_out_longitude: longitude,
            check_out_distance_meters: distance,
          })
          .eq('id', checkInStatus.activeCheckIn.id);

        if (error) throw error;

        // Calculate duration
        const checkInTime = new Date(checkInStatus.activeCheckIn.check_in_time);
        const durationMin = Math.floor((currentTime.getTime() - checkInTime.getTime()) / 1000 / 60);
        const hours = Math.floor(durationMin / 60);
        const minutes = durationMin % 60;

        alert(`✅ Check-out thành công!\nThời gian làm việc: ${hours} giờ ${minutes} phút`);

      } else if (action === 're-checkout' && checkInStatus.lastCompletedCheckIn) {
        // Re-checkout: Update the check-out time
        const { error } = await supabase
          .from('check_ins')
          .update({
            check_out_time: currentTime.toISOString(),
            check_out_latitude: latitude,
            check_out_longitude: longitude,
            check_out_distance_meters: distance,
          })
          .eq('id', checkInStatus.lastCompletedCheckIn.id);

        if (error) throw error;
        alert('✅ Đã cập nhật giờ ra!');
      }

      // Reload stores to refresh status
      await loadStoresWithGPS(false);
      setSubmitting(null);
      setShowActionDialog(false);

    } catch (error: any) {
      console.error('Action error:', error);
      alert('Lỗi khi thực hiện. Vui lòng thử lại.');
      setSubmitting(null);
    }
  }

  // Get greeting info
  function getCurrentGreeting() {
    const time = currentTime.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    return { time };
  }

  const { time } = getCurrentGreeting();
  const firstName = user?.user_metadata?.full_name?.split(' ').slice(-1)[0] || user?.email?.split('@')[0];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col">
      <Header />

      {user ? (
        <main className="flex-1 flex flex-col px-4 sm:px-6 lg:px-8 py-8">
          <div className="max-w-2xl w-full mx-auto">
            {/* Greeting */}
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">
                Xin chào, {firstName}
              </h2>
              <p className="text-lg font-semibold text-orange-600">{time}</p>
            </div>

            {/* GPS Error */}
            {gpsError && (
              <div className="mb-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-800">⚠️ {gpsError}</p>
              </div>
            )}

            {/* Loading */}
            {initialLoading && stores.length === 0 && (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            )}

            {/* Store List */}
            {!initialLoading && stores.length > 0 && (
              <div className="space-y-3">
                {stores.map((store) => {
                  const isFar = store.status === 'far';
                  const noGps = store.status === 'no-gps';
                  const isSubmitting = submitting === store.id;
                  const checkInStatus = store.checkInStatus || { type: 'none' };

                  // Determine action text and distance display
                  let actionText = '';
                  let distanceText = '';

                  // Show distance for GPS-required stores with radius context
                  if (store.gps_required) {
                    if (store.distance !== undefined && !noGps) {
                      const dist = formatDistance(store.distance);
                      const radius = store.radius_meters || 100;
                      const radiusText = formatDistance(radius);

                      if (isFar) {
                        distanceText = `${dist} (cần < ${radiusText})`;
                      } else {
                        distanceText = `${dist} (trong phạm vi ${radiusText})`;
                      }
                    } else if (gpsLoading) {
                      distanceText = 'Đang lấy vị trí GPS...';
                    }
                  }

                  if (isFar || noGps) {
                    if (isFar) {
                      actionText = 'Ngoài phạm vi';
                    } else {
                      actionText = 'Vui lòng bật GPS trong cài đặt thiết bị';
                    }
                  } else if (checkInStatus.type === 'none') {
                    // First click → Check-in (no time yet)
                    actionText = store.selfie_required ? 'Check-in (có ảnh)' : 'Check-in';
                  } else if (checkInStatus.type === 'active') {
                    // Currently checked in - show status clearly
                    const checkInTime = new Date(checkInStatus.activeCheckIn.check_in_time);
                    const timeStr = checkInTime.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
                    actionText = `Đang làm việc (vào ca lúc ${timeStr})`;
                  } else if (checkInStatus.type === 'completed') {
                    // Already checked out - show completed status
                    const checkInTime = new Date(checkInStatus.lastCompletedCheckIn.check_in_time);
                    const checkOutTime = new Date(checkInStatus.lastCompletedCheckIn.check_out_time);
                    const inTime = checkInTime.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
                    const outTime = checkOutTime.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
                    actionText = `Ca cuối: ${inTime} → ${outTime}`;
                  }

                  return (
                    <button
                      key={store.id}
                      onClick={() => handleStoreClick(store)}
                      disabled={isFar || noGps || isSubmitting}
                      className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                        isFar || noGps
                          ? 'bg-gray-100 border-gray-300 cursor-not-allowed opacity-60'
                          : 'bg-white border-blue-500 hover:shadow-lg active:scale-[0.98]'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {/* Status Dot */}
                        <div className="flex-shrink-0 mt-1.5">
                          <div className={`w-3 h-3 rounded-full ${
                            checkInStatus.type === 'active' ? 'bg-green-500' : 'bg-gray-400'
                          }`} />
                        </div>

                        <div className="flex-1">
                          {/* Store Name */}
                          <h3 className="font-bold text-gray-800 text-xl mb-1">
                            {store.name}
                          </h3>

                          {/* Distance info (if GPS required and available) */}
                          {distanceText && (
                            <p className="text-xs text-gray-500 mb-1">
                              {distanceText}
                            </p>
                          )}

                          {/* Action Text - Black (or gray if disabled) */}
                          <p className={`text-sm font-medium ${isFar || noGps ? 'text-gray-500' : 'text-gray-800'}`}>
                            {actionText}
                          </p>

                          {/* Loading */}
                          {isSubmitting && (
                            <p className="text-xs text-blue-600 mt-1">
                              ⏳ Đang xử lý...
                            </p>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* No Stores - Show QR */}
            {!initialLoading && stores.length === 0 && (
              <div className="text-center py-8">
                <div className="mb-6">
                  <div className="text-6xl mb-4">📱</div>
                  <h3 className="text-xl font-semibold text-gray-800 mb-2">
                    Quét Mã QR để điểm danh
                  </h3>
                  <p className="text-sm text-gray-600">
                    Yêu cầu mã QR từ quản lý hoặc quét tại cửa hàng
                  </p>
                </div>
                <Link href="/checkin">
                  <button className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all shadow-lg hover:shadow-xl">
                    🔍 Quét Mã QR
                  </button>
                </Link>
              </div>
            )}

            {/* Fallback QR button */}
            {stores.length > 0 && (
              <div className="mt-6">
                <Link href="/checkin">
                  <button className="w-full bg-gray-700 hover:bg-gray-800 text-white px-6 py-3 rounded-lg font-semibold transition-all">
                    🔍 Quét QR Cửa Hàng Khác
                  </button>
                </Link>
              </div>
            )}
          </div>
        </main>
      ) : (
        // NOT LOGGED-IN VIEW
        <main className="flex-1 flex flex-col">
          <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 text-center flex-1 flex flex-col justify-center">
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

            <div className="bg-blue-50 rounded-xl p-6 max-w-2xl mx-auto mb-8">
              <p className="text-sm text-gray-600 mb-2">
                <span className="font-semibold text-blue-600">Miễn phí 100%</span> trong giai đoạn Beta
              </p>
              <p className="text-xs text-gray-500">
                Không cần thẻ tín dụng • Không cam kết dài hạn • Hủy bất cứ lúc nào
              </p>
            </div>

            <Link href="/about" className="text-blue-600 hover:text-blue-700 font-semibold text-sm hover:underline">
              Xem chi tiết tính năng và bảng giá →
            </Link>
          </section>
        </main>
      )}

      {/* Action Dialog */}
      {showActionDialog && selectedStore && selectedStore.checkInStatus?.type === 'completed' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="mb-4">
              <h3 className="text-xl font-bold text-gray-800 mb-1">
                Bạn đã ra ca lúc{' '}
                {new Date(selectedStore.checkInStatus.lastCompletedCheckIn.check_out_time).toLocaleTimeString('vi-VN', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </h3>
              <p className="text-sm text-gray-600">Chọn hành động tiếp theo:</p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-gray-700 mb-1">
                <span className="font-semibold">Cửa hàng:</span> {selectedStore.name}
              </p>
              <p className="text-sm text-gray-700">
                <span className="font-semibold">Ca làm việc:</span>{' '}
                {new Date(selectedStore.checkInStatus.lastCompletedCheckIn.check_in_time).toLocaleTimeString('vi-VN', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
                {' → '}
                {new Date(selectedStore.checkInStatus.lastCompletedCheckIn.check_out_time).toLocaleTimeString('vi-VN', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <button
                onClick={async () => {
                  // If selfie required, navigate to selfie page
                  if (selectedStore.selfie_required) {
                    setShowActionDialog(false);
                    // Pass GPS if required
                    if (selectedStore.gps_required && selectedStore.distance !== undefined) {
                      getCurrentPosition().then(position => {
                        const params = new URLSearchParams({
                          store: selectedStore.id,
                          lat: String(position.coords.latitude),
                          lon: String(position.coords.longitude),
                          action: 're-checkout',
                        });
                        router.push(`/checkin/submit?${params.toString()}`);
                      }).catch(() => {
                        router.push(`/checkin/submit?store=${selectedStore.id}&action=re-checkout`);
                      });
                    } else {
                      router.push(`/checkin/submit?store=${selectedStore.id}&action=re-checkout`);
                    }
                  } else {
                    // No selfie required - instant action
                    await handleInstantAction(selectedStore, selectedStore.checkInStatus!, 're-checkout');
                  }
                }}
                disabled={submitting !== null}
                className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-3 rounded-lg font-semibold transition-all flex flex-col items-center justify-center gap-2 disabled:opacity-50"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span className="text-sm">Sửa giờ ra</span>
              </button>

              <button
                onClick={async () => {
                  setShowActionDialog(false);
                  // If selfie required, navigate to selfie page
                  if (selectedStore.selfie_required) {
                    // Pass GPS if required
                    if (selectedStore.gps_required && selectedStore.distance !== undefined) {
                      getCurrentPosition().then(position => {
                        const params = new URLSearchParams({
                          store: selectedStore.id,
                          lat: String(position.coords.latitude),
                          lon: String(position.coords.longitude),
                          action: 'check-in',
                        });
                        router.push(`/checkin/submit?${params.toString()}`);
                      }).catch(() => {
                        router.push(`/checkin/submit?store=${selectedStore.id}&action=check-in`);
                      });
                    } else {
                      router.push(`/checkin/submit?store=${selectedStore.id}&action=check-in`);
                    }
                  } else {
                    // No selfie required - instant action
                    await handleInstantAction(selectedStore, { type: 'none' }, 'check-in');
                  }
                }}
                disabled={submitting !== null}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-lg font-semibold transition-all flex flex-col items-center justify-center gap-2 disabled:opacity-50"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                </svg>
                <span className="text-sm">Vào ca mới</span>
              </button>
            </div>

            <button
              onClick={() => {
                setShowActionDialog(false);
                setSelectedStore(null);
              }}
              className="w-full bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-lg font-semibold transition-all"
            >
              Hủy
            </button>
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
