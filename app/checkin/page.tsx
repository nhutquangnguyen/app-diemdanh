'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { getCurrentUser } from '@/lib/auth';
import Header from '@/components/Header';

export default function CheckInPage() {
  const router = useRouter();
  const [scanning, setScanning] = useState(false);
  const [scannedData, setScannedData] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      router.push('/auth/login?returnUrl=/checkin');
      return;
    }
    setLoading(false);
  }

  useEffect(() => {
    if (scanning) {
      const scanner = new Html5QrcodeScanner(
        'qr-reader',
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0
        },
        false
      );

      scanner.render(onScanSuccess, onScanError);

      function onScanSuccess(decodedText: string) {
        setScannedData(decodedText);
        scanner.clear();
        setScanning(false);
        // Redirect to check-in page with QR data
        window.location.href = `/checkin/submit?qr=${encodeURIComponent(decodedText)}`;
      }

      function onScanError(error: any) {
        // Silent error handling
      }

      return () => {
        scanner.clear().catch(() => {});
      };
    }
  }, [scanning]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100">
      <Header />

      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!scanning ? (
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-12 h-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
              </svg>
            </div>
            <h2 className="text-3xl font-bold text-gray-800 mb-4">
              Quét Mã QR Điểm Danh
            </h2>
            <p className="text-gray-600 mb-8">
              Hướng camera vào mã QR tại cửa hàng để bắt đầu điểm danh
            </p>
            <button
              onClick={() => setScanning(true)}
              className="bg-green-600 hover:bg-green-700 text-white px-8 py-4 rounded-lg font-semibold text-lg flex items-center gap-3 mx-auto transition-all"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Bắt Đầu Quét
            </button>

            <div className="mt-8 pt-8 border-t border-gray-200">
              <h3 className="font-semibold text-gray-800 mb-4">Hướng dẫn:</h3>
              <ol className="text-left text-sm text-gray-600 space-y-2 max-w-md mx-auto">
                <li className="flex items-start gap-2">
                  <span className="bg-green-100 text-green-800 rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 font-semibold">1</span>
                  <span>Quét mã QR tại cửa hàng</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="bg-green-100 text-green-800 rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 font-semibold">2</span>
                  <span>Chụp ảnh selfie xác nhận</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="bg-green-100 text-green-800 rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 font-semibold">3</span>
                  <span>Hệ thống tự động kiểm tra vị trí</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="bg-green-100 text-green-800 rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 font-semibold">4</span>
                  <span>Hoàn thành điểm danh!</span>
                </li>
              </ol>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="mb-6">
              <button
                onClick={() => setScanning(false)}
                className="text-gray-600 hover:text-gray-800 flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Hủy
              </button>
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">
              Đang Quét Mã QR...
            </h2>
            <div id="qr-reader" className="w-full"></div>
          </div>
        )}
      </main>
    </div>
  );
}
