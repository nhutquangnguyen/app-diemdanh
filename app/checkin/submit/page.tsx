'use client';

import { useState, useRef, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Webcam from 'react-webcam';
import { supabase } from '@/lib/supabase';
import { getCurrentLocation, calculateDistance } from '@/utils/location';
import Header from '@/components/Header';

function CheckInContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const webcamRef = useRef<Webcam>(null);

  const [qrData, setQrData] = useState('');
  const [step, setStep] = useState<'info' | 'selfie' | 'processing' | 'success' | 'error'>('info');
  const [selfieImage, setSelfieImage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [storeInfo, setStoreInfo] = useState<any>(null);
  const [staffInfo, setStaffInfo] = useState({
    fullName: '',
    email: '',
    phone: '',
  });
  const [isCheckOut, setIsCheckOut] = useState(false);
  const [checkInTime, setCheckInTime] = useState<string>('');
  const [duration, setDuration] = useState<string>('');

  useEffect(() => {
    const qr = searchParams.get('qr');
    if (qr) {
      setQrData(qr);
      loadStoreInfo(qr);
    }
  }, [searchParams]);

  async function loadStoreInfo(qrCode: string) {
    try {
      const { data, error } = await supabase
        .from('stores')
        .select('*')
        .eq('qr_code', qrCode)
        .single();

      if (error) throw error;
      setStoreInfo(data);
    } catch (error) {
      console.error('Error loading store:', error);
      setErrorMessage('Không tìm thấy cửa hàng. Vui lòng quét lại mã QR.');
      setStep('error');
    }
  }

  function handleStartCheckIn() {
    if (!staffInfo.fullName || !staffInfo.email) {
      alert('Vui lòng nhập đầy đủ thông tin');
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
    if (!selfieImage || !storeInfo) return;

    setStep('processing');

    try {
      // Get current location
      const location = await getCurrentLocation();
      if (!location) {
        throw new Error('Không thể lấy vị trí hiện tại. Vui lòng bật GPS.');
      }

      // Calculate distance
      const distance = calculateDistance(
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

      // Check if email is in staff list (authorized)
      const { data: existingStaff, error: staffCheckError } = await supabase
        .from('staff')
        .select('id')
        .eq('email', staffInfo.email)
        .eq('store_id', storeInfo.id)
        .single();

      if (staffCheckError || !existingStaff) {
        throw new Error('Email chưa được thêm vào danh sách nhân viên. Vui lòng liên hệ chủ cửa hàng.');
      }

      const staffId = existingStaff.id;

      // Check if already checked in TODAY
      const today = new Date().toISOString().split('T')[0];
      const { data: todayCheckIn } = await supabase
        .from('check_ins')
        .select('*')
        .eq('staff_id', staffId)
        .eq('store_id', storeInfo.id)
        .gte('check_in_time', `${today}T00:00:00`)
        .lte('check_in_time', `${today}T23:59:59`)
        .single();

      // Upload selfie to storage
      const fileName = `${staffId}-${Date.now()}.jpg`;
      const base64Data = selfieImage.split(',')[1];
      const blob = await fetch(`data:image/jpeg;base64,${base64Data}`).then(r => r.blob());

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('selfies')
        .upload(fileName, blob, {
          contentType: 'image/jpeg',
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('selfies')
        .getPublicUrl(fileName);

      if (!todayCheckIn) {
        // FIRST SCAN OF THE DAY → CHECK-IN
        const { error: checkInError } = await supabase
          .from('check_ins')
          .insert([
            {
              staff_id: staffId,
              store_id: storeInfo.id,
              latitude: location.latitude,
              longitude: location.longitude,
              distance_meters: distance,
              selfie_url: publicUrl,
              status: 'checked_in',
            },
          ]);

        if (checkInError) throw checkInError;

        setIsCheckOut(false);
        setCheckInTime(new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }));
      } else {
        // SUBSEQUENT SCAN → CHECK-OUT (UPDATE EXISTING RECORD)
        const checkOutTime = new Date();
        const checkInDate = new Date(todayCheckIn.check_in_time);
        const durationMin = Math.floor((checkOutTime.getTime() - checkInDate.getTime()) / 1000 / 60);

        const hours = Math.floor(durationMin / 60);
        const minutes = durationMin % 60;
        const durationText = `${hours} giờ ${minutes} phút`;

        const { error: checkOutError } = await supabase
          .from('check_ins')
          .update({
            check_out_time: checkOutTime.toISOString(),
            check_out_selfie_url: publicUrl,
            check_out_latitude: location.latitude,
            check_out_longitude: location.longitude,
            check_out_distance_meters: distance,
            duration_minutes: durationMin,
            status: 'checked_out',
          })
          .eq('id', todayCheckIn.id);

        if (checkOutError) throw checkOutError;

        setIsCheckOut(true);
        setCheckInTime(checkInDate.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }));
        setDuration(durationText);
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
        {/* Step 1: Staff Info */}
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
              <p className="text-gray-600">{storeInfo.address}</p>
            </div>

            <form className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Họ và Tên *
                </label>
                <input
                  type="text"
                  required
                  value={staffInfo.fullName}
                  onChange={(e) => setStaffInfo({ ...staffInfo, fullName: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Nguyễn Văn A"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Email *
                </label>
                <input
                  type="email"
                  required
                  value={staffInfo.email}
                  onChange={(e) => setStaffInfo({ ...staffInfo, email: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="email@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Số Điện Thoại
                </label>
                <input
                  type="tel"
                  value={staffInfo.phone}
                  onChange={(e) => setStaffInfo({ ...staffInfo, phone: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="0912345678"
                />
              </div>

              <button
                type="button"
                onClick={handleStartCheckIn}
                className="w-full bg-green-600 hover:bg-green-700 text-white px-6 py-4 rounded-lg font-semibold text-lg transition-all"
              >
                Tiếp Theo
              </button>
            </form>
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
              // Check-in success
              <>
                <h2 className="text-3xl font-bold text-gray-800 mb-4">
                  Điểm Danh Thành Công!
                </h2>
                <div className="bg-blue-50 rounded-lg p-6 mb-6">
                  <p className="text-lg text-gray-700 mb-2">
                    <span className="font-semibold">Giờ vào:</span> {checkInTime}
                  </p>
                  <p className="text-sm text-gray-500">
                    Nhớ quét mã QR để check-out khi kết thúc ca làm việc
                  </p>
                </div>
                <p className="text-gray-600 mb-8">
                  Chúc bạn làm việc hiệu quả!
                </p>
              </>
            ) : (
              // Check-out success
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
                  Cảm ơn bạn đã làm việc chăm chỉ!
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
