'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Store } from '@/types';
import Header from '@/components/Header';
import ClassToday from './ClassToday';
import ClassTimetable from './ClassTimetable';
import ClassStudents from './ClassStudents';
import ClassSettings from './ClassSettings';
import ClassQRCode from './ClassQRCode';

interface Props {
  workspaceId: string;
  workspace: Store;
}

type EducationTab = 'today' | 'timetable' | 'students' | 'qr' | 'settings';

export default function EducationWorkspace({ workspaceId, workspace }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Initialize activeTab from URL query params or default to 'today'
  const [activeTab, setActiveTab] = useState<EducationTab>(() => {
    const tabFromUrl = searchParams.get('tab');
    const validTabs = ['today', 'timetable', 'students', 'qr', 'settings'];
    return (tabFromUrl && validTabs.includes(tabFromUrl)) ? tabFromUrl as EducationTab : 'today';
  });

  const [classroom, setClassroom] = useState<Store>(workspace);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const moreMenuRefDesktop = useRef<HTMLDivElement>(null);
  const moreMenuRefMobile = useRef<HTMLDivElement>(null);

  // Wrapper function to update both state and URL when tab changes
  const updateActiveTab = (tab: EducationTab) => {
    setActiveTab(tab);
    // Update URL with tab query param to persist across reloads
    const currentUrl = new URL(window.location.href);
    currentUrl.searchParams.set('tab', tab);
    router.replace(currentUrl.pathname + currentUrl.search, { scroll: false });
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        moreMenuRefDesktop.current &&
        !moreMenuRefDesktop.current.contains(event.target as Node) &&
        moreMenuRefMobile.current &&
        !moreMenuRefMobile.current.contains(event.target as Node)
      ) {
        setShowMoreMenu(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  function refreshWorkspace() {
    // Reload workspace data
    window.location.reload();
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Link href="/owner">
              <button className="text-gray-600 hover:text-gray-800">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            </Link>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-800">{classroom.name}</h1>
              {(classroom.subject || classroom.grade_level || classroom.room_number) && (
                <div className="flex items-center gap-3 mt-1 text-sm text-gray-600">
                  {classroom.subject && <span>{classroom.subject}</span>}
                  {classroom.grade_level && <span>• {classroom.grade_level}</span>}
                  {classroom.room_number && <span>• Phòng {classroom.room_number}</span>}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Desktop Tab Navigation */}
        <div className="hidden sm:flex bg-white rounded-lg shadow-lg mb-4 p-2 gap-2 relative">
          <button
            onClick={() => updateActiveTab('today')}
            className={`flex-1 px-4 py-3 rounded-lg font-semibold transition-all ${
              activeTab === 'today'
                ? 'bg-green-600 text-white'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            Hôm Nay
          </button>
          <button
            onClick={() => updateActiveTab('timetable')}
            className={`flex-1 px-4 py-3 rounded-lg font-semibold transition-all ${
              activeTab === 'timetable'
                ? 'bg-green-600 text-white'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            Thời Khóa Biểu
          </button>
          <button
            onClick={() => updateActiveTab('students')}
            className={`flex-1 px-4 py-3 rounded-lg font-semibold transition-all ${
              activeTab === 'students'
                ? 'bg-green-600 text-white'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            Học Sinh
          </button>
          <div ref={moreMenuRefDesktop} className="relative flex-1">
            <button
              type="button"
              onClick={() => setShowMoreMenu(!showMoreMenu)}
              className={`w-full px-4 py-3 rounded-lg font-semibold transition-all ${
                activeTab === 'qr' || activeTab === 'settings' || showMoreMenu
                  ? 'bg-green-600 text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              } flex items-center justify-center gap-2`}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
              Mở rộng
            </button>
            {showMoreMenu && (
              <div className="absolute right-0 top-full mt-2 bg-white rounded-lg shadow-xl border border-gray-200 py-2 min-w-[200px] z-50">
                <button
                  type="button"
                  onClick={() => {
                    updateActiveTab('qr');
                    setShowMoreMenu(false);
                  }}
                  className="w-full text-left px-4 py-3 hover:bg-gray-100 transition-all flex items-center gap-3"
                >
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                  </svg>
                  <span className="font-semibold text-gray-700">Mã QR</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    updateActiveTab('settings');
                    setShowMoreMenu(false);
                  }}
                  className="w-full text-left px-4 py-3 hover:bg-gray-100 transition-all flex items-center gap-3"
                >
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className="font-semibold text-gray-700">Cài Đặt</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Tab Content - add bottom margin for mobile navigation */}
        <div className="bg-white rounded-lg shadow-lg mb-20 sm:mb-4 overflow-hidden">
          {activeTab === 'today' && <ClassToday classId={workspaceId} classroom={classroom} />}
          {activeTab === 'timetable' && <ClassTimetable classId={workspaceId} classroom={classroom} />}
          {activeTab === 'students' && <ClassStudents classId={workspaceId} classroom={classroom} />}
          {activeTab === 'qr' && <ClassQRCode classroom={classroom} />}
          {activeTab === 'settings' && <ClassSettings classId={workspaceId} classroom={classroom} onUpdate={refreshWorkspace} />}
        </div>

        {/* Mobile Bottom Navigation */}
        <div className="sm:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-40">
          <div className="grid grid-cols-4 gap-1 p-2">
            <button
              onClick={() => updateActiveTab('today')}
              className={`w-full flex flex-col items-center py-2 px-1 rounded-lg transition-all ${
                activeTab === 'today'
                  ? 'bg-green-600 text-white'
                  : 'text-gray-600'
              }`}
            >
              <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-xs font-semibold">Hôm Nay</span>
            </button>
            <button
              onClick={() => updateActiveTab('timetable')}
              className={`w-full flex flex-col items-center py-2 px-1 rounded-lg transition-all ${
                activeTab === 'timetable'
                  ? 'bg-green-600 text-white'
                  : 'text-gray-600'
              }`}
            >
              <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="text-xs font-semibold">Lịch</span>
            </button>
            <button
              onClick={() => updateActiveTab('students')}
              className={`w-full flex flex-col items-center py-2 px-1 rounded-lg transition-all ${
                activeTab === 'students'
                  ? 'bg-green-600 text-white'
                  : 'text-gray-600'
              }`}
            >
              <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <span className="text-xs font-semibold">Học Sinh</span>
            </button>
            <div ref={moreMenuRefMobile} className="relative">
              <button
                type="button"
                onClick={() => setShowMoreMenu(!showMoreMenu)}
                className={`w-full flex flex-col items-center py-2 px-1 rounded-lg transition-all ${
                  activeTab === 'qr' || activeTab === 'settings' || showMoreMenu
                    ? 'bg-green-600 text-white'
                    : 'text-gray-600'
                }`}
              >
                <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
                <span className="text-xs font-semibold">Mở rộng</span>
              </button>
              {showMoreMenu && (
                <div className="absolute bottom-full right-0 mb-2 bg-white rounded-lg shadow-xl border border-gray-200 py-2 min-w-[200px] z-50">
                  <button
                    type="button"
                    onClick={() => {
                      updateActiveTab('qr');
                      setShowMoreMenu(false);
                    }}
                    className="w-full text-left px-4 py-3 hover:bg-gray-100 transition-all flex items-center gap-3"
                  >
                    <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                    </svg>
                    <span className="font-semibold text-gray-700">Mã QR</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      updateActiveTab('settings');
                      setShowMoreMenu(false);
                    }}
                    className="w-full text-left px-4 py-3 hover:bg-gray-100 transition-all flex items-center gap-3"
                  >
                    <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span className="font-semibold text-gray-700">Cài Đặt</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
