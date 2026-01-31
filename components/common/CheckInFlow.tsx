'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Webcam from 'react-webcam';
import { supabase } from '@/lib/supabase';
import { getCurrentLocation, calculateDistance } from '@/utils/location';
import { compressImage } from '@/utils/imageCompression';
import PermissionGuidance from '@/components/common/PermissionGuidance';

interface CheckInFlowProps {
  // Common props
  type: 'staff' | 'student';
  locationId: string; // store_id or class_id
  location: {
    name: string;
    gps_required: boolean;
    selfie_required: boolean;
    latitude: number | null;
    longitude: number | null;
    radius_meters: number;
  };

  // Staff-specific
  staffId?: string;
  isCheckOut?: boolean;
  activeCheckInId?: string;

  // Student-specific
  studentId?: string;
  sessionId?: string;
  sessionName?: string;

  // Callbacks
  onSuccess: (data: any) => void;
  onCancel?: () => void;
}

type Step = 'info' | 'selfie' | 'processing' | 'success' | 'error';

export default function CheckInFlow({
  type,
  locationId,
  location,
  staffId,
  isCheckOut = false,
  activeCheckInId,
  studentId,
  sessionId,
  sessionName,
  onSuccess,
  onCancel,
}: CheckInFlowProps) {
  const router = useRouter();
  const webcamRef = useRef<Webcam>(null);

  const [step, setStep] = useState<Step>('info');
  const [selfieImage, setSelfieImage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [currentLocation, setCurrentLocation] = useState<any>(null);
  const [distance, setDistance] = useState<number>(0);
  const [isWithinRadius, setIsWithinRadius] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [cameraError, setCameraError] = useState(false);
  const [locationError, setLocationError] = useState(false);
  const [processing, setProcessing] = useState(false);

  // Load GPS location on mount
  useEffect(() => {
    if (location.gps_required) {
      loadLocation();
    } else {
      setIsWithinRadius(true);
    }
  }, []);

  // Calculate distance when location is available
  useEffect(() => {
    if (location.gps_required && currentLocation && location.latitude && location.longitude) {
      const dist = calculateDistance(
        currentLocation.latitude,
        currentLocation.longitude,
        location.latitude,
        location.longitude
      );
      setDistance(dist);
      setIsWithinRadius(dist <= location.radius_meters);
    }
  }, [currentLocation, location]);

  async function loadLocation() {
    try {
      const loc = await getCurrentLocation();
      if (loc) {
        setCurrentLocation(loc);
        setLocationError(false);
      } else {
        setLocationError(true);
      }
    } catch (error) {
      console.error('GPS error:', error);
      setLocationError(true);
    }
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

  async function handleProceed() {
    // Validate GPS if required
    if (location.gps_required) {
      if (!currentLocation) {
        alert('Không thể lấy vị trí GPS. Vui lòng bật định vị.');
        return;
      }

      if (!location.latitude || !location.longitude) {
        alert('Vị trí chưa được thiết lập. Vui lòng liên hệ quản lý.');
        return;
      }

      if (!isWithinRadius) {
        alert(`Bạn đang ở cách ${distance.toFixed(0)}m. Vui lòng đến gần hơn (trong bán kính ${location.radius_meters}m).`);
        return;
      }
    }

    // If selfie required, go to camera step
    if (location.selfie_required) {
      setStep('selfie');
    } else {
      // Submit without selfie
      await handleSubmit(null);
    }
  }

  async function handleSubmit(selfie: string | null) {
    setProcessing(true);
    setStep('processing');

    try {
      // Get fresh GPS location for security
      let finalLocation = currentLocation;
      let finalDistance = distance;

      if (location.gps_required) {
        const freshLoc = await getCurrentLocation();
        if (!freshLoc) {
          throw new Error('Không thể lấy vị trí GPS');
        }

        finalLocation = freshLoc;

        if (location.latitude && location.longitude) {
          finalDistance = calculateDistance(
            freshLoc.latitude,
            freshLoc.longitude,
            location.latitude,
            location.longitude
          );

          if (finalDistance > location.radius_meters) {
            throw new Error(`Bạn đã di chuyển ra khỏi bán kính cho phép (${finalDistance.toFixed(0)}m)`);
          }
        }
      }

      // Upload selfie if provided
      let selfieUrl = null;
      if (location.selfie_required && selfie) {
        const compressedImage = await compressImage(selfie, 1024, 1024, 0.85);
        const fileName = `${type}-${type === 'staff' ? staffId : studentId}-${Date.now()}.jpg`;
        const base64Data = compressedImage.split(',')[1];
        const blob = await fetch(`data:image/jpeg;base64,${base64Data}`).then(r => r.blob());

        const { error: uploadError } = await supabase.storage
          .from('selfies')
          .upload(fileName, blob, {
            contentType: 'image/jpeg',
          });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('selfies')
          .getPublicUrl(fileName);

        selfieUrl = publicUrl;
      }

      // Call type-specific submit
      let result;
      if (type === 'staff') {
        result = await submitStaffCheckIn(selfieUrl, finalLocation, finalDistance);
      } else {
        result = await submitStudentCheckIn(selfieUrl, finalLocation, finalDistance);
      }

      setStep('success');
      onSuccess(result);
    } catch (error: any) {
      console.error('Check-in error:', error);
      setErrorMessage(error.message || 'Có lỗi xảy ra');
      setStep('error');
    } finally {
      setProcessing(false);
    }
  }

  async function submitStaffCheckIn(selfieUrl: string | null, loc: any, dist: number) {
    if (isCheckOut && activeCheckInId) {
      // Check-out
      const { error } = await supabase
        .from('check_ins')
        .update({
          check_out_time: new Date().toISOString(),
          checkout_selfie_url: selfieUrl,
          checkout_latitude: loc?.latitude,
          checkout_longitude: loc?.longitude,
        })
        .eq('id', activeCheckInId);

      if (error) throw error;
      return { type: 'check-out' };
    } else {
      // Check-in
      const { error } = await supabase
        .from('check_ins')
        .insert({
          staff_id: staffId,
          store_id: locationId,
          check_in_time: new Date().toISOString(),
          selfie_url: selfieUrl,
          latitude: loc?.latitude,
          longitude: loc?.longitude,
          distance_meters: dist,
        });

      if (error) throw error;
      return { type: 'check-in' };
    }
  }

  async function submitStudentCheckIn(selfieUrl: string | null, loc: any, dist: number) {
    const now = new Date();
    const checkInTime = now.toTimeString().slice(0, 8); // HH:MM:SS format

    // Determine if late
    // (You can add session time checking logic here)
    const status = 'present'; // Simplified for now

    const { error } = await supabase
      .from('attendance_records')
      .insert({
        student_id: studentId,
        class_id: locationId,
        session_id: sessionId,
        attendance_date: now.toISOString().split('T')[0],
        status,
        marked_by: 'student',
        check_in_time: checkInTime,
        latitude: loc?.latitude,
        longitude: loc?.longitude,
        distance_meters: dist,
        selfie_url: selfieUrl,
      });

    if (error) throw error;
    return { type: 'check-in', status };
  }

  // Info Step
  if (step === 'info') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">
            {isCheckOut ? '👋 Check-out' : '📍 Điểm danh'}
          </h2>

          <div className="mb-4">
            <p className="text-gray-700 font-semibold">{location.name}</p>
            {sessionName && <p className="text-sm text-gray-600">{sessionName}</p>}
          </div>

          {/* GPS Status */}
          {location.gps_required && (
            <div className="mb-4 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="font-semibold text-gray-700">Vị trí GPS</span>
              </div>

              {locationError ? (
                <p className="text-red-600 text-sm">❌ Không thể lấy vị trí GPS</p>
              ) : !currentLocation ? (
                <p className="text-gray-600 text-sm">⏳ Đang lấy vị trí...</p>
              ) : (
                <>
                  <p className={`font-semibold ${isWithinRadius ? 'text-green-600' : 'text-red-600'}`}>
                    {isWithinRadius ? '✅ Trong bán kính' : '❌ Ngoài bán kính'}
                  </p>
                  <p className="text-sm text-gray-600">
                    Khoảng cách: {distance.toFixed(0)}m / {location.radius_meters}m
                  </p>
                </>
              )}
            </div>
          )}

          {/* Selfie Status */}
          {location.selfie_required && (
            <div className="mb-4 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="font-semibold text-gray-700">Yêu cầu chụp ảnh selfie</span>
              </div>
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-3">
            {onCancel && (
              <button
                onClick={onCancel}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 px-6 py-3 rounded-lg font-semibold transition-all"
              >
                Hủy
              </button>
            )}
            <button
              onClick={handleProceed}
              disabled={location.gps_required && (!currentLocation || !isWithinRadius)}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {location.selfie_required ? 'Tiếp tục' : (isCheckOut ? 'Check-out' : 'Điểm danh')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Selfie Step
  if (step === 'selfie') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full">
          <h2 className="text-xl font-bold text-gray-800 mb-4 text-center">
            📸 Chụp Ảnh Selfie
          </h2>
          <p className="text-sm text-gray-600 mb-4 text-center">
            Chụp ảnh khuôn mặt để xác nhận
          </p>

          {!selfieImage ? (
            <div>
              <div className="mb-4 rounded-lg overflow-hidden relative">
                <Webcam
                  ref={webcamRef}
                  audio={false}
                  screenshotFormat="image/jpeg"
                  className="w-full rounded-lg"
                  videoConstraints={{ facingMode }}
                  onUserMediaError={() => setCameraError(true)}
                />
                <button
                  onClick={() => setFacingMode(prev => prev === 'user' ? 'environment' : 'user')}
                  className="absolute top-4 right-4 bg-black bg-opacity-50 hover:bg-opacity-70 text-white p-3 rounded-full"
                  title="Chuyển camera"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setStep('info')}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-3 rounded-lg font-semibold"
                >
                  Quay lại
                </button>
                <button
                  onClick={capturePhoto}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-lg font-semibold"
                >
                  Chụp Ảnh
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div className="mb-4 rounded-lg overflow-hidden">
                <img src={selfieImage} alt="Selfie" className="w-full rounded-lg" />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={retakePhoto}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-3 rounded-lg font-semibold"
                >
                  Chụp Lại
                </button>
                <button
                  onClick={() => handleSubmit(selfieImage)}
                  disabled={processing}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-lg font-semibold disabled:opacity-50"
                >
                  {processing ? 'Đang xử lý...' : 'Xác Nhận'}
                </button>
              </div>
            </div>
          )}

          {cameraError && (
            <PermissionGuidance
              type="camera"
              onRetry={() => setCameraError(false)}
              renderMode="modal"
            />
          )}

          {locationError && (
            <PermissionGuidance
              type="location"
              onRetry={() => {
                setLocationError(false);
                setStep('info');
              }}
              renderMode="modal"
            />
          )}
        </div>
      </div>
    );
  }

  // Processing Step
  if (step === 'processing') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-700 font-semibold">Đang xử lý...</p>
        </div>
      </div>
    );
  }

  // Success Step
  if (step === 'success') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            {isCheckOut ? 'Check-out thành công!' : 'Điểm danh thành công!'}
          </h2>
          <p className="text-gray-600 mb-6">
            {type === 'staff'
              ? (isCheckOut ? 'Bạn đã check-out.' : 'Bạn đã check-in.')
              : 'Bạn đã điểm danh thành công.'
            }
          </p>
        </div>
      </div>
    );
  }

  // Error Step
  if (step === 'error') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Lỗi</h2>
          <p className="text-gray-600 mb-6">{errorMessage}</p>
          <button
            onClick={() => setStep('info')}
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-semibold"
          >
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  return null;
}
