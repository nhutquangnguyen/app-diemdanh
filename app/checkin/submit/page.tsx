'use client';

import { useState, useRef, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Webcam from 'react-webcam';
import { supabase } from '@/lib/supabase';
import { getCurrentLocation, calculateDistance } from '@/utils/location';
import { compressImage, getBase64Size } from '@/utils/imageCompression';
import Header from '@/components/Header';

function CheckInContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const webcamRef = useRef<Webcam>(null);

  const [step, setStep] = useState<'loading' | 'info' | 'selfie' | 'processing' | 'success' | 'error'>('loading');
  const [selfieImage, setSelfieImage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [storeInfo, setStoreInfo] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [isCheckOut, setIsCheckOut] = useState(false);
  const [checkInTime, setCheckInTime] = useState<string>('');
  const [duration, setDuration] = useState<string>('');
  const [currentLocation, setCurrentLocation] = useState<any>(null);
  const [distance, setDistance] = useState<number>(0);
  const [isWithinRadius, setIsWithinRadius] = useState(false);

  useEffect(() => {
    checkAuthAndLoad();
  }, [searchParams]);

  // Calculate distance when both storeInfo and currentLocation are available
  useEffect(() => {
    if (storeInfo && currentLocation) {
      const dist = calculateDistance(
        currentLocation.latitude,
        currentLocation.longitude,
        parseFloat(storeInfo.latitude),
        parseFloat(storeInfo.longitude)
      );
      setDistance(dist);
      setIsWithinRadius(dist <= storeInfo.radius_meters);
    } else if (storeInfo && !storeInfo.gps_required) {
      // If GPS not required, always set within radius to true
      setIsWithinRadius(true);
    }
  }, [storeInfo, currentLocation]);

  async function checkAuthAndLoad() {
    // Check authentication
    const { getCurrentUser } = await import('@/lib/auth');
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      router.push('/auth/login?returnUrl=' + encodeURIComponent(window.location.pathname + window.location.search));
      return;
    }

    setUser(currentUser);

    // Get store ID from URL and load store info first
    const storeId = searchParams.get('store');
    console.log('Store ID from URL:', storeId);
    console.log('Full URL:', window.location.href);
    console.log('Search params:', window.location.search);

    if (storeId) {
      await loadStoreInfo(storeId, currentUser);
    } else {
      setErrorMessage(`Thiếu thông tin cửa hàng. URL: ${window.location.href}`);
      setStep('error');
    }
  }

  async function loadStoreInfo(storeId: string, currentUser: any) {
    try {
      const { data, error} = await supabase
        .from('stores')
        .select('*')
        .eq('id', storeId)
        .single();

      if (error) throw error;
      setStoreInfo(data);

      // Get GPS location only if required
      if (data.gps_required) {
        try {
          const location = await getCurrentLocation();
          if (!location) {
            setErrorMessage('Không thể lấy vị trí hiện tại. Vui lòng bật GPS.');
            setStep('error');
            return;
          }
          setCurrentLocation(location);
        } catch (error) {
          console.error('GPS error:', error);
          setErrorMessage('Lỗi khi lấy vị trí GPS');
          setStep('error');
          return;
        }
      }

      setStep('info');
    } catch (error) {
      console.error('Error loading store:', error);
      setErrorMessage('Không tìm thấy cửa hàng.');
      setStep('error');
    }
  }

  function handleStartCheckIn() {
    // Only check GPS if it's required
    if (storeInfo.gps_required && !isWithinRadius) {
      alert(`Bạn đang ở cách cửa hàng ${distance.toFixed(0)}m. Vui lòng đến gần hơn.`);
      return;
    }

    // Skip selfie step if not required
    if (!storeInfo.selfie_required) {
      handleSubmitCheckIn();
      return;
    }

    setStep('selfie');
  }

  function capturePhoto() {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (imageSrc) {
      setSelfieImage(imageSrc);
    }
  }

  function retakePhoto() {
    setSelfieImage(null);
  }

  async function handleSubmitCheckIn() {
    if (!storeInfo) return;

    // Only require selfie if selfie_required is true
    if (storeInfo.selfie_required && !selfieImage) return;

    setStep('processing');

    try {
      let location = currentLocation;
      let distance = 0;

      // Get current location only if GPS is required
      if (storeInfo.gps_required) {
        location = await getCurrentLocation();
        if (!location) {
          throw new Error('Không thể lấy vị trí hiện tại. Vui lòng bật GPS.');
        }

        // Calculate distance
        distance = calculateDistance(
          location.latitude,
          location.longitude,
          parseFloat(storeInfo.latitude),
          parseFloat(storeInfo.longitude)
        );

        // Check if within radius
        if (distance > storeInfo.radius_meters) {
          setErrorMessage(
            `Bạn đang ở cách cửa hàng ${distance.toFixed(0)}m. Vui lòng đến gần hơn (trong bán kính ${storeInfo.radius_meters}m).`
          );
          setStep('error');
          return;
        }
      } else {
        // Use store location if GPS not required
        location = {
          latitude: parseFloat(storeInfo.latitude),
          longitude: parseFloat(storeInfo.longitude)
        };
      }

      let staffId;

      // Check access mode
      if (storeInfo.access_mode === 'staff_only') {
        // Check if user's email is in staff list (authorized)
        const { data: existingStaff, error: staffCheckError} = await supabase
          .from('staff')
          .select('id')
          .eq('email', user.email)
          .eq('store_id', storeInfo.id)
          .single();

        if (staffCheckError || !existingStaff) {
          throw new Error('Email của bạn chưa được thêm vào danh sách nhân viên. Vui lòng liên hệ chủ cửa hàng.');
        }

        staffId = existingStaff.id;
      } else {
        // access_mode === 'anyone' - create or get staff record
        const { data: existingStaff } = await supabase
          .from('staff')
          .select('id')
          .eq('email', user.email)
          .eq('store_id', storeInfo.id)
          .single();

        if (existingStaff) {
          staffId = existingStaff.id;
        } else {
          // Create new staff record for anyone mode
          const { data: newStaff, error: createStaffError } = await supabase
            .from('staff')
            .insert([
              {
                email: user.email,
                full_name: user.full_name || user.email.split('@')[0],
                phone: '',
                store_id: storeInfo.id,
              },
            ])
            .select()
            .single();

          if (createStaffError) throw createStaffError;
          staffId = newStaff.id;
        }
      }

      // Get all check-ins for today to determine if this is first or subsequent scan
      const today = new Date().toISOString().split('T')[0];
      const { data: todayCheckIns, error: checkInsError } = await supabase
        .from('check_ins')
        .select('*')
        .eq('staff_id', staffId)
        .eq('store_id', storeInfo.id)
        .gte('check_in_time', `${today}T00:00:00`)
        .lte('check_in_time', `${today}T23:59:59`)
        .order('check_in_time', { ascending: true });

      if (checkInsError) throw checkInsError;

      let publicUrl = '';

      // Upload selfie to storage only if required
      if (storeInfo.selfie_required && selfieImage) {
        // Compress image before upload
        const originalSize = getBase64Size(selfieImage);
        console.log('Original image size:', originalSize, 'KB');

        const compressedImage = await compressImage(selfieImage, 1024, 1024, 0.85);
        const compressedSize = getBase64Size(compressedImage);
        console.log('Compressed image size:', compressedSize, 'KB');
        console.log('Compression ratio:', ((1 - compressedSize / originalSize) * 100).toFixed(1) + '%');

        const fileName = `${staffId}-${Date.now()}.jpg`;
        const base64Data = compressedImage.split(',')[1];
        const blob = await fetch(`data:image/jpeg;base64,${base64Data}`).then(r => r.blob());

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('selfies')
          .upload(fileName, blob, {
            contentType: 'image/jpeg',
          });

        if (uploadError) throw uploadError;

        // Get public URL
        const { data: { publicUrl: url } } = supabase.storage
          .from('selfies')
          .getPublicUrl(fileName);

        publicUrl = url;
      }

      const currentTime = new Date();
      const isFirstScan = !todayCheckIns || todayCheckIns.length === 0;

      // Always insert a new record for each scan
      const { error: insertError } = await supabase
        .from('check_ins')
        .insert([
          {
            staff_id: staffId,
            store_id: storeInfo.id,
            latitude: location.latitude,
            longitude: location.longitude,
            distance_meters: distance,
            selfie_url: publicUrl || null,
            status: 'success',
          },
        ]);

      if (insertError) throw insertError;

      // Calculate duration if not first scan (max time - min time)
      let durationText = '';
      if (!isFirstScan && todayCheckIns.length > 0) {
        const firstCheckIn = new Date(todayCheckIns[0].check_in_time);
        const durationMin = Math.floor((currentTime.getTime() - firstCheckIn.getTime()) / 1000 / 60);

        const hours = Math.floor(durationMin / 60);
        const minutes = durationMin % 60;
        durationText = `${hours} giờ ${minutes} phút`;

        setIsCheckOut(true);
        setCheckInTime(firstCheckIn.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }));
        setDuration(durationText);
      } else {
        setIsCheckOut(false);
        setCheckInTime(currentTime.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }));
      }

      setStep('success');
    } catch (error: any) {
      console.error('Error submitting check-in:', error);
      setErrorMessage(error.message || 'Có lỗi xảy ra. Vui lòng thử lại.');
      setStep('error');
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100">
      <Header />

      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Step 1: Store Info */}
        {step === 'info' && storeInfo && (
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">
                {storeInfo.name}
              </h2>
              <p className="text-gray-600 mb-4">{storeInfo.address}</p>

              {/* GPS Distance Info - Only show if GPS is required */}
              {storeInfo.gps_required && (
                <div className={`p-4 rounded-lg mb-6 ${isWithinRadius ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <svg className={`w-5 h-5 ${isWithinRadius ? 'text-green-600' : 'text-red-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span className={`font-semibold ${isWithinRadius ? 'text-green-700' : 'text-red-700'}`}>
                      Khoảng cách: {distance.toFixed(0)}m
                    </span>
                  </div>
                  {!isWithinRadius && (
                    <p className="text-sm text-red-600">
                      ⚠️ Bạn đang ở ngoài phạm vi cho phép ({storeInfo.radius_meters}m). Vui lòng đến gần hơn để điểm danh.
                    </p>
                  )}
                  {isWithinRadius && (
                    <p className="text-sm text-green-600">
                      ✓ Vị trí hợp lệ - Bạn có thể điểm danh
                    </p>
                  )}
                </div>
              )}

              {/* User Info */}
              <div className="bg-blue-50 p-4 rounded-lg mb-6">
                <p className="text-sm text-gray-600 mb-1">Đang điểm danh với tài khoản:</p>
                <p className="font-semibold text-gray-800">{user?.email}</p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleStartCheckIn}
              disabled={storeInfo.gps_required && !isWithinRadius}
              className={`w-full px-6 py-4 rounded-lg font-semibold text-lg transition-all flex items-center justify-center gap-2 ${
                (!storeInfo.gps_required || isWithinRadius)
                  ? 'bg-green-600 hover:bg-green-700 text-white cursor-pointer'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {storeInfo.selfie_required ? 'Bắt Đầu Quét' : 'Xác Nhận Điểm Danh'}
            </button>
          </div>
        )}

        {/* Step 2: Selfie */}
        {step === 'selfie' && (
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">
              Chụp Ảnh Selfie
            </h2>

            {!selfieImage ? (
              <div>
                <div className="mb-4 rounded-lg overflow-hidden">
                  <Webcam
                    ref={webcamRef}
                    audio={false}
                    screenshotFormat="image/jpeg"
                    className="w-full rounded-lg"
                    videoConstraints={{
                      facingMode: 'user',
                    }}
                  />
                </div>
                <button
                  onClick={capturePhoto}
                  className="w-full bg-green-600 hover:bg-green-700 text-white px-6 py-4 rounded-lg font-semibold text-lg transition-all flex items-center justify-center gap-2"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Chụp Ảnh
                </button>
              </div>
            ) : (
              <div>
                <div className="mb-4 rounded-lg overflow-hidden">
                  <img src={selfieImage} alt="Selfie" className="w-full rounded-lg" />
                </div>
                <div className="flex gap-4">
                  <button
                    onClick={retakePhoto}
                    className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 px-6 py-4 rounded-lg font-semibold transition-all"
                  >
                    Chụp Lại
                  </button>
                  <button
                    onClick={handleSubmitCheckIn}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white px-6 py-4 rounded-lg font-semibold transition-all"
                  >
                    Xác Nhận Điểm Danh
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Processing */}
        {step === 'processing' && (
          <div className="bg-white rounded-lg shadow-lg p-12 text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-green-600 mx-auto mb-6"></div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              Đang Xử Lý...
            </h2>
            <p className="text-gray-600">
              Vui lòng chờ trong giây lát
            </p>
          </div>
        )}

        {/* Success */}
        {step === 'success' && (
          <div className="bg-white rounded-lg shadow-lg p-12 text-center">
            <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-12 h-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>

            {!isCheckOut ? (
              // First scan of the day
              <>
                <h2 className="text-3xl font-bold text-gray-800 mb-4">
                  Điểm Danh Thành Công!
                </h2>
                <div className="bg-blue-50 rounded-lg p-6 mb-6">
                  <p className="text-lg text-gray-700 mb-2">
                    <span className="font-semibold">Lần quét đầu tiên:</span> {checkInTime}
                  </p>
                  <p className="text-sm text-gray-500">
                    Quét mã QR mỗi lần vào/ra để ghi lại tất cả hoạt động
                  </p>
                </div>
                <p className="text-gray-600 mb-8">
                  Chúc bạn làm việc hiệu quả!
                </p>
              </>
            ) : (
              // Subsequent scans - show duration from first scan
              <>
                <h2 className="text-3xl font-bold text-gray-800 mb-4">
                  Quét Thành Công!
                </h2>
                <div className="bg-green-50 rounded-lg p-6 mb-6">
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="text-left">
                      <p className="text-sm text-gray-500">Lần quét đầu</p>
                      <p className="text-lg font-semibold text-gray-700">{checkInTime}</p>
                    </div>
                    <div className="text-left">
                      <p className="text-sm text-gray-500">Lần quét này</p>
                      <p className="text-lg font-semibold text-gray-700">
                        {new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                  <div className="border-t pt-4">
                    <p className="text-sm text-gray-500 mb-1">Tổng thời gian (từ lần quét đầu)</p>
                    <p className="text-2xl font-bold text-green-600">{duration}</p>
                  </div>
                </div>
                <p className="text-gray-600 mb-8">
                  Tất cả lần quét đã được lưu lại!
                </p>
              </>
            )}

            <Link href="/checkin">
              <button className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-lg font-semibold transition-all">
                Hoàn Thành
              </button>
            </Link>
          </div>
        )}

        {/* Error */}
        {step === 'error' && (
          <div className="bg-white rounded-lg shadow-lg p-12 text-center">
            <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-12 h-12 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-3xl font-bold text-gray-800 mb-4">
              Có Lỗi Xảy Ra
            </h2>
            <p className="text-gray-600 mb-8">
              {errorMessage}
            </p>
            <Link href="/checkin">
              <button className="bg-gray-600 hover:bg-gray-700 text-white px-8 py-3 rounded-lg font-semibold transition-all">
                Quay Lại
              </button>
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}

export default function CheckInPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    }>
      <CheckInContent />
    </Suspense>
  );
}
