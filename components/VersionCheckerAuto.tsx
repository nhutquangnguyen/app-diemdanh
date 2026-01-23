'use client';

import { useEffect } from 'react';

/**
 * AUTOMATIC Version Checker - Force reloads when new version detected
 * WARNING: This will reload the page automatically without user consent
 * Use only if you want aggressive auto-updates
 */
export function VersionCheckerAuto() {
  useEffect(() => {
    // Check for new version every 3 minutes
    const checkVersion = async () => {
      try {
        const response = await fetch('/api/version', {
          cache: 'no-store',
        });

        if (response.ok) {
          const { version } = await response.json();
          const currentVersion = localStorage.getItem('app_version');

          if (currentVersion && currentVersion !== version) {
            console.log('🔄 New version detected, auto-reloading...');

            // Clear all caches
            if ('caches' in window) {
              caches.keys().then((names) => {
                names.forEach((name) => caches.delete(name));
              });
            }

            // Clear localStorage except user data
            const userDataKeys = ['app_version', 'app_build_id'];
            localStorage.setItem('app_version', version);

            // Force hard reload
            window.location.reload();
          } else if (!currentVersion) {
            // First visit, save version
            localStorage.setItem('app_version', version);
          }
        }
      } catch (error) {
        console.error('Version check failed:', error);
      }
    };

    // Check immediately on mount
    checkVersion();

    // Check every 3 minutes
    const interval = setInterval(checkVersion, 3 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  return null; // No UI needed
}
