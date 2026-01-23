'use client';

import { useEffect, useState } from 'react';

/**
 * Component to detect and force reload when new version is deployed
 * Prevents users from getting stuck on old cached versions
 */
export function VersionChecker() {
  const [showReloadPrompt, setShowReloadPrompt] = useState(false);

  useEffect(() => {
    // Check for new version every 5 minutes
    const checkVersion = async () => {
      try {
        const response = await fetch('/api/version', {
          cache: 'no-store',
        });

        if (response.ok) {
          const { version, buildId } = await response.json();
          const currentVersion = localStorage.getItem('app_version');

          if (currentVersion && currentVersion !== version) {
            // New version detected
            setShowReloadPrompt(true);
          } else {
            localStorage.setItem('app_version', version);
            localStorage.setItem('app_build_id', buildId);
          }
        }
      } catch (error) {
        console.error('Version check failed:', error);
      }
    };

    // Check immediately
    checkVersion();

    // Check every 5 minutes
    const interval = setInterval(checkVersion, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  const handleReload = () => {
    // Clear all caches and reload
    if ('caches' in window) {
      caches.keys().then((names) => {
        names.forEach((name) => caches.delete(name));
      });
    }

    // Force hard reload
    window.location.reload();
  };

  if (!showReloadPrompt) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:max-w-md">
      <div className="bg-blue-600 text-white p-4 rounded-lg shadow-lg">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="font-semibold mb-1">Phiên bản mới có sẵn!</h3>
            <p className="text-sm text-blue-100 mb-3">
              Ứng dụng đã được cập nhật. Vui lòng tải lại trang để sử dụng phiên bản mới nhất.
            </p>
            <button
              onClick={handleReload}
              className="bg-white text-blue-600 px-4 py-2 rounded font-semibold hover:bg-blue-50 transition-colors w-full"
            >
              Tải lại ngay
            </button>
          </div>
          <button
            onClick={() => setShowReloadPrompt(false)}
            className="flex-shrink-0 text-white hover:text-blue-100"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
