'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import { supabase } from '@/lib/supabase';
import { getCurrentUserSync, getCurrentUser } from '@/lib/auth';
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
  const [studentClasses, setStudentClasses] = useState<Store[]>([]);
  const [initialLoading, setInitialLoading] = useState(true); // Only for first load
  const [gpsLoading, setGpsLoading] = useState(false);
  const [showActionDialog, setShowActionDialog] = useState(false);
  const [selectedStore, setSelectedStore] = useState<StoreWithDistance | null>(null);
  const [showGpsErrorDialog, setShowGpsErrorDialog] = useState(false);
  const [showCameraErrorDialog, setShowCameraErrorDialog] = useState(false);

  // Hydrate user state on mount (client-side only)
  useEffect(() => {
    setUser(getCurrentUserSync());
  }, []);

  // Auth verification
  useEffect(() => {
    let mounted = true;
    let redirectTimeout: NodeJS.Timeout | null = null;

    async function verifyAuth() {
      try {
        // Set timeout to force redirect if verification takes too long
        redirectTimeout = setTimeout(() => {
          const syncUser = getCurrentUserSync();
          if (!syncUser && mounted) {
            // Force redirect if still no user after 2 seconds
            window.location.href = '/auth/login';
          }
        }, 2000);

        const currentUser = await getCurrentUser();

        // Clear timeout if we got a response
        if (redirectTimeout) clearTimeout(redirectTimeout);

        if (mounted) {
          setUser(currentUser);
          // If no user after verification, use window.location for instant redirect
          if (!currentUser) {
            window.location.href = '/auth/login';
          }
        }
      } catch (error) {
        console.error('Error verifying user:', error);
        if (redirectTimeout) clearTimeout(redirectTimeout);
        if (mounted) {
          setUser(null);
          window.location.href = '/auth/login';
        }
      }
    }

    verifyAuth();

    const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      if (event === 'SIGNED_OUT') {
        setUser(null);
        router.push('/auth/login');
      } else if (event === 'SIGNED_IN') {
        setUser(session?.user || null);
      }
    });

    return () => {
      mounted = false;
      if (redirectTimeout) clearTimeout(redirectTimeout);
      data.subscription.unsubscribe();
    };
  }, [router]);

  // Update time every minute instead of every second to reduce re-renders
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // 60 seconds

    return () => clearInterval(timer);
  }, []);

  // Load stores when user is logged in (WITHOUT auto-requesting GPS)
  useEffect(() => {
    if (user) {
      loadStores(true); // Initial load with spinner
      loadOwnedStores();
      loadStudentClasses();
    }
  }, [user]);

  async function loadOwnedStores() {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('stores')
        .select('*')
        .eq('owner_id', user.id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOwnedStores(data || []);
    } catch (error) {
      console.error('Error loading owned stores:', error);
    }
  }

  async function loadStudentClasses() {
    if (!user) return;

    try {
      // Load classes where user is a student
      const { data: studentRecords, error: studentError } = await supabase
        .from('students')
        .select('class_id')
        .eq('user_id', user.id)
        .eq('status', 'active');

      if (studentError) throw studentError;

      if (!studentRecords || studentRecords.length === 0) {
        setStudentClasses([]);
        return;
      }

      const classIds = studentRecords.map(s => s.class_id);

      // Load the class details
      const { data: classes, error: classesError } = await supabase
        .from('stores')
        .select('*')
        .in('id', classIds)
        .eq('workspace_type', 'education')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (classesError) throw classesError;

      setStudentClasses(classes || []);
    } catch (error) {
      console.error('Error loading student classes:', error);
    }
  }

  async function loadStores(isInitialLoad = false) {
    if (!user) return;

    // Only show loading spinner on initial load
    if (isInitialLoad) {
      setInitialLoading(true);
    }

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
        supabase.from('stores').select('*').in('id', storeIds).is('deleted_at', null),
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

  // Navigate to staff page for this store
  function handleStoreClick(store: StoreWithDistance) {
    router.push(`/owner/${store.id}`);
  }

  // Quick check-in action
  async function handleQuickCheckIn(store: StoreWithDistance, e: React.MouseEvent) {
    e.stopPropagation(); // Prevent navigation to staff page

    const checkInStatus = store.checkInStatus || { type: 'none' };

    // Third+ click: Show dialog to choose action
    if (checkInStatus.type === 'completed') {
      setSelectedStore(store);
      setShowActionDialog(true);
      return;
    }

    // Check camera permission first if selfie is required
    if (store.selfie_required) {
      try {
        setGpsLoading(true);
        // Request camera permission
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        // Stop the stream immediately after checking permission
        stream.getTracks().forEach(track => track.stop());
      } catch (error: any) {
        setGpsLoading(false);
        // Camera permission denied - show error dialog
        setShowCameraErrorDialog(true);
        return;
      }
    }

    // If store requires GPS, request permission NOW (when user clicks)
    if (store.gps_required) {
      try {
        if (!store.selfie_required) {
          setGpsLoading(true);
        }

        const position = await getCurrentPosition();

        // Calculate distance to verify user is in range
        const distance = calculateDistance(
          position.coords.latitude,
          position.coords.longitude,
          store.latitude || 0,
          store.longitude || 0
        );

        const status = getStoreStatus(distance, store.radius_meters);

        if (status === 'far') {
          alert(`Bạn đang ở xa cửa hàng ${formatDistance(distance)}. Vui lòng đến gần hơn (trong phạm vi ${formatDistance(store.radius_meters || 100)}) để điểm danh.`);
          setGpsLoading(false);
          return;
        }

        // GPS verified - proceed to check-in (GPS will be re-verified on submit page for security)
        router.push(`/member/${store.id}/checkin`);
        setGpsLoading(false);

      } catch (error: any) {
        setGpsLoading(false);
        // Show GPS error dialog instead of banner
        setShowGpsErrorDialog(true);
        return;
      }
    } else {
      // No GPS required - proceed directly
      router.push(`/member/${store.id}/checkin`);
      setGpsLoading(false);
    }
  }

  // Get greeting info
  function getCurrentGreeting() {
    const time = currentTime.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const date = currentTime.toLocaleDateString('vi-VN', {
      weekday: 'long',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
    return { time, date };
  }

  const { time, date } = getCurrentGreeting();
  const firstName = user?.user_metadata?.full_name?.split(' ').slice(-1)[0] || user?.email?.split('@')[0];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col">
      <Header />

      {!user ? (
        // NOT LOGGED-IN - Show loading while redirecting to login
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Đang chuyển hướng đến trang đăng nhập...</p>
          </div>
        </main>
      ) : (
        <main className="flex-1 flex flex-col px-4 sm:px-6 lg:px-8 py-8">
          <div className="max-w-2xl w-full mx-auto">
            {/* Greeting */}
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">
                Xin chào, {firstName}
              </h2>
              <p className="text-lg font-semibold text-orange-600">{time}</p>
              <p className="text-sm text-gray-600 mt-1">{date}</p>
            </div>


            {/* Loading */}
            {initialLoading && stores.length === 0 && (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            )}

            {/* Empty State - New User Guidance */}
            {!initialLoading && stores.length === 0 && ownedStores.length === 0 && studentClasses.length === 0 && (
              <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8">
                <div className="text-center mb-6">
                  <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-800 mb-2">
                    Chào mừng bạn đến với DiemDanh!
                  </h3>
                  <p className="text-gray-600">
                    Bạn chưa có cửa hàng nào để điểm danh
                  </p>
                </div>

                <div className="space-y-4 mb-6">
                  <div className="bg-blue-50 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center flex-shrink-0 font-bold">
                        1
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-800 mb-1">Quản lý cửa hàng</h4>
                        <p className="text-sm text-gray-600">
                          Tạo cửa hàng của riêng bạn, quản lý nhân viên, ca làm việc và xếp lịch tự động
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-green-50 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center flex-shrink-0 font-bold">
                        2
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-800 mb-1">Nhân viên điểm danh</h4>
                        <p className="text-sm text-gray-600">
                          Nếu bạn là nhân viên, hãy yêu cầu quản lý thêm email của bạn vào hệ thống
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <Link href="/owner/create-store" className="flex-1">
                    <button className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      Tạo cửa hàng mới
                    </button>
                  </Link>
                  <a
                    href="https://app.diemdanh.net/help"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1"
                  >
                    <button className="w-full bg-white hover:bg-gray-50 text-gray-700 border-2 border-gray-300 px-6 py-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Hướng dẫn
                    </button>
                  </a>
                </div>
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

                  // Determine distance display
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

                  return (
                    <div
                      key={store.id}
                      className={`w-full rounded-xl border-2 transition-all overflow-hidden ${
                        isFar
                          ? 'bg-gray-100 border-gray-300 opacity-60'
                          : 'bg-white border-blue-500 hover:shadow-lg'
                      }`}
                    >
                      <div className="flex">
                        {/* Main Button - Navigate to Staff Page */}
                        <button
                          onClick={() => handleStoreClick(store)}
                          disabled={isFar}
                          className="flex-1 text-left p-4 hover:bg-blue-50 transition-all disabled:cursor-not-allowed"
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
                              <h3 className="font-bold text-gray-800 text-lg mb-1">
                                {store.name}
                              </h3>

                              {/* Distance info (if GPS required and available) */}
                              {distanceText && (
                                <p className="text-xs text-gray-500 mb-1">
                                  {distanceText}
                                </p>
                              )}

                              {/* Action Text */}
                              <p className="text-xs text-gray-600">
                                Xem lịch & lịch sử
                              </p>
                            </div>
                          </div>
                        </button>

                        {/* Quick Check-in Button */}
                        <button
                          onClick={(e) => handleQuickCheckIn(store, e)}
                          disabled={isFar || gpsLoading}
                          className={`flex flex-col items-center justify-center px-4 py-3 border-l-2 transition-all min-w-[80px] ${
                            isFar || gpsLoading
                              ? 'bg-gray-200 cursor-not-allowed'
                              : checkInStatus.type === 'active'
                                ? 'bg-orange-50 hover:bg-orange-100 border-orange-300'
                                : 'bg-blue-50 hover:bg-blue-100 border-blue-300'
                          }`}
                        >
                          <svg className={`w-6 h-6 mb-1 ${
                            checkInStatus.type === 'active' ? 'text-orange-600' : 'text-blue-600'
                          }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className={`text-xs font-semibold ${
                            checkInStatus.type === 'active' ? 'text-orange-600' : 'text-blue-600'
                          }`}>
                            {checkInStatus.type === 'active' ? 'Ra Ca' : 'Vào Ca'}
                          </span>
                        </button>
                      </div>
                    </div>
                  );
                })}
                </div>
              </>
            )}

            {/* Student Classes Section */}
            {studentClasses.length > 0 && (
              <div className="mt-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-3">📚 Lớp học của bạn</h3>
                <div className="space-y-2">
                  {studentClasses.map((classroom) => (
                    <Link
                      key={classroom.id}
                      href={`/member/${classroom.id}`}
                      className="block w-full bg-white border-2 border-green-500 rounded-xl p-4 hover:shadow-lg transition-all active:scale-[0.98]"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h4 className="font-bold text-gray-800 text-lg">{classroom.name}</h4>
                          <p className="text-sm text-gray-600">
                            {classroom.subject && `${classroom.subject} • `}
                            {classroom.grade_level && `${classroom.grade_level} • `}
                            {classroom.room_number && `Phòng ${classroom.room_number}`}
                          </p>
                        </div>
                        <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Owned Stores Section - Bottom */}
            {ownedStores.length > 0 && (
              <div className="mt-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-3">🏪 Cửa hàng của bạn</h3>
                <div className="space-y-2">
                  {ownedStores.map((store) => (
                    <Link
                      key={store.id}
                      href={`/owner/${store.id}`}
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
                  // Navigate to member check-in page with re-checkout action
                  router.push(`/member/${selectedStore.id}/checkin?action=re-checkout`);
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
                  // Navigate to member check-in page for new check-in
                  router.push(`/member/${selectedStore.id}/checkin?action=check-in`);
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

      {/* GPS Error Dialog */}
      {showGpsErrorDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="text-center">
              <div className="mb-6">
                <svg
                  className="mx-auto h-16 w-16 text-red-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-4">
                Không thể truy cập Vị trí
              </h2>
              <p className="text-gray-600 mb-6">
                Bạn đã từ chối quyền truy cập vị trí. Vui lòng cho phép truy cập vị trí trong cài đặt trình duyệt để sử dụng chức năng điểm danh.
              </p>
              <div className="space-y-3">
                <a
                  href="https://app.diemdanh.net/help/cap-quyen"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors duration-200 text-center"
                >
                  Hướng dẫn cấp quyền Vị trí
                </a>
                <button
                  onClick={() => {
                    setShowGpsErrorDialog(false);
                    window.location.reload();
                  }}
                  className="w-full px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors duration-200"
                >
                  Thử lại
                </button>
                <button
                  onClick={() => setShowGpsErrorDialog(false)}
                  className="w-full px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-colors duration-200"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Camera Error Dialog */}
      {showCameraErrorDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="text-center">
              <div className="mb-6">
                <svg
                  className="mx-auto h-16 w-16 text-red-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-4">
                Không thể truy cập Camera
              </h2>
              <p className="text-gray-600 mb-6">
                Bạn đã từ chối quyền truy cập camera. Vui lòng cho phép truy cập camera trong cài đặt trình duyệt để sử dụng chức năng điểm danh.
              </p>
              <div className="space-y-3">
                <a
                  href="https://app.diemdanh.net/help/cap-quyen"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors duration-200 text-center"
                >
                  Hướng dẫn cấp quyền Camera
                </a>
                <button
                  onClick={() => {
                    setShowCameraErrorDialog(false);
                    window.location.reload();
                  }}
                  className="w-full px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors duration-200"
                >
                  Thử lại
                </button>
                <button
                  onClick={() => setShowCameraErrorDialog(false)}
                  className="w-full px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-colors duration-200"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-white mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <div className="flex flex-col items-center gap-2">
            <p className="text-xs sm:text-sm text-gray-600">
              © 2026 diemdanh.net - Giải pháp chấm công thông minh
            </p>
            <a
              href="https://app.diemdanh.net/help"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs sm:text-sm text-blue-600 hover:text-blue-700 hover:underline transition-all"
            >
              Trợ giúp
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
