'use client';

import { useState, useEffect, ReactElement } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Workspace } from '../types/workspace';
import { WorkspacePlugin } from '../types/plugin';
import { getFeature } from '../utils/featureRegistry';
import { useFeature } from '../hooks/useFeature';
import {
  PageLayout,
  PageHeader,
  TabNavigation,
  TabItem,
  Card,
  ClockIcon,
  CalendarIcon,
  DollarIcon,
  LightbulbIcon,
  UsersIcon,
  QRCodeIcon,
  SettingsIcon,
} from '@/components/ui';

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

  // Use adapter's Feature component override if available, otherwise use default
  const FeatureComponent = adapter?.components?.Feature || feature.component;

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
    today: <ClockIcon />,
    schedule: <CalendarIcon />,
    timetable: <CalendarIcon />,
    salary: <DollarIcon />,
    'ai-schedule': <LightbulbIcon />,
    staff: <UsersIcon />,
    students: <UsersIcon />,
    shifts: <ClockIcon />,
    qr: <QRCodeIcon />,
    settings: <SettingsIcon />,
  };

  return iconMap[tabId] || <ClockIcon />;
}
