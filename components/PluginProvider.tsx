'use client';

import { useEffect, useState } from 'react';
import { initializePlugins } from '@/config/plugins.config';

/**
 * Plugin Provider
 *
 * This component initializes the plugin system once when the app starts.
 * It wraps the app and ensures plugins are registered before any workspace loads.
 */
export function PluginProvider({ children }: { children: React.ReactNode }) {
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    // Initialize plugins on mount
    initializePlugins();
    setInitialized(true);
  }, []);

  // Don't render children until plugins are initialized
  if (!initialized) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Initializing plugins...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
