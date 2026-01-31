'use client';

/**
 * TabNavigation - Consistent tab navigation for desktop and mobile
 *
 * Design principles from diemdanh.net:
 * - Desktop: Horizontal tabs with rounded corners, blue accent when active
 * - Mobile: Fixed bottom navigation with icons and labels
 * - Smooth transitions and hover effects
 * - Support for "More" dropdown menu on desktop
 * - Badge support for notifications
 */

import { ReactNode, useRef, useEffect, useState } from 'react';

export interface TabItem {
  id: string;
  label: string;
  icon: ReactNode;
  /** Show badge (e.g., notification dot) */
  badge?: boolean;
  /** Badge count */
  badgeCount?: number;
  /** Show in "More" menu instead of main tabs (desktop only) */
  inMoreMenu?: boolean;
}

interface TabNavigationProps {
  /** Array of tab items */
  tabs: TabItem[];
  /** Currently active tab ID */
  activeTab: string;
  /** Callback when tab changes */
  onTabChange: (tabId: string) => void;
  /** Label for "More" menu button */
  moreLabel?: string;
}

export default function TabNavigation({
  tabs,
  activeTab,
  onTabChange,
  moreLabel = 'Mở rộng'
}: TabNavigationProps) {
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const moreMenuRefDesktop = useRef<HTMLDivElement>(null);
  const moreMenuRefMobile = useRef<HTMLDivElement>(null);

  // Separate main tabs and more menu tabs
  const mainTabs = tabs.filter(tab => !tab.inMoreMenu);
  const moreTabs = tabs.filter(tab => tab.inMoreMenu);

  // Check if active tab is in more menu
  const activeInMore = moreTabs.some(tab => tab.id === activeTab);

  // Close more menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const clickedInsideDesktop = moreMenuRefDesktop.current?.contains(event.target as Node);
      const clickedInsideMobile = moreMenuRefMobile.current?.contains(event.target as Node);

      if (!clickedInsideDesktop && !clickedInsideMobile) {
        setShowMoreMenu(false);
      }
    }

    if (showMoreMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showMoreMenu]);

  const handleTabClick = (tabId: string) => {
    onTabChange(tabId);
    setShowMoreMenu(false);
  };

  return (
    <>
      {/* Desktop Tab Navigation */}
      <div className="hidden sm:flex bg-white rounded-lg shadow-lg mb-4 p-2 gap-2 relative">
        {mainTabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => handleTabClick(tab.id)}
            className={`flex-1 px-4 py-3 rounded-lg font-semibold transition-all relative ${
              activeTab === tab.id
                ? 'bg-blue-600 text-white'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            {tab.label}
            {tab.badge && (
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-600 rounded-full border-2 border-white"></span>
            )}
            {tab.badgeCount !== undefined && tab.badgeCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[20px] h-5 bg-red-600 rounded-full text-white text-xs flex items-center justify-center px-1 border-2 border-white">
                {tab.badgeCount > 99 ? '99+' : tab.badgeCount}
              </span>
            )}
          </button>
        ))}

        {moreTabs.length > 0 && (
          <div ref={moreMenuRefDesktop} className="relative flex-1">
            <button
              type="button"
              onClick={() => setShowMoreMenu(!showMoreMenu)}
              className={`w-full px-4 py-3 rounded-lg font-semibold transition-all ${
                activeInMore || showMoreMenu
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              } flex items-center justify-center gap-2`}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
              {moreLabel}
            </button>
            {showMoreMenu && (
              <div className="absolute right-0 top-full mt-2 bg-white rounded-lg shadow-xl border border-gray-200 py-2 min-w-[200px] z-50">
                {moreTabs.map(tab => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => handleTabClick(tab.id)}
                    className="w-full text-left px-4 py-3 hover:bg-gray-100 transition-all flex items-center gap-3"
                  >
                    <div className="text-gray-600">
                      {tab.icon}
                    </div>
                    <span className="font-semibold text-gray-700">{tab.label}</span>
                    {tab.badge && (
                      <span className="ml-auto w-2.5 h-2.5 bg-red-600 rounded-full"></span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-40">
        <div className={`grid gap-1 p-2`} style={{ gridTemplateColumns: `repeat(${Math.min(mainTabs.length + (moreTabs.length > 0 ? 1 : 0), 5)}, minmax(0, 1fr))` }}>
          {mainTabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              className={`w-full flex flex-col items-center py-2 px-1 rounded-lg transition-all relative ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600'
              }`}
            >
              <div className="mb-1">
                {tab.icon}
              </div>
              <span className="text-xs font-semibold truncate max-w-full">{tab.label}</span>
              {tab.badge && (
                <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-600 rounded-full border border-white"></span>
              )}
              {tab.badgeCount !== undefined && tab.badgeCount > 0 && (
                <span className="absolute top-0 right-0 min-w-[16px] h-4 bg-red-600 rounded-full text-white text-[10px] flex items-center justify-center px-1 border border-white">
                  {tab.badgeCount > 99 ? '99+' : tab.badgeCount}
                </span>
              )}
            </button>
          ))}

          {moreTabs.length > 0 && (
            <div ref={moreMenuRefMobile} className="relative">
              <button
                type="button"
                onClick={() => setShowMoreMenu(!showMoreMenu)}
                className={`w-full flex flex-col items-center py-2 px-1 rounded-lg transition-all ${
                  activeInMore || showMoreMenu
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600'
                }`}
              >
                <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
                <span className="text-xs font-semibold">{moreLabel}</span>
              </button>
              {showMoreMenu && (
                <div className="absolute bottom-full right-0 mb-2 bg-white rounded-lg shadow-xl border border-gray-200 py-2 min-w-[200px]">
                  {moreTabs.map(tab => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => handleTabClick(tab.id)}
                      className="w-full text-left px-4 py-3 hover:bg-gray-100 transition-all flex items-center gap-3"
                    >
                      <div className="text-gray-600">
                        {tab.icon}
                      </div>
                      <span className="font-semibold text-gray-700">{tab.label}</span>
                      {tab.badge && (
                        <span className="ml-auto w-2.5 h-2.5 bg-red-600 rounded-full"></span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
