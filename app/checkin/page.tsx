'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { getCurrentUser } from '@/lib/auth';
import Header from '@/components/Header';

export default function CheckInPage() {
  const router = useRouter();
  const [scanning, setScanning] = useState(true); // Start scanning immediately
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
    if (scanning && !loading) { // Only start scanner after auth check is complete
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

        // The QR code contains the full URL: https://diemdanh.net/checkin/submit?store=abc123
        // Extract the store ID from the URL
        try {
          const url = new URL(decodedText);
          const storeId = url.searchParams.get('store');

          if (storeId) {
            // Redirect to check-in page with store ID
            window.location.href = `/checkin/submit?store=${storeId}`;
          } else {
            alert('Mã QR không hợp lệ. Vui lòng thử lại.');
            setScanning(false);
          }
        } catch (error) {
          // If URL parsing fails, assume it's the old format (just the QR code)
          window.location.href = `/checkin/submit?qr=${encodeURIComponent(decodedText)}`;
        }
      }

      function onScanError(error: any) {
        // Silent error handling
      }

      return () => {
        scanner.clear().catch(() => {});
      };
    }
  }, [scanning, loading]);

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
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-2 text-center">
            Quét Mã QR Điểm Danh
          </h2>
          <p className="text-gray-600 mb-6 text-center text-sm">
            Hướng camera vào mã QR tại cửa hàng
          </p>
          <div id="qr-reader" className="w-full mb-6"></div>

          <div className="pt-6 border-t border-gray-200">
            <h3 className="font-semibold text-gray-800 mb-4 text-center">Hướng dẫn:</h3>
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
      </main>
    </div>
  );
}
