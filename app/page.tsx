'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import FeatureContent from '@/components/FeatureContent';
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
  const [ownedStores, setOwnedStores] = useState<Store[]>([]);
  const [initialLoading, setInitialLoading] = useState(true); // Only for first load
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);
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

  // Load stores when user is logged in (WITHOUT auto-requesting GPS)
  useEffect(() => {
    if (user) {
      loadStores(true); // Initial load with spinner
      loadOwnedStores();
    }
  }, [user]);

  async function loadOwnedStores() {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('stores')
        .select('*')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOwnedStores(data || []);
    } catch (error) {
      console.error('Error loading owned stores:', error);
    }
  }

  async function loadStores(isInitialLoad = false) {
    if (!user) return;

    // Only show loading spinner on initial load
    if (isInitialLoad) {
      setInitialLoading(true);
    }
    setGpsError(null);

    try {

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

      // Load stores WITHOUT requesting GPS initially
      // GPS permission will be requested only when user clicks a GPS-required store
      const storesWithoutGPS: StoreWithDistance[] = (fetchedStores || []).map(store => {
        const checkInStatus = checkInMap.get(store.id) || { type: 'none' };
        const staffId = staffMap.get(store.id);

        // If store doesn't require GPS, mark as ready
        if (!store.gps_required) {
          return {
            ...store,
            status: 'no-gps-required' as const,
            checkInStatus,
            staffId,
          };
        }

        // For GPS-required stores, mark as "no-gps" (will request permission when clicked)
        return {
          ...store,
          status: 'no-gps' as const,
          checkInStatus,
          staffId,
        };
      });

      setStores(storesWithoutGPS);
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
    const checkInStatus = store.checkInStatus || { type: 'none' };

    // Third+ click: Show dialog to choose action
    if (checkInStatus.type === 'completed') {
      setSelectedStore(store);
      setShowActionDialog(true);
      return;
    }

    // If store requires GPS, request permission NOW (when user clicks)
    if (store.gps_required) {
      try {
        setGpsLoading(true);
        setGpsError(null);

        const position = await getCurrentPosition();

        // Calculate distance to verify user is in range
        const distance = calculateDistance(
          position.coords.latitude,
          position.coords.longitude,
          store.latitude,
          store.longitude
        );

        const status = getStoreStatus(distance, store.radius_meters);

        if (status === 'far') {
          alert(`Bạn đang ở xa cửa hàng ${formatDistance(distance)}. Vui lòng đến gần hơn (trong phạm vi ${formatDistance(store.radius_meters || 100)}) để điểm danh.`);
          setGpsLoading(false);
          return;
        }

        // GPS verified - proceed to check-in with coordinates
        const params = new URLSearchParams({
          store: store.id,
          lat: String(position.coords.latitude),
          lon: String(position.coords.longitude),
        });
        router.push(`/checkin/submit?${params.toString()}`);
        setGpsLoading(false);

      } catch (error: any) {
        setGpsLoading(false);

        // Handle GPS errors gracefully
        let errorMessage = 'Không thể lấy vị trí GPS. ';

        if (error.code === 1) { // PERMISSION_DENIED
          errorMessage += 'Vui lòng cấp quyền truy cập vị trí cho trình duyệt trong cài đặt.';
        } else if (error.code === 2) { // POSITION_UNAVAILABLE
          errorMessage += 'Vị trí không khả dụng. Vui lòng bật GPS trên thiết bị.';
        } else if (error.code === 3) { // TIMEOUT
          errorMessage += 'Hết thời gian chờ. Vui lòng thử lại.';
        } else {
          errorMessage += 'Vui lòng bật GPS và cấp quyền truy cập vị trí.';
        }

        setGpsError(errorMessage);
        console.error('GPS error:', error);
        return;
      }
    } else {
      // No GPS required - proceed directly
      router.push(`/checkin/submit?store=${store.id}`);
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

            {/* Staff Store List */}
            {!initialLoading && stores.length > 0 && (
              <>
                <h3 className="text-lg font-semibold text-gray-800 mb-3">👤 Cửa hàng bạn làm việc</h3>
                <div className="space-y-3">
                {stores.map((store) => {
                  const isFar = store.status === 'far';
                  const noGps = store.status === 'no-gps';
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

                  if (isFar) {
                    actionText = 'Ngoài phạm vi';
                  } else if (checkInStatus.type === 'none') {
                    // First click → Check-in
                    actionText = 'Nhấn để check-in';
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
                      disabled={isFar || gpsLoading}
                      className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                        isFar
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
                          <p className={`text-sm font-medium ${isFar ? 'text-gray-500' : 'text-gray-800'}`}>
                            {actionText}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
                </div>
              </>
            )}


            {/* Owned Stores Section - Bottom */}
            {ownedStores.length > 0 && (
              <div className="mt-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-3">🏪 Cửa hàng của bạn</h3>
                <div className="space-y-2">
                  {ownedStores.map((store) => (
                    <Link
                      key={store.id}
                      href={`/owner/stores/${store.id}`}
                      className="block w-full bg-white border-2 border-purple-500 rounded-xl p-4 hover:shadow-lg transition-all active:scale-[0.98]"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h4 className="font-bold text-gray-800 text-lg">{store.name}</h4>
                          <p className="text-sm text-gray-600">{store.address}</p>
                        </div>
                        <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </main>
      ) : (
        // NOT LOGGED-IN VIEW - Show Feature Page Content
        <FeatureContent />
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
                onClick={() => {
                  setShowActionDialog(false);
                  // Navigate to confirmation page
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
                }}
                className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-3 rounded-lg font-semibold transition-all flex flex-col items-center justify-center gap-2"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span className="text-sm">Sửa giờ ra</span>
              </button>

              <button
                onClick={() => {
                  setShowActionDialog(false);
                  // Navigate to confirmation page
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
                }}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-lg font-semibold transition-all flex flex-col items-center justify-center gap-2"
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
            <p className="text-xs sm:text-sm text-gray-600">
              © 2026 diemdanh.net - Giải pháp chấm công thông minh
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
