'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { getCurrentUser } from '@/lib/auth';
import CheckInFlow from '@/components/common/CheckInFlow';

function StudentCheckInSubmitContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [classroom, setClassroom] = useState<any>(null);
  const [student, setStudent] = useState<any>(null);
  const [session, setSession] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, [searchParams]);

  async function loadData() {
    try {
      const classId = searchParams.get('class');

      if (!classId) {
        setError('Thiếu thông tin lớp học');
        setLoading(false);
        return;
      }

      // Check authentication
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        router.push(`/auth/login?returnUrl=/student/checkin/submit?class=${classId}`);
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

      // Find current session
      const now = new Date();
      const dayOfWeek = now.getDay();
      const currentTime = now.toTimeString().slice(0, 5); // HH:MM

      const { data: sessionsData, error: sessionsError } = await supabase
        .from('class_sessions')
        .select('*')
        .eq('class_id', classId)
        .eq('day_of_week', dayOfWeek)
        .order('start_time');

      if (sessionsError) throw sessionsError;

      // Find session that is currently happening or upcoming
      const currentSession = sessionsData?.find(s =>
        currentTime >= s.start_time && currentTime <= s.end_time
      ) || sessionsData?.[0]; // Default to first session if no current session

      if (!currentSession) {
        setError('Không có tiết học nào hôm nay');
        setLoading(false);
        return;
      }

      setSession(currentSession);
      setLoading(false);
    } catch (error: any) {
      console.error('Error loading data:', error);
      setError(error.message || 'Có lỗi xảy ra');
      setLoading(false);
    }
  }

  function handleSuccess() {
    // Redirect to success page or back to class
    router.push(`/student/${classroom.id}?tab=checkin&success=true`);
  }

  function handleCancel() {
    router.push(`/student/${classroom.id}`);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Đang tải...</p>
        </div>
      </div>
    );
  }

  if (error || !classroom || !student || !session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
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
            className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold"
          >
            Về Trang Chủ
          </button>
        </div>
      </div>
    );
  }

  return (
    <CheckInFlow
      type="student"
      locationId={classroom.id}
      location={{
        name: classroom.name,
        gps_required: classroom.gps_required || false,
        selfie_required: classroom.selfie_required || false,
        latitude: classroom.latitude,
        longitude: classroom.longitude,
        radius_meters: classroom.radius_meters || 100,
      }}
      studentId={student.id}
      sessionId={session.id}
      sessionName={`${session.name} (${session.start_time} - ${session.end_time})`}
      onSuccess={handleSuccess}
      onCancel={handleCancel}
    />
  );
}

export default function StudentCheckInSubmitPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    }>
      <StudentCheckInSubmitContent />
    </Suspense>
  );
}
