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
  const [activeCheckIn, setActiveCheckIn] = useState<any>(null);
  const [lastCompletedCheckIn, setLastCompletedCheckIn] = useState<any>(null);
  const [actionType, setActionType] = useState<'check-in' | 'check-out' | 're-checkout'>('check-in');
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [cameraError, setCameraError] = useState(false);
  const [locationError, setLocationError] = useState(false);

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

  async function checkForActiveCheckIn(storeId: string, currentUser: any) {
    try {
      // Get staff record first
      const { data: staffRecord } = await supabase
        .from('staff')
        .select('id')
        .eq('email', currentUser.email)
        .eq('store_id', storeId)
        .single();

      if (!staffRecord) return;

      // Get today's date range (start of today to start of tomorrow)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const todayStart = today.toISOString();
      const tomorrowStart = tomorrow.toISOString();

      // Check for active check-in (no check_out_time) today
      const { data: activeCheckInData } = await supabase
        .from('check_ins')
        .select('*')
        .eq('staff_id', staffRecord.id)
        .eq('store_id', storeId)
        .gte('check_in_time', todayStart)
        .lt('check_in_time', tomorrowStart)
        .is('check_out_time', null)
        .order('check_in_time', { ascending: false })
        .limit(1)
        .maybeSingle();

      // Check for last completed check-in (has check_out_time) today
      const { data: completedCheckInData } = await supabase
        .from('check_ins')
        .select('*')
        .eq('staff_id', staffRecord.id)
        .eq('store_id', storeId)
        .gte('check_in_time', todayStart)
        .lt('check_in_time', tomorrowStart)
        .not('check_out_time', 'is', null)
        .order('check_out_time', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (activeCheckInData) {
        // Has active check-in → show check-out button
        setActiveCheckIn(activeCheckInData);
        setIsCheckOut(true);
        setActionType('check-out');
        setLastCompletedCheckIn(null);
      } else if (completedCheckInData) {
        // No active check-in but has completed session today → show both buttons
        setActiveCheckIn(null);
        setIsCheckOut(false);
        setActionType('check-in'); // Default to check-in
        setLastCompletedCheckIn(completedCheckInData);
      } else {
        // No check-in today → show check-in button
        setActiveCheckIn(null);
        setIsCheckOut(false);
        setActionType('check-in');
        setLastCompletedCheckIn(null);
      }
    } catch (error) {
      console.error('Error checking active check-in:', error);
    }
  }

  async function loadStoreInfo(storeId: string, currentUser: any) {
    try {
      // Check if action is specified in URL (from dialog)
      const actionParam = searchParams.get('action') as 'check-in' | 'check-out' | 're-checkout' | null;
      if (actionParam) {
        setActionType(actionParam);
      }

      // Run store and staff queries in parallel (both have all needed data)
      const [storeResult, staffResult] = await Promise.all([
        supabase.from('stores').select('*').eq('id', storeId).single(),
        supabase.from('staff').select('id').eq('email', currentUser.email).eq('store_id', storeId).single()
      ]);

      const { data, error } = storeResult;
      if (error) throw error;
      setStoreInfo(data);

      const { data: staffRecord, error: staffError } = staffResult;

      // Check authorization if staff_only mode
      if (data.access_mode === 'staff_only') {
        if (staffError || !staffRecord) {
          setErrorMessage('Email của bạn chưa được thêm vào danh sách nhân viên. Vui lòng liên hệ chủ cửa hàng để được cấp quyền truy cập.');
          setStep('error');
          return;
        }
      }

      // Always get real GPS location (don't trust URL params - prevent fraud)
      let gpsPromise: Promise<any>;
      if (data.gps_required) {
        gpsPromise = getCurrentLocation().catch(err => {
          console.error('GPS error:', err);
          return null;
        });
      } else {
        gpsPromise = Promise.resolve(null);
      }

      // Handle check-in state based on action parameter
      let checkInPromise: Promise<void>;
      if (actionParam === 're-checkout') {
        // For re-checkout, find the last completed check-in
        checkInPromise = staffRecord
          ? (async () => {
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              const tomorrow = new Date(today);
              tomorrow.setDate(tomorrow.getDate() + 1);

              const { data: checkIns } = await supabase
                .from('check_ins')
                .select('*')
                .eq('staff_id', staffRecord.id)
                .eq('store_id', storeId)
                .gte('check_in_time', today.toISOString())
                .lt('check_in_time', tomorrow.toISOString())
                .not('check_out_time', 'is', null)
                .order('check_out_time', { ascending: false })
                .limit(1);

              if (checkIns && checkIns.length > 0) {
                setLastCompletedCheckIn(checkIns[0]);
              }
            })()
          : Promise.resolve();
      } else if (actionParam) {
        // For explicit check-in action, don't auto-detect
        checkInPromise = Promise.resolve();
      } else {
        // Normal flow - auto-detect check-in/out state
        checkInPromise = staffRecord ? checkForActiveCheckIn(storeId, currentUser) : Promise.resolve();
      }

      // Wait for both to complete
      const [location] = await Promise.all([gpsPromise, checkInPromise]);

      // Check GPS if required
      if (data.gps_required) {
        if (!location) {
          setLocationError(true);
          setStep('error');
          return;
        }
        setCurrentLocation(location);
      }

      // Skip directly to selfie if required (bypass info screen for faster UX)
      if (data.selfie_required) {
        // But first check GPS distance if required AND GPS has been fetched
        if (data.gps_required && currentLocation && !isWithinRadius && distance > 0) {
          // Show error - too far
          setErrorMessage(`Bạn đang ở cách cửa hàng ${distance.toFixed(0)}m. Vui lòng đến gần hơn (trong bán kính ${data.radius_meters}m).`);
          setStep('error');
        } else {
          // All good - go directly to camera (GPS will be checked again on submit)
          setStep('selfie');
        }
      } else {
        setStep('info');
      }
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
          setLocationError(true);
          setStep('error');
          return;
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

      const currentTime = new Date();

      // Check if there's an active check-in (not checked out yet)
      if (activeCheckIn) {
        // This is a check-out - update existing record
        let checkoutSelfieUrl = null;

        // Upload checkout selfie if required
        if (storeInfo.selfie_required && selfieImage) {
          const compressedImage = await compressImage(selfieImage, 1024, 1024, 0.85);
          const fileName = `checkout-${staffId}-${Date.now()}.jpg`;
          const base64Data = compressedImage.split(',')[1];
          const blob = await fetch(`data:image/jpeg;base64,${base64Data}`).then(r => r.blob());

          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('selfies')
            .upload(fileName, blob, {
              contentType: 'image/jpeg',
            });

          if (uploadError) throw uploadError;

          const { data: { publicUrl } } = supabase.storage
            .from('selfies')
            .getPublicUrl(fileName);

          checkoutSelfieUrl = publicUrl;
        }

        const { error: updateError } = await supabase
          .from('check_ins')
          .update({
            check_out_time: currentTime.toISOString(),
            check_out_latitude: location.latitude,
            check_out_longitude: location.longitude,
            check_out_distance_meters: distance,
            checkout_selfie_url: checkoutSelfieUrl,
          })
          .eq('id', activeCheckIn.id);

        if (updateError) throw updateError;

        // Calculate duration
        const checkInTime = new Date(activeCheckIn.check_in_time);
        const durationMin = Math.floor((currentTime.getTime() - checkInTime.getTime()) / 1000 / 60);
        const hours = Math.floor(durationMin / 60);
        const minutes = durationMin % 60;
        const durationText = `${hours} giờ ${minutes} phút`;

        setCheckInTime(checkInTime.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }));
        setDuration(durationText);
        setIsCheckOut(true);
      } else if (actionType === 're-checkout' && lastCompletedCheckIn) {
        // This is a re-checkout - update the check-out time of last completed session
        let checkoutSelfieUrl = null;

        // Upload checkout selfie if required
        if (storeInfo.selfie_required && selfieImage) {
          const compressedImage = await compressImage(selfieImage, 1024, 1024, 0.85);
          const fileName = `checkout-${staffId}-${Date.now()}.jpg`;
          const base64Data = compressedImage.split(',')[1];
          const blob = await fetch(`data:image/jpeg;base64,${base64Data}`).then(r => r.blob());

          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('selfies')
            .upload(fileName, blob, {
              contentType: 'image/jpeg',
            });

          if (uploadError) throw uploadError;

          const { data: { publicUrl } } = supabase.storage
            .from('selfies')
            .getPublicUrl(fileName);

          checkoutSelfieUrl = publicUrl;
        }

        const { error: updateError } = await supabase
          .from('check_ins')
          .update({
            check_out_time: currentTime.toISOString(),
            check_out_latitude: location.latitude,
            check_out_longitude: location.longitude,
            check_out_distance_meters: distance,
            checkout_selfie_url: checkoutSelfieUrl,
          })
          .eq('id', lastCompletedCheckIn.id);

        if (updateError) throw updateError;

        // Calculate duration
        const checkInTime = new Date(lastCompletedCheckIn.check_in_time);
        const durationMin = Math.floor((currentTime.getTime() - checkInTime.getTime()) / 1000 / 60);
        const hours = Math.floor(durationMin / 60);
        const minutes = durationMin % 60;
        const durationText = `${hours} giờ ${minutes} phút`;

        setCheckInTime(checkInTime.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }));
        setDuration(durationText);
        setIsCheckOut(true);
      } else {
        // This is a check-in - insert new record
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

        const { error: insertError } = await supabase
          .from('check_ins')
          .insert([
            {
              staff_id: staffId,
              store_id: storeInfo.id,
              check_in_time: currentTime.toISOString(),
              latitude: location.latitude,
              longitude: location.longitude,
              distance_meters: distance,
              selfie_url: publicUrl || null,
              status: 'success',
            },
          ]);

        if (insertError) throw insertError;

        setCheckInTime(currentTime.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }));
        setIsCheckOut(false);
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

            {/* Show check-in time if already checked in */}
            {isCheckOut && activeCheckIn && (
              <div className="bg-green-50 border border-green-200 p-4 rounded-lg mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="font-semibold text-green-700">Đã Check-in</span>
                </div>
                <p className="text-sm text-gray-600">
                  Thời gian vào: {new Date(activeCheckIn.check_in_time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            )}

            {/* Show last check-out time if session is completed */}
            {lastCompletedCheckIn && (
              <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="font-semibold text-blue-700">Đã Check-out lần cuối</span>
                </div>
                <p className="text-sm text-gray-600">
                  Thời gian ra: {new Date(lastCompletedCheckIn.check_out_time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Chọn "Sửa giờ ra" nếu thời gian không chính xác
                </p>
              </div>
            )}

            {/* Buttons: Show two buttons if completed session exists, otherwise one button */}
            {lastCompletedCheckIn ? (
              // Two buttons: Re-checkout + New Check-in
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => {
                    setActionType('re-checkout');
                    handleStartCheckIn();
                  }}
                  disabled={storeInfo.gps_required && !isWithinRadius}
                  className={`px-4 py-4 rounded-lg font-semibold text-lg transition-all flex flex-col items-center justify-center gap-2 ${
                    (!storeInfo.gps_required || isWithinRadius)
                      ? 'bg-orange-600 hover:bg-orange-700 text-white cursor-pointer'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span className="text-sm">Sửa giờ ra</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActionType('check-in');
                    handleStartCheckIn();
                  }}
                  disabled={storeInfo.gps_required && !isWithinRadius}
                  className={`px-4 py-4 rounded-lg font-semibold text-lg transition-all flex flex-col items-center justify-center gap-2 ${
                    (!storeInfo.gps_required || isWithinRadius)
                      ? 'bg-green-600 hover:bg-green-700 text-white cursor-pointer'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                  </svg>
                  <span className="text-sm">Vào ca mới</span>
                </button>
              </div>
            ) : (
              // Single button: Check-in or Check-out
              <button
                type="button"
                onClick={handleStartCheckIn}
                disabled={storeInfo.gps_required && !isWithinRadius}
                className={`w-full px-6 py-4 rounded-lg font-semibold text-lg transition-all flex items-center justify-center gap-2 ${
                  (!storeInfo.gps_required || isWithinRadius)
                    ? isCheckOut
                      ? 'bg-red-600 hover:bg-red-700 text-white cursor-pointer'
                      : 'bg-green-600 hover:bg-green-700 text-white cursor-pointer'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                {isCheckOut ? (
                  <>
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    {storeInfo.selfie_required ? 'Bắt Đầu Check-out' : 'Xác Nhận Check-out'}
                  </>
                ) : (
                  <>
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {storeInfo.selfie_required ? 'Bắt Đầu Check-in' : 'Xác Nhận Check-in'}
                  </>
                )}
              </button>
            )}
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
                <div className="mb-4 rounded-lg overflow-hidden relative">
                  <Webcam
                    ref={webcamRef}
                    audio={false}
                    screenshotFormat="image/jpeg"
                    className="w-full rounded-lg"
                    videoConstraints={{
                      facingMode: facingMode,
                    }}
                    onUserMediaError={(error) => {
                      console.error('Camera error:', error);
                      setCameraError(true);
                    }}
                  />
                  {/* Camera Switch Button */}
                  <button
                    onClick={() => setFacingMode(prev => prev === 'user' ? 'environment' : 'user')}
                    className="absolute top-4 right-4 bg-black bg-opacity-50 hover:bg-opacity-70 text-white p-3 rounded-full transition-all"
                    title="Chuyển camera"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </button>
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
                    className={`flex-1 text-white px-6 py-4 rounded-lg font-semibold transition-all ${
                      actionType === 'check-in'
                        ? 'bg-green-600 hover:bg-green-700'
                        : 'bg-red-600 hover:bg-red-700'
                    }`}
                  >
                    {actionType === 'check-in' ? 'Xác nhận vào ca' : 'Xác nhận ra ca'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Camera Permission Error Dialog */}
        {cameraError && (
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
                  Bạn đã từ chối quyền truy cập camera. Vui lòng cho phép truy cập camera trong cài đặt trình duyệt để sử dụng chức năng quét mã QR.
                </p>
                <div className="space-y-3">
                  <a
                    href="https://www.diemdanh.net/help/cap-quyen"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors duration-200 text-center"
                  >
                    Hướng dẫn cấp quyền Camera
                  </a>
                  <button
                    onClick={() => {
                      setCameraError(false);
                      window.location.reload();
                    }}
                    className="w-full px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors duration-200"
                  >
                    Thử lại
                  </button>
                  <Link href="/">
                    <button className="w-full px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-colors duration-200">
                      Quay về Trang chủ
                    </button>
                  </Link>
                </div>
              </div>
            </div>
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
              // Check-in success
              <>
                <h2 className="text-3xl font-bold text-gray-800 mb-4">
                  Check-in Thành Công!
                </h2>
                <div className="bg-blue-50 rounded-lg p-6 mb-6">
                  <p className="text-lg text-gray-700 mb-2">
                    <span className="font-semibold">Thời gian vào:</span> {checkInTime}
                  </p>
                  <p className="text-sm text-gray-500">
                    Nhớ quét mã QR khi ra về để ghi lại thời gian làm việc
                  </p>
                </div>
                <p className="text-gray-600 mb-8">
                  Chúc bạn làm việc hiệu quả!
                </p>
              </>
            ) : (
              // Check-out success - show work duration
              <>
                <h2 className="text-3xl font-bold text-gray-800 mb-4">
                  Check-out Thành Công!
                </h2>
                <div className="bg-green-50 rounded-lg p-6 mb-6">
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="text-left">
                      <p className="text-sm text-gray-500">Giờ vào</p>
                      <p className="text-lg font-semibold text-gray-700">{checkInTime}</p>
                    </div>
                    <div className="text-left">
                      <p className="text-sm text-gray-500">Giờ ra</p>
                      <p className="text-lg font-semibold text-gray-700">
                        {new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                  <div className="border-t pt-4">
                    <p className="text-sm text-gray-500 mb-1">Tổng thời gian làm việc</p>
                    <p className="text-2xl font-bold text-green-600">{duration}</p>
                  </div>
                </div>
                <p className="text-gray-600 mb-8">
                  Cảm ơn bạn! Hẹn gặp lại!
                </p>
              </>
            )}

            <Link href="/">
              <button className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-lg font-semibold transition-all">
                Hoàn Thành
              </button>
            </Link>
          </div>
        )}

        {/* Error */}
        {step === 'error' && (
          <div className="bg-white rounded-lg shadow-lg p-12 text-center">
            {locationError ? (
              // Location/GPS permission error - show helpful UI
              <>
                <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg className="w-12 h-12 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <h2 className="text-3xl font-bold text-gray-800 mb-4">
                  Không thể truy cập Vị trí
                </h2>
                <p className="text-gray-600 mb-6">
                  Bạn đã từ chối quyền truy cập vị trí. Vui lòng cho phép truy cập vị trí trong cài đặt trình duyệt để sử dụng chức năng điểm danh.
                </p>
                <div className="space-y-3 max-w-md mx-auto">
                  <a
                    href="https://www.diemdanh.net/help/cap-quyen"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors duration-200 text-center"
                  >
                    Hướng dẫn cấp quyền Vị trí
                  </a>
                  <button
                    onClick={() => {
                      setLocationError(false);
                      window.location.reload();
                    }}
                    className="w-full px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors duration-200"
                  >
                    Thử lại
                  </button>
                  <Link href="/">
                    <button className="w-full px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-colors duration-200">
                      Quay về Trang chủ
                    </button>
                  </Link>
                </div>
              </>
            ) : errorMessage.includes('chưa được thêm vào danh sách nhân viên') ? (
              // Authorization error - not really an "error", just not authorized
              <>
                <div className="w-24 h-24 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg className="w-12 h-12 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <h2 className="text-3xl font-bold text-gray-800 mb-4">
                  Không Có Quyền Truy Cập
                </h2>
                <p className="text-gray-600 mb-8">
                  {errorMessage}
                </p>
                <Link href="/">
                  <button className="bg-gray-600 hover:bg-gray-700 text-white px-8 py-3 rounded-lg font-semibold transition-all">
                    Quay Lại
                  </button>
                </Link>
              </>
            ) : (
              // Actual errors (GPS, network, etc.)
              <>
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
                <Link href="/">
                  <button className="bg-gray-600 hover:bg-gray-700 text-white px-8 py-3 rounded-lg font-semibold transition-all">
                    Quay Lại
                  </button>
                </Link>
              </>
            )}
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
