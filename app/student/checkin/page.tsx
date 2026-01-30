'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';

function StudentCheckinContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    handleCheckin();
  }, [searchParams]);

  async function handleCheckin() {
    try {
      // Get class ID from query parameter
      const classId = searchParams.get('class');

      if (!classId) {
        setError('Mã lớp học không hợp lệ');
        setLoading(false);
        return;
      }

      // Check if user is logged in
      const currentUser = await getCurrentUser();

      if (!currentUser) {
        // Redirect to login with return URL
        const returnUrl = `/student/checkin?class=${classId}`;
        router.push(`/auth/login?returnUrl=${encodeURIComponent(returnUrl)}`);
        return;
      }

      // Check enrollment status
      const { supabase } = await import('@/lib/supabase');

      // First check if student is enrolled
      const { data: studentData, error: studentError } = await supabase
        .from('students')
        .select('status')
        .eq('class_id', classId)
        .eq('user_id', currentUser.id)
        .maybeSingle();

      if (studentError) throw studentError;

      // If student exists and is active, proceed to check-in
      if (studentData && studentData.status === 'active') {
        router.push(`/student/checkin/submit?class=${classId}`);
        return;
      }

      // If student exists but is pending
      if (studentData && studentData.status === 'pending') {
        setError('Yêu cầu ghi danh của bạn đang chờ duyệt. Vui lòng kiên nhẫn chờ giáo viên xét duyệt.');
        setLoading(false);
        return;
      }

      // If student exists but is rejected
      if (studentData && studentData.status === 'rejected') {
        setError('Yêu cầu ghi danh của bạn đã bị từ chối. Vui lòng liên hệ giáo viên.');
        setLoading(false);
        return;
      }

      // Student not enrolled - check if class allows open enrollment
      const { data: classData, error: classError } = await supabase
        .from('stores')
        .select('access_mode')
        .eq('id', classId)
        .eq('workspace_type', 'education')
        .single();

      if (classError) throw classError;

      if (classData.access_mode === 'open_enrollment') {
        // Redirect to enrollment form
        router.push(`/student/enroll?class=${classId}`);
        return;
      } else {
        // Class doesn't allow enrollment
        setError('Bạn chưa được thêm vào lớp học này. Vui lòng liên hệ giáo viên.');
        setLoading(false);
        return;
      }
    } catch (error) {
      console.error('Error handling check-in:', error);
      setError('Có lỗi xảy ra. Vui lòng thử lại.');
      setLoading(false);
    }
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Lỗi</h2>
          <p className="text-gray-600 mb-6">{error}</p>
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
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-green-600 mx-auto mb-4"></div>
        <p className="text-gray-700 font-semibold">Đang chuyển hướng...</p>
      </div>
    </div>
  );
}

export default function StudentCheckinPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-700 font-semibold">Đang tải...</p>
        </div>
      </div>
    }>
      <StudentCheckinContent />
    </Suspense>
  );
}
