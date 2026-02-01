'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { Html5Qrcode } from 'html5-qrcode';
import Header from '@/components/Header';
import PermissionGuidance from '@/components/common/PermissionGuidance';

export default function ScanPage() {
  const router = useRouter();
  const [scanning, setScanning] = useState(true);
  const [cameraError, setCameraError] = useState(false);

  // QR Scanner
  useEffect(() => {
    if (!scanning) return;

    let html5QrCode: Html5Qrcode | null = null;
    let isScanning = false;

    const startScanner = async () => {
      try {
        html5QrCode = new Html5Qrcode('qr-reader');

        const config = {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        };

        await html5QrCode.start(
          { facingMode: 'environment' }, // Use back camera
          config,
          (decodedText) => {
            // Success callback
            handleScanSuccess(decodedText, html5QrCode!);
          },
          (errorMessage) => {
            // Error callback - silent
          }
        );
        isScanning = true;
      } catch (err) {
        // Check if it's a permission error
        const errorMessage = err instanceof Error ? err.message : String(err);
        if (
          errorMessage.includes('Permission') ||
          errorMessage.includes('NotAllowedError') ||
          errorMessage.includes('permission denied')
        ) {
          setCameraError(true);
          setScanning(false);
        }
      }
    };

    startScanner();

    return () => {
      if (html5QrCode && isScanning) {
        html5QrCode.stop().catch(() => {});
      }
    };
  }, [scanning]);

  async function handleScanSuccess(decodedText: string, scanner: Html5Qrcode) {
    // Stop the scanner
    scanner.stop().catch(() => {});
    setScanning(false);

    try {
      // Extract workspace ID from URL
      const url = new URL(decodedText);
      const workspaceId = url.searchParams.get('workspace') ||
                         url.searchParams.get('store') ||
                         url.searchParams.get('class');

      if (!workspaceId) {
        alert('QR code không hợp lệ');
        setScanning(true);
        return;
      }

      // Check if user is logged in
      const currentUser = await getCurrentUser();

      if (!currentUser) {
        // Redirect to login with return URL
        router.push(`/auth/login?returnUrl=${encodeURIComponent(`/scan?workspace=${workspaceId}`)}`);
        return;
      }

      // Load workspace to determine routing
      const { data: workspace, error: workspaceError } = await supabase
        .from('stores')
        .select('workspace_type, access_mode, name')
        .eq('id', workspaceId)
        .is('deleted_at', null)
        .single();

      if (workspaceError || !workspace) {
        alert('Không tìm thấy workspace');
        setScanning(true);
        return;
      }

      // Route based on workspace type and user membership
      await routeUser(workspaceId, workspace, currentUser);

    } catch (error) {
      console.error('Error handling scan:', error);
      alert('Có lỗi xảy ra. Vui lòng thử lại.');
      setScanning(true);
    }
  }

  async function routeUser(workspaceId: string, workspace: any, currentUser: any) {
    if (workspace.workspace_type === 'education') {
      // Check if student is enrolled
      const { data: studentData } = await supabase
        .from('students')
        .select('status')
        .eq('class_id', workspaceId)
        .eq('user_id', currentUser.id)
        .maybeSingle();

      if (studentData?.status === 'active') {
        // Active student → check-in
        router.push(`/member/${workspaceId}/checkin`);
      } else if (studentData?.status === 'pending') {
        alert('Yêu cầu ghi danh của bạn đang chờ duyệt.');
        router.push(`/member/${workspaceId}`);
      } else if (studentData?.status === 'rejected') {
        alert('Yêu cầu ghi danh của bạn đã bị từ chối.');
        router.push('/');
      } else if (workspace.access_mode === 'open_enrollment') {
        // Not enrolled but enrollment is open → enroll
        router.push(`/member/${workspaceId}/enroll`);
      } else {
        alert('Bạn chưa được thêm vào lớp học này. Vui lòng liên hệ giáo viên.');
        router.push('/');
      }
    } else {
      // Business workspace
      const { data: staffData } = await supabase
        .from('staff')
        .select('id, status')
        .eq('store_id', workspaceId)
        .eq('user_id', currentUser.id)
        .maybeSingle();

      if (staffData?.status === 'active') {
        // Active staff → check-in
        router.push(`/member/${workspaceId}/checkin`);
      } else if (!staffData) {
        alert('Bạn chưa được thêm vào cửa hàng này. Vui lòng liên hệ quản lý.');
        router.push('/');
      } else {
        alert('Tài khoản nhân viên của bạn chưa được kích hoạt.');
        router.push('/');
      }
    }
  }

  function handleCameraRetry() {
    setCameraError(false);
    setScanning(true);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100">
      <Header />

      <main className="max-w-2xl mx-auto px-4 py-8">
        {cameraError ? (
          <PermissionGuidance
            type="camera"
            onRetry={handleCameraRetry}
            renderMode="modal"
          />
        ) : (
          <div className="bg-white rounded-2xl shadow-xl p-6">
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold text-gray-800 mb-2">
                Quét Mã QR
              </h1>
              <p className="text-gray-600">
                Hướng camera vào mã QR để check-in hoặc ghi danh
              </p>
            </div>

            {/* QR Scanner */}
            <div className="relative">
              <div
                id="qr-reader"
                className="rounded-xl overflow-hidden"
              />
              {!scanning && (
                <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-xl">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
                </div>
              )}
            </div>

            <div className="mt-6 text-center text-sm text-gray-500">
              <p>Đảm bảo camera có quyền truy cập và mã QR rõ ràng</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
