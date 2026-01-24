'use client';

import { useEffect, useState } from 'react';

/**
 * Handles network/DNS errors and helps users recover
 * Detects ERR_ADDRESS_UNREACHABLE and similar issues
 */
export function NetworkErrorHandler() {
  const [showError, setShowError] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [autoReloadCountdown, setAutoReloadCountdown] = useState<number | null>(null);

  useEffect(() => {
    // Check if we're online
    setIsOnline(navigator.onLine);

    // Listen for online/offline events
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    let countdownInterval: NodeJS.Timeout | null = null;

    // Test connectivity to API
    const testConnectivity = async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const response = await fetch('/api/version', {
          signal: controller.signal,
          cache: 'no-store',
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          setShowError(true);
          startAutoReloadCountdown();
        } else {
          // Connection successful, hide error if showing
          setShowError(false);
          if (countdownInterval) {
            clearInterval(countdownInterval);
            setAutoReloadCountdown(null);
          }
        }
      } catch (error) {
        console.error('Connectivity test failed:', error);
        setShowError(true);
        startAutoReloadCountdown();
      }
    };

    const startAutoReloadCountdown = () => {
      // Don't start another countdown if one is already running
      if (countdownInterval) return;

      // Auto-reload after 30 seconds if user doesn't take action
      let countdown = 30;
      setAutoReloadCountdown(countdown);

      countdownInterval = setInterval(() => {
        countdown--;
        setAutoReloadCountdown(countdown);

        if (countdown <= 0) {
          if (countdownInterval) clearInterval(countdownInterval);
          handleClearAndReload();
        }
      }, 1000);
    };

    // Test on mount and every 30 seconds
    testConnectivity();
    const interval = setInterval(testConnectivity, 30000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
      if (countdownInterval) clearInterval(countdownInterval);
    };
  }, []);

  const handleForceReload = () => {
    // Clear all caches
    if ('caches' in window) {
      caches.keys().then((names) => {
        names.forEach((name) => caches.delete(name));
      });
    }

    // Clear DNS cache by adding timestamp
    const timestamp = Date.now();
    window.location.href = `${window.location.origin}${window.location.pathname}?t=${timestamp}`;
  };

  const handleClearAndReload = () => {
    // Clear all local storage
    localStorage.clear();
    sessionStorage.clear();

    // Clear cookies
    document.cookie.split(";").forEach((c) => {
      document.cookie = c
        .replace(/^ +/, "")
        .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
    });

    // Force reload
    handleForceReload();
  };

  if (!isOnline) {
    return (
      <div className="fixed inset-0 bg-gray-900 bg-opacity-95 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414" />
            </svg>
          </div>

          <h3 className="text-xl font-bold text-gray-900 mb-2">
            Không có kết nối Internet
          </h3>

          <p className="text-gray-600 mb-6">
            Vui lòng kiểm tra kết nối mạng của bạn và thử lại.
          </p>

          <button
            onClick={() => window.location.reload()}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
          >
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  if (showError) {
    return (
      <div className="fixed inset-0 bg-gray-900 bg-opacity-95 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>

            <h3 className="text-xl font-bold text-gray-900 mb-2">
              Lỗi kết nối đến server
            </h3>

            <p className="text-gray-600 mb-4">
              Có vẻ như bạn đang sử dụng phiên bản cũ hoặc DNS cache đang gây lỗi.
            </p>

            {autoReloadCountdown !== null && autoReloadCountdown > 0 && (
              <div className="mb-2 p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
                <p className="text-sm text-blue-900 font-medium text-center">
                  ⏰ Tự động tải lại sau: <span className="text-3xl font-bold text-blue-600">{autoReloadCountdown}s</span>
                </p>
                <p className="text-xs text-blue-700 mt-1 text-center">
                  Hoặc nhấn nút bên dưới để tải lại ngay
                </p>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <button
              onClick={handleForceReload}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
            >
              Tải lại trang
            </button>

            <button
              onClick={handleClearAndReload}
              className="w-full bg-yellow-600 hover:bg-yellow-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
            >
              Xóa cache và tải lại
            </button>

            <button
              onClick={() => setShowError(false)}
              className="w-full bg-gray-200 hover:bg-gray-300 text-gray-700 px-6 py-3 rounded-lg font-semibold transition-colors"
            >
              Tiếp tục thử
            </button>
          </div>

          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-600 mb-2">
              <strong>Nếu vẫn lỗi, thử các cách sau:</strong>
            </p>
            <ol className="text-xs text-gray-600 space-y-1 list-decimal list-inside">
              <li>Đóng app hoàn toàn và mở lại</li>
              <li>Xóa cache trình duyệt trong Cài đặt</li>
              <li>Thử kết nối WiFi khác hoặc dùng 4G</li>
              <li>Mở bằng trình duyệt Chrome thay vì in-app browser</li>
            </ol>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
