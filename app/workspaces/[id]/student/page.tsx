'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Store, Student } from '@/types';
import Header from '@/components/Header';
import StudentCheckin from '@/components/student/StudentCheckin';
import StudentAttendance from '@/components/student/StudentAttendance';
import StudentTimetable from '@/components/student/StudentTimetable';
import StudentProfile from '@/components/student/StudentProfile';

export default function StudentDashboard() {
  const params = useParams();
  const router = useRouter();
  const workspaceId = params.id as string;

  const [classroom, setClassroom] = useState<Store | null>(null);
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'checkin' | 'attendance' | 'timetable' | 'profile'>('checkin');

  useEffect(() => {
    loadData();
  }, [workspaceId]);

  async function loadData() {
    try {
      setLoading(true);

      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        router.push('/auth/login');
        return;
      }

      // Load classroom data
      const { data: classroomData, error: classroomError } = await supabase
        .from('stores')
        .select('*')
        .eq('id', workspaceId)
        .eq('workspace_type', 'education')
        .single();

      if (classroomError) {
        console.error('Error loading classroom:', classroomError);
        router.push('/');
        return;
      }

      setClassroom(classroomData);

      // Load student data - first try by user_id, then by email
      let studentData = null;

      // Try finding by user_id
      const { data: studentByUserId, error: userIdError } = await supabase
        .from('students')
        .select('*')
        .eq('class_id', workspaceId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (studentByUserId) {
        studentData = studentByUserId;
      } else {
        // Try finding by email
        const { data: studentByEmail, error: emailError } = await supabase
          .from('students')
          .select('*')
          .eq('class_id', workspaceId)
          .eq('email', user.email)
          .maybeSingle();

        if (studentByEmail) {
          studentData = studentByEmail;
        }
      }

      if (!studentData) {
        console.error('Not a student in this class');
        router.push('/');
        return;
      }

      setStudent(studentData);

    } catch (error) {
      console.error('Error loading data:', error);
      router.push('/');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  if (!classroom || !student) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Không tìm thấy dữ liệu lớp học</p>
          <Link href="/" className="text-green-600 hover:underline">
            Quay lại trang chủ
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col">
      <Header />

      {/* Header with back button */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center gap-3">
          <Link href="/" className="text-gray-600 hover:text-gray-800">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-gray-800">{classroom.name}</h1>
            <p className="text-xs text-gray-500">
              Học sinh: {student.full_name}
              {student.student_id && ` • ${student.student_id}`}
            </p>
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <main className="flex-1 overflow-y-auto pb-20">
        {activeTab === 'checkin' && (
          <StudentCheckin classId={workspaceId} student={student} classroom={classroom} />
        )}
        {activeTab === 'attendance' && (
          <StudentAttendance classId={workspaceId} student={student} classroom={classroom} />
        )}
        {activeTab === 'timetable' && (
          <StudentTimetable classId={workspaceId} classroom={classroom} />
        )}
        {activeTab === 'profile' && (
          <StudentProfile student={student} classroom={classroom} />
        )}
      </main>

      {/* Bottom Tab Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-2 py-2 safe-area-inset-bottom z-50">
        <div className="max-w-7xl mx-auto flex justify-around">
          {/* Tab 1: Check-in */}
          <button
            onClick={() => setActiveTab('checkin')}
            className={`flex flex-col items-center justify-center px-4 py-2 rounded-lg transition-all flex-1 ${
              activeTab === 'checkin'
                ? 'bg-green-600 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-xs font-semibold">Điểm Danh</span>
          </button>

          {/* Tab 2: Attendance */}
          <button
            onClick={() => setActiveTab('attendance')}
            className={`flex flex-col items-center justify-center px-4 py-2 rounded-lg transition-all flex-1 ${
              activeTab === 'attendance'
                ? 'bg-green-600 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
            <span className="text-xs font-semibold">Của Tôi</span>
          </button>

          {/* Tab 3: Timetable */}
          <button
            onClick={() => setActiveTab('timetable')}
            className={`flex flex-col items-center justify-center px-4 py-2 rounded-lg transition-all flex-1 ${
              activeTab === 'timetable'
                ? 'bg-green-600 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="text-xs font-semibold">Lịch Học</span>
          </button>

          {/* Tab 4: Profile */}
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex flex-col items-center justify-center px-4 py-2 rounded-lg transition-all flex-1 ${
              activeTab === 'profile'
                ? 'bg-green-600 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span className="text-xs font-semibold">Hồ Sơ</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
