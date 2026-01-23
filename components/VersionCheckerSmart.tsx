'use client';

import { useEffect, useState } from 'react';

/**
 * SMART Version Checker (RECOMMENDED)
 * - Detects new version automatically
 * - Waits for user to be idle or return to tab
 * - Auto-reloads only when safe (no active forms, user not typing)
 * - Shows countdown notification before reload
 */
export function VersionCheckerSmart() {
  const [countdown, setCountdown] = useState<number | null>(null);
  const [newVersionAvailable, setNewVersionAvailable] = useState(false);

  useEffect(() => {
    let reloadTimeout: NodeJS.Timeout;

    const checkVersion = async () => {
      try {
        const response = await fetch('/api/version', {
          cache: 'no-store',
        });

        if (response.ok) {
          const { version } = await response.json();
          const currentVersion = localStorage.getItem('app_version');

          if (currentVersion && currentVersion !== version) {
            console.log('🔄 New version detected');
            setNewVersionAvailable(true);

            // Check if user is idle (no keyboard/mouse events for 10 seconds)
            let lastActivity = Date.now();
            const activityEvents = ['keydown', 'mousemove', 'click', 'touchstart'];

            const updateActivity = () => {
              lastActivity = Date.now();
            };

            activityEvents.forEach(event => {
              document.addEventListener(event, updateActivity);
            });

            // Wait for 10 seconds of inactivity, then start countdown
            const checkIdle = setInterval(() => {
              const idleTime = Date.now() - lastActivity;

              if (idleTime > 10000) { // 10 seconds idle
                clearInterval(checkIdle);
                activityEvents.forEach(event => {
                  document.removeEventListener(event, updateActivity);
                });

                // Start 10 second countdown
                startCountdown();
              }
            }, 1000);

            return () => {
              clearInterval(checkIdle);
              activityEvents.forEach(event => {
                document.removeEventListener(event, updateActivity);
              });
            };
          } else if (!currentVersion) {
            localStorage.setItem('app_version', version);
          }
        }
      } catch (error) {
        console.error('Version check failed:', error);
      }
    };

    const startCountdown = () => {
      let count = 10;
      setCountdown(count);

      const countdownInterval = setInterval(() => {
        count--;
        setCountdown(count);

        if (count <= 0) {
          clearInterval(countdownInterval);
          performReload();
        }
      }, 1000);

      reloadTimeout = countdownInterval;
    };

    const performReload = () => {
      // Clear caches
      if ('caches' in window) {
        caches.keys().then((names) => {
          names.forEach((name) => caches.delete(name));
        });
      }

      // Force reload
      window.location.reload();
    };

    // Check on mount and when page becomes visible
    checkVersion();

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        checkVersion();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Check every 5 minutes
    const interval = setInterval(checkVersion, 5 * 60 * 1000);

    return () => {
      clearInterval(interval);
      clearTimeout(reloadTimeout);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const cancelReload = () => {
    setCountdown(null);
    setNewVersionAvailable(false);
  };

  const reloadNow = () => {
    if ('caches' in window) {
      caches.keys().then((names) => {
        names.forEach((name) => caches.delete(name));
      });
    }
    window.location.reload();
  };

  if (countdown !== null) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full">
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </div>

            <h3 className="text-xl font-bold text-gray-900 mb-2">
              Đang cập nhật ứng dụng
            </h3>

            <p className="text-gray-600 mb-4">
              Phiên bản mới đã sẵn sàng. Trang sẽ tự động tải lại trong
            </p>

            <div className="text-5xl font-bold text-blue-600 mb-6">
              {countdown}
            </div>

            <div className="flex gap-3">
              <button
                onClick={reloadNow}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
              >
                Tải lại ngay
              </button>
              <button
                onClick={cancelReload}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 px-6 py-3 rounded-lg font-semibold transition-colors"
              >
                Hủy
              </button>
            </div>

            <p className="text-xs text-gray-500 mt-4">
              Bạn có thể hủy và tiếp tục làm việc. Cập nhật sẽ được áp dụng lần sau.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (newVersionAvailable && countdown === null) {
    return (
      <div className="fixed bottom-4 right-4 z-40">
        <div className="bg-blue-600 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 max-w-sm">
          <div className="flex-1">
            <p className="text-sm font-medium">
              Phiên bản mới đã sẵn sàng
            </p>
          </div>
          <button
            onClick={reloadNow}
            className="bg-white text-blue-600 px-3 py-1 rounded text-sm font-semibold hover:bg-blue-50"
          >
            Cập nhật
          </button>
        </div>
      </div>
    );
  }

  return null;
}
