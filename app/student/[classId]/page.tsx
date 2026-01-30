'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { getCurrentUser } from '@/lib/auth';
import { Store, Student } from '@/types';
import Header from '@/components/Header';
import StudentCheckin from '@/components/student/StudentCheckin';
import StudentAttendance from '@/components/student/StudentAttendance';
import StudentTimetable from '@/components/student/StudentTimetable';
import StudentProfile from '@/components/student/StudentProfile';

type Tab = 'checkin' | 'attendance' | 'timetable' | 'profile';

export default function StudentClassPage() {
  const params = useParams();
  const router = useRouter();
  const classId = params.classId as string;

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('checkin');
  const [classroom, setClassroom] = useState<Store | null>(null);
  const [student, setStudent] = useState<Student | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [classId]);

  async function loadData() {
    try {
      // Check authentication
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        router.push(`/auth/login?returnUrl=/student/${classId}`);
        return;
      }

      // Load classroom
      const { data: classData, error: classError } = await supabase
        .from('stores')
        .select('*')
        .eq('id', classId)
        .eq('workspace_type', 'education')
        .single();

      if (classError) throw classError;
      if (!classData) {
        setError('Không tìm thấy lớp học');
        setLoading(false);
        return;
      }

      setClassroom(classData);

      // Load student record
      const { data: studentData, error: studentError } = await supabase
        .from('students')
        .select('*')
        .eq('class_id', classId)
        .eq('user_id', currentUser.id)
        .eq('status', 'active')
        .single();

      if (studentError || !studentData) {
        setError('Bạn chưa được thêm vào lớp học này');
        setLoading(false);
        return;
      }

      setStudent(studentData);
      setLoading(false);
    } catch (error) {
      console.error('Error loading data:', error);
      setError('Có lỗi xảy ra khi tải dữ liệu');
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Đang tải...</p>
        </div>
      </div>
    );
  }

  if (error || !classroom || !student) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Lỗi</h2>
          <p className="text-gray-600 mb-6">{error || 'Không thể tải thông tin lớp học'}</p>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-all"
          >
            Về Trang Chủ
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex flex-col">
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
            <h1 className="text-lg font-bold text-gray-800">{classroom.name}</h1>
            <p className="text-xs text-gray-500">
              {classroom.subject && `${classroom.subject} • `}
              {classroom.grade_level && `${classroom.grade_level} • `}
              {classroom.room_number && `Phòng ${classroom.room_number}`}
            </p>
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <main className="flex-1 overflow-y-auto pb-20">
        {activeTab === 'checkin' && (
          <StudentCheckin classId={classId} student={student} classroom={classroom} />
        )}
        {activeTab === 'attendance' && (
          <StudentAttendance classId={classId} student={student} classroom={classroom} />
        )}
        {activeTab === 'timetable' && (
          <StudentTimetable classId={classId} classroom={classroom} />
        )}
        {activeTab === 'profile' && (
          <StudentProfile student={student} classroom={classroom} />
        )}
      </main>

      {/* Bottom Tab Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-2 py-2 safe-area-inset-bottom z-50">
        <div className="max-w-7xl mx-auto flex justify-around">
          <button
            onClick={() => setActiveTab('checkin')}
            className={`flex flex-col items-center justify-center px-4 py-2 rounded-lg transition-all flex-1 ${
              activeTab === 'checkin'
                ? 'bg-green-600 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <svg className="w-5 h-5 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-xs font-semibold">Hôm Nay</span>
          </button>

          <button
            onClick={() => setActiveTab('timetable')}
            className={`flex flex-col items-center justify-center px-4 py-2 rounded-lg transition-all flex-1 ${
              activeTab === 'timetable'
                ? 'bg-green-600 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <svg className="w-5 h-5 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="text-xs font-semibold">Lịch</span>
          </button>

          <button
            onClick={() => setActiveTab('attendance')}
            className={`flex flex-col items-center justify-center px-4 py-2 rounded-lg transition-all flex-1 ${
              activeTab === 'attendance'
                ? 'bg-green-600 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <svg className="w-5 h-5 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <span className="text-xs font-semibold">Điểm Danh</span>
          </button>

          <button
            onClick={() => setActiveTab('profile')}
            className={`flex flex-col items-center justify-center px-4 py-2 rounded-lg transition-all flex-1 ${
              activeTab === 'profile'
                ? 'bg-green-600 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <svg className="w-5 h-5 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="text-xs font-semibold">Cài Đặt</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
