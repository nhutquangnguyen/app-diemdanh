'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Store } from '@/types';
import Header from '@/components/Header';
import ClassToday from './ClassToday';
import ClassTimetable from './ClassTimetable';
import ClassStudents from './ClassStudents';
import ClassSettings from './ClassSettings';

interface Props {
  workspaceId: string;
  workspace: Store;
}

type EducationTab = 'today' | 'timetable' | 'students' | 'settings';

export default function EducationWorkspace({ workspaceId, workspace }: Props) {
  const [activeTab, setActiveTab] = useState<EducationTab>('today');
  const [classroom, setClassroom] = useState<Store>(workspace);

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
        <div className="hidden sm:flex bg-white rounded-lg shadow-lg mb-4 p-2 gap-2">
          <button
            onClick={() => setActiveTab('today')}
            className={`flex-1 px-4 py-3 rounded-lg font-semibold transition-all ${
              activeTab === 'today'
                ? 'bg-green-600 text-white'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            Hôm Nay
          </button>
          <button
            onClick={() => setActiveTab('timetable')}
            className={`flex-1 px-4 py-3 rounded-lg font-semibold transition-all ${
              activeTab === 'timetable'
                ? 'bg-green-600 text-white'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            Thời Khóa Biểu
          </button>
          <button
            onClick={() => setActiveTab('students')}
            className={`flex-1 px-4 py-3 rounded-lg font-semibold transition-all ${
              activeTab === 'students'
                ? 'bg-green-600 text-white'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            Học Sinh
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`flex-1 px-4 py-3 rounded-lg font-semibold transition-all ${
              activeTab === 'settings'
                ? 'bg-green-600 text-white'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            Cài Đặt
          </button>
        </div>

        {/* Tab Content - add bottom margin for mobile navigation */}
        <div className="bg-white rounded-lg shadow-lg mb-20 sm:mb-4 overflow-hidden">
          {activeTab === 'today' && <ClassToday classId={workspaceId} classroom={classroom} />}
          {activeTab === 'timetable' && <ClassTimetable classId={workspaceId} classroom={classroom} />}
          {activeTab === 'students' && <ClassStudents classId={workspaceId} classroom={classroom} />}
          {activeTab === 'settings' && <ClassSettings classId={workspaceId} classroom={classroom} onUpdate={refreshWorkspace} />}
        </div>

        {/* Mobile Bottom Navigation */}
        <div className="sm:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-40">
          <div className="grid grid-cols-4 gap-1 p-2">
            <button
              onClick={() => setActiveTab('today')}
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
              onClick={() => setActiveTab('timetable')}
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
              onClick={() => setActiveTab('students')}
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
            <button
              onClick={() => setActiveTab('settings')}
              className={`w-full flex flex-col items-center py-2 px-1 rounded-lg transition-all ${
                activeTab === 'settings'
                  ? 'bg-green-600 text-white'
                  : 'text-gray-600'
              }`}
            >
              <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="text-xs font-semibold">Cài Đặt</span>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
