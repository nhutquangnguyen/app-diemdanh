'use client';

/**
 * TabNavigation - Production-style tab navigation
 *
 * Design from diemdanh.net production:
 * - Clean border-bottom style with green accent on desktop
 * - Mobile: Blue filled buttons for active state
 * - Mobile More menu: Popup above button (not full-screen)
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

  // Render icon based on type (emoji string or icon name)
  const renderIcon = (icon: ReactNode) => {
    if (typeof icon === 'string') {
      // Check if it's an icon name (not emoji)
      if (icon === 'clock-circle') {
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      } else if (icon === 'calendar') {
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        );
      } else if (icon === 'currency-dollar') {
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      } else if (icon === 'lightbulb') {
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        );
      } else if (icon === 'users') {
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        );
      } else if (icon === 'clock') {
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      } else if (icon === 'qrcode') {
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
          </svg>
        );
      } else if (icon === 'cog') {
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        );
      }
      // If it's an emoji or other string, render as text
      return <span className="text-xl">{icon}</span>;
    }
    // If it's already a ReactNode (JSX), render it directly
    return icon;
  };

  return (
    <>
      {/* Desktop Tab Navigation - Production Style */}
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
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-600 rounded-full text-white text-[10px] flex items-center justify-center px-1 border-2 border-white">
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
              className={`w-full px-4 py-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 ${
                activeInMore || showMoreMenu
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
              {moreLabel}
            </button>
            {showMoreMenu && (
              <div className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-xl border border-gray-200 py-2 min-w-[200px] z-50">
                {moreTabs.map(tab => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => handleTabClick(tab.id)}
                    className="w-full text-left px-4 py-3 hover:bg-gray-100 transition-all flex items-center gap-3"
                  >
                    <div className="text-gray-500">
                      {renderIcon(tab.icon)}
                    </div>
                    <span className="font-medium text-gray-800">{tab.label}</span>
                    {tab.badge && (
                      <span className="ml-auto w-2 h-2 bg-red-600 rounded-full"></span>
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
                {renderIcon(tab.icon)}
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
                <div className="absolute bottom-full right-0 mb-2 bg-white rounded-lg shadow-xl border border-gray-200 py-2 min-w-[200px] z-50">
                  {moreTabs.map(tab => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => handleTabClick(tab.id)}
                      className="w-full text-left px-4 py-3 hover:bg-gray-100 transition-all flex items-center gap-3"
                    >
                      <div className="text-gray-500">
                        {renderIcon(tab.icon)}
                      </div>
                      <span className="font-medium text-gray-800">{tab.label}</span>
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
