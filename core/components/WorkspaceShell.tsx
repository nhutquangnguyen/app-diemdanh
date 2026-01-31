'use client';

import { useState, useEffect, ReactElement } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Workspace } from '../types/workspace';
import { WorkspacePlugin } from '../types/plugin';
import { getFeature } from '../utils/featureRegistry';
import { useFeature } from '../hooks/useFeature';
import { PageLayout, PageHeader, TabNavigation, TabItem, Card } from '@/components/ui';

interface WorkspaceShellProps {
  workspace: Workspace;
  plugin: WorkspacePlugin;
}

export function WorkspaceShell({ workspace, plugin }: WorkspaceShellProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Get initial tab from URL or use first tab
  const [activeTab, setActiveTab] = useState<string>(() => {
    const tabFromUrl = searchParams.get('tab');
    const validTabIds = plugin.config.tabs.map(t => t.id);
    if (tabFromUrl && validTabIds.includes(tabFromUrl)) {
      return tabFromUrl;
    }
    return plugin.config.tabs[0]?.id || '';
  });

  // Update URL when tab changes
  const updateActiveTab = (tabId: string) => {
    setActiveTab(tabId);
    const currentUrl = new URL(window.location.href);
    currentUrl.searchParams.set('tab', tabId);
    router.replace(currentUrl.pathname + currentUrl.search, { scroll: false });
  };

  // Set initial tab in URL if not present
  useEffect(() => {
    const tabFromUrl = searchParams.get('tab');
    if (!tabFromUrl) {
      const initialTab = plugin.config.tabs[0]?.id;
      if (initialTab) {
        const currentUrl = new URL(window.location.href);
        currentUrl.searchParams.set('tab', initialTab);
        router.replace(currentUrl.pathname + currentUrl.search, { scroll: false });
      }
    }
  }, []);

  // Get current tab configuration
  const currentTabConfig = plugin.config.tabs.find(t => t.id === activeTab);

  if (!currentTabConfig) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <p className="text-red-600">Tab configuration not found: {activeTab}</p>
      </div>
    );
  }

  // Get feature for this tab
  const { feature, config, enabled, adapter } = useFeature({
    plugin,
    featureId: currentTabConfig.feature,
  });

  if (!enabled) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <p className="text-gray-600">Feature "{currentTabConfig.feature}" is not enabled.</p>
      </div>
    );
  }

  if (!feature) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <p className="text-red-600">Feature not found: {currentTabConfig.feature}</p>
      </div>
    );
  }

  const FeatureComponent = feature.component;

  // Convert plugin tabs to TabNavigation format
  const tabItems: TabItem[] = plugin.config.tabs.map(tab => {
    // Icon mapping - convert emoji string or custom icon
    const iconElement = typeof tab.icon === 'string' && tab.icon.length <= 2 ? (
      <span className="text-xl">{tab.icon}</span>
    ) : (
      getIconComponent(tab.id)
    );

    return {
      id: tab.id,
      label: tab.label,
      icon: iconElement,
      inMoreMenu: tab.inMoreMenu,
    };
  });

  return (
    <PageLayout>
      <PageHeader
        title={workspace.name}
        subtitle={plugin.displayName}
        backHref="/owner"
      />

      <TabNavigation
        tabs={tabItems}
        activeTab={activeTab}
        onTabChange={updateActiveTab}
      />

      {/* Feature Content */}
      <Card padding="none" className="mb-20 sm:mb-4 overflow-hidden">
        <FeatureComponent
          workspaceId={workspace.id}
          config={config}
          adapter={adapter}
        />
      </Card>
    </PageLayout>
  );
}

// Helper function to get icon components based on tab ID
function getIconComponent(tabId: string): ReactElement {
  const iconMap: Record<string, ReactElement> = {
    today: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    schedule: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
    timetable: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
    salary: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    'ai-schedule': (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    ),
    staff: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
    students: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
    shifts: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    qr: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
      </svg>
    ),
    settings: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  };

  return iconMap[tabId] || (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
    </svg>
  );
}
