'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { getCurrentUser } from '@/lib/auth';
import { getPlugin } from '@/core/utils/pluginRegistry';
import { Store, Student, Staff } from '@/types';
import Header from '@/components/Header';

// Student/Education components
import StudentCheckin from '@/components/student/StudentCheckin';
import StudentAttendance from '@/components/student/StudentAttendance';
import StudentTimetable from '@/components/student/StudentTimetable';
import StudentProfile from '@/components/student/StudentProfile';

// Staff/Business components
import StaffToday from '@/components/staff/StaffToday';
import StaffSchedule from '@/components/staff/StaffSchedule';
import StaffAvailability from '@/components/staff/StaffAvailability';
import StaffHistory from '@/components/staff/StaffHistory';
import StaffProfile from '@/components/staff/StaffProfile';

type Tab = 'schedule' | 'availability' | 'history' | 'profile';

export default function MemberWorkspacePage() {
  const params = useParams();
  const router = useRouter();
  const workspaceId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('schedule');
  const [workspace, setWorkspace] = useState<Store | null>(null);
  const [memberData, setMemberData] = useState<Student | Staff | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [workspaceId]);

  async function loadData() {
    try {
      // Check authentication
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        router.push(`/auth/login?returnUrl=/member/${workspaceId}`);
        return;
      }

      // Load workspace
      const { data: workspaceData, error: workspaceError } = await supabase
        .from('stores')
        .select('*')
        .eq('id', workspaceId)
        .single();

      if (workspaceError) throw workspaceError;
      if (!workspaceData) {
        setError('Không tìm thấy workspace');
        setLoading(false);
        return;
      }

      setWorkspace(workspaceData);

      // Get plugin and adapter to determine member table
      const plugin = getPlugin(workspaceData.workspace_type || 'business');
      const peopleAdapter = plugin?.adapters?.people;
      const memberTable = peopleAdapter?.tables?.people || 'staff';
      const workspaceIdField = peopleAdapter?.fields?.workspaceId || 'store_id';

      // Load member record
      const { data: member, error: memberError } = await supabase
        .from(memberTable)
        .select('*')
        .eq(workspaceIdField, workspaceId)
        .eq('user_id', currentUser.id)
        .eq('status', 'active')
        .single();

      if (memberError || !member) {
        const workspaceLabel = plugin?.config.workspaceLabel?.toLowerCase() || 'workspace';
        setError(`Bạn chưa được thêm vào ${workspaceLabel} này`);
        setLoading(false);
        return;
      }

      setMemberData(member);
      setLoading(false);
    } catch (error) {
      console.error('Error loading data:', error);
      setError('Có lỗi xảy ra khi tải dữ liệu');
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Đang tải...</p>
        </div>
      </div>
    );
  }

  if (error || !workspace || !memberData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Lỗi</h2>
          <p className="text-gray-600 mb-6">{error || 'Không thể tải thông tin'}</p>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-all"
          >
            Về Trang Chủ
          </button>
        </div>
      </div>
    );
  }

  const plugin = getPlugin(workspace.workspace_type || 'business');
  const isEducation = workspace.workspace_type === 'education';

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col">
      <Header />

      {/* Header with back button */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center gap-3">
          <button
            onClick={() => router.push('/')}
            className="text-gray-600 hover:text-gray-800"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{plugin?.icon || '📁'}</span>
              <h1 className="text-lg font-bold text-gray-800">{workspace.name}</h1>
            </div>
            <p className="text-xs text-gray-500">
              {isEducation ? (
                <>
                  {workspace.subject && `${workspace.subject} • `}
                  {workspace.grade_level && `${workspace.grade_level} • `}
                  {workspace.room_number && `Phòng ${workspace.room_number}`}
                </>
              ) : (
                workspace.address || 'Địa điểm làm việc'
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <main className="flex-1 overflow-y-auto pb-20">
        {isEducation ? (
          <>
            {/* Education/Student Views */}
            {activeTab === 'schedule' && (
              <StudentCheckin
                classId={workspaceId}
                student={memberData as Student}
                classroom={workspace}
              />
            )}
            {activeTab === 'availability' && (
              <StudentTimetable
                classId={workspaceId}
                classroom={workspace}
              />
            )}
            {activeTab === 'history' && (
              <StudentAttendance
                classId={workspaceId}
                student={memberData as Student}
                classroom={workspace}
              />
            )}
            {activeTab === 'profile' && (
              <StudentProfile
                student={memberData as Student}
                classroom={workspace}
              />
            )}
          </>
        ) : (
          <>
            {/* Business/Staff Views */}
            {activeTab === 'schedule' && memberData && (
              <StaffSchedule
                storeId={workspaceId}
                staffId={(memberData as Staff).id}
                shifts={[]}
              />
            )}
            {activeTab === 'availability' && memberData && (
              <StaffAvailability
                storeId={workspaceId}
                staffId={(memberData as Staff).id}
                staffName={(memberData as Staff).display_name}
                shifts={[]}
              />
            )}
            {activeTab === 'history' && memberData && (
              <StaffHistory
                storeId={workspaceId}
                staffId={(memberData as Staff).id}
                shifts={[]}
              />
            )}
            {activeTab === 'profile' && memberData && (
              <StaffProfile
                storeId={workspaceId}
                staffId={(memberData as Staff).id}
                staffMember={memberData as Staff}
              />
            )}
          </>
        )}
      </main>

      {/* Bottom Tab Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-2 py-2 safe-area-inset-bottom z-50">
        <div className="max-w-7xl mx-auto flex justify-around">
          {/* Tab 1: schedule (Hôm Nay / Tuần này) */}
          <button
            onClick={() => setActiveTab('schedule')}
            className={`flex flex-col items-center justify-center px-3 py-2 rounded-lg transition-all flex-1 ${
              activeTab === 'schedule'
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="text-xs font-medium">{isEducation ? 'Hôm Nay' : 'Tuần này'}</span>
          </button>

          {/* Tab 2: availability (Lịch / Lịch Rảnh) */}
          <button
            onClick={() => setActiveTab('availability')}
            className={`flex flex-col items-center justify-center px-3 py-2 rounded-lg transition-all flex-1 ${
              activeTab === 'availability'
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {isEducation ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              )}
            </svg>
            <span className="text-xs font-medium">{isEducation ? 'Lịch' : 'Lịch Rảnh'}</span>
          </button>

          {/* Tab 3: history (Điểm danh / Tháng này) */}
          <button
            onClick={() => setActiveTab('history')}
            className={`flex flex-col items-center justify-center px-3 py-2 rounded-lg transition-all flex-1 ${
              activeTab === 'history'
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
            <span className="text-xs font-medium">{isEducation ? 'Điểm danh' : 'Tháng này'}</span>
          </button>

          {/* Tab 4: profile (Cài đặt / Profile) */}
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex flex-col items-center justify-center px-3 py-2 rounded-lg transition-all flex-1 ${
              activeTab === 'profile'
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {isEducation ? (
                <>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </>
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              )}
            </svg>
            <span className="text-xs font-medium">{isEducation ? 'Cài đặt' : 'Profile'}</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
