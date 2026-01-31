'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

export interface Tab {
  id: string;
  label: string;
  icon?: string;
}

interface Props {
  tabs: Tab[];
  defaultTab?: string;
  onChange?: (tabId: string) => void;
  className?: string;
}

/**
 * Shared tab navigation component with URL persistence
 *
 * Features:
 * - Persists active tab in URL query params (?tab=xxx)
 * - Restores active tab on page reload
 * - Clean, responsive design
 * - Workspace-agnostic
 */
export default function TabNavigation({
  tabs,
  defaultTab,
  onChange,
  className = '',
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Initialize from URL or default
  const [activeTab, setActiveTab] = useState<string>(() => {
    const tabFromUrl = searchParams.get('tab');
    const validTabIds = tabs.map(t => t.id);

    if (tabFromUrl && validTabIds.includes(tabFromUrl)) {
      return tabFromUrl;
    }

    return defaultTab || tabs[0]?.id || '';
  });

  // Update URL on mount if no tab query param exists
  useEffect(() => {
    const tabFromUrl = searchParams.get('tab');
    if (!tabFromUrl) {
      const initialTab = defaultTab || tabs[0]?.id;
      if (initialTab) {
        const currentUrl = new URL(window.location.href);
        currentUrl.searchParams.set('tab', initialTab);
        router.replace(currentUrl.pathname + currentUrl.search, { scroll: false });
      }
    }
  }, []);

  // Update URL when tab changes
  const updateActiveTab = (tabId: string) => {
    setActiveTab(tabId);

    // Update URL with tab query param to persist across reloads
    const currentUrl = new URL(window.location.href);
    currentUrl.searchParams.set('tab', tabId);
    router.replace(currentUrl.pathname + currentUrl.search, { scroll: false });

    // Call onChange callback if provided
    if (onChange) {
      onChange(tabId);
    }
  };

  return (
    <div className={`border-b border-gray-200 ${className}`}>
      <nav className="flex gap-2 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => updateActiveTab(tab.id)}
            className={`
              flex items-center gap-2 px-4 py-2 border-b-2 font-medium text-sm whitespace-nowrap transition-colors
              ${activeTab === tab.id
                ? 'border-green-500 text-green-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }
            `}
          >
            {tab.icon && <span>{tab.icon}</span>}
            {tab.label}
          </button>
        ))}
      </nav>
    </div>
  );
}

/**
 * Hook to use tab state with URL persistence
 *
 * Usage:
 * const activeTab = useTabNavigation(tabs, 'today');
 */
export function useTabNavigation(tabs: Tab[], defaultTab?: string): string {
  const searchParams = useSearchParams();

  const tabFromUrl = searchParams.get('tab');
  const validTabIds = tabs.map(t => t.id);

  if (tabFromUrl && validTabIds.includes(tabFromUrl)) {
    return tabFromUrl;
  }

  return defaultTab || tabs[0]?.id || '';
}
