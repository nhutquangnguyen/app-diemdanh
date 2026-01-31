'use client';

import { useState } from 'react';
import { TabConfig } from '../types/plugin';

interface TabSystemProps {
  tabs: TabConfig[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

export function TabSystem({ tabs, activeTab, onTabChange }: TabSystemProps) {
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  const primaryTabs = tabs.filter(tab => !tab.inMoreMenu);
  const moreTabs = tabs.filter(tab => tab.inMoreMenu);

  return (
    <nav className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Desktop Navigation */}
        <div className="hidden md:flex space-x-8 overflow-x-auto">
          {primaryTabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`
                py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors
                ${activeTab === tab.id
                  ? 'border-green-500 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              {tab.icon && <span className="mr-2">{tab.icon}</span>}
              {tab.label}
              {tab.showWarningBadge && (
                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                  !
                </span>
              )}
            </button>
          ))}

          {/* More Menu Dropdown */}
          {moreTabs.length > 0 && (
            <div className="relative">
              <button
                onClick={() => setShowMoreMenu(!showMoreMenu)}
                className="py-4 px-1 border-b-2 border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 font-medium text-sm"
              >
                More ▾
              </button>

              {showMoreMenu && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowMoreMenu(false)}
                  />
                  <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-20">
                    <div className="py-1">
                      {moreTabs.map(tab => (
                        <button
                          key={tab.id}
                          onClick={() => {
                            onTabChange(tab.id);
                            setShowMoreMenu(false);
                          }}
                          className={`
                            w-full text-left px-4 py-2 text-sm
                            ${activeTab === tab.id
                              ? 'bg-green-50 text-green-600'
                              : 'text-gray-700 hover:bg-gray-100'
                            }
                          `}
                        >
                          {tab.icon && <span className="mr-2">{tab.icon}</span>}
                          {tab.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Mobile Navigation */}
        <div className="md:hidden">
          <select
            value={activeTab}
            onChange={(e) => onTabChange(e.target.value)}
            className="w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
          >
            {tabs.map(tab => (
              <option key={tab.id} value={tab.id}>
                {tab.icon} {tab.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </nav>
  );
}
