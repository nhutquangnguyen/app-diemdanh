'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { getCurrentUser } from '@/lib/auth';
import { Store } from '@/types';
import Header from '@/components/Header';

function StudentEnrollContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const classId = searchParams.get('class');

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [classroom, setClassroom] = useState<Store | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    full_name: '',
    student_id: '',
    email: '',
    phone: '',
  });

  useEffect(() => {
    loadClassroom();
  }, [classId]);

  async function loadClassroom() {
    try {
      if (!classId) {
        setError('Mã lớp học không hợp lệ');
        setLoading(false);
        return;
      }

      // Check if user is logged in
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        const returnUrl = `/student/enroll?class=${classId}`;
        router.push(`/auth/login?returnUrl=${encodeURIComponent(returnUrl)}`);
        return;
      }

      // Load classroom details
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

      // Check if enrollment is open
      if (classData.access_mode !== 'open_enrollment') {
        setError('Lớp học này không cho phép ghi danh. Vui lòng liên hệ giáo viên.');
        setLoading(false);
        return;
      }

      // Check if class is full
      if (classData.enrollment_capacity) {
        const { count } = await supabase
          .from('students')
          .select('*', { count: 'exact', head: true })
          .eq('class_id', classId)
          .in('status', ['active', 'pending']);

        if (count !== null && count >= classData.enrollment_capacity) {
          setError('Lớp học đã đủ sĩ số. Vui lòng liên hệ giáo viên.');
          setLoading(false);
          return;
        }
      }

      // Check if student already has a request/enrollment
      const { data: existingStudent } = await supabase
        .from('students')
        .select('status')
        .eq('class_id', classId)
        .eq('user_id', currentUser.id)
        .maybeSingle();

      if (existingStudent) {
        if (existingStudent.status === 'active') {
          // Already enrolled, redirect to class page
          router.push(`/student/${classId}`);
          return;
        } else if (existingStudent.status === 'pending') {
          setError('Yêu cầu ghi danh của bạn đang chờ duyệt. Vui lòng kiên nhẫn chờ giáo viên xét duyệt.');
          setLoading(false);
          return;
        } else if (existingStudent.status === 'rejected') {
          setError('Yêu cầu ghi danh của bạn đã bị từ chối. Vui lòng liên hệ giáo viên.');
          setLoading(false);
          return;
        }
      }

      setClassroom(classData);

      // Pre-fill email from user account
      setFormData(prev => ({
        ...prev,
        email: currentUser.email || '',
        full_name: currentUser.user_metadata?.full_name || '',
      }));

      setLoading(false);
    } catch (error) {
      console.error('Error loading classroom:', error);
      setError('Có lỗi xảy ra khi tải thông tin lớp học');
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);

    try {
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        alert('Vui lòng đăng nhập lại');
        return;
      }

      // Validate form
      if (!formData.full_name.trim()) {
        alert('Vui lòng nhập họ và tên');
        setSubmitting(false);
        return;
      }

      // Create enrollment request
      const { error: enrollError } = await supabase
        .from('students')
        .insert({
          class_id: classId,
          user_id: currentUser.id,
          full_name: formData.full_name.trim(),
          student_id: formData.student_id.trim() || null,
          email: formData.email.trim() || currentUser.email,
          phone: formData.phone.trim() || null,
          status: 'pending',
          enrollment_date: new Date().toISOString().split('T')[0],
        });

      if (enrollError) {
        console.error('Enrollment error:', enrollError);
        alert(`Lỗi: ${enrollError.message}`);
        setSubmitting(false);
        return;
      }

      // Success - show success message
      alert('Đã gửi yêu cầu ghi danh! Giáo viên sẽ xem xét và phê duyệt yêu cầu của bạn.');
      router.push('/');
    } catch (error) {
      console.error('Error submitting enrollment:', error);
      alert('Có lỗi xảy ra khi gửi yêu cầu. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-700 font-semibold">Đang tải...</p>
        </div>
      </div>
    );
  }

  if (error || !classroom) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Không thể ghi danh</h2>
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
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100">
      <Header />

      <main className="max-w-2xl mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8">
          {/* Class Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">Đăng ký lớp học</h1>
            <h2 className="text-xl sm:text-2xl font-semibold text-green-600 mb-2">{classroom.name}</h2>
            <p className="text-sm text-gray-600">
              {classroom.subject && `${classroom.subject} `}
              {classroom.grade_level && `• ${classroom.grade_level} `}
              {classroom.room_number && `• Phòng ${classroom.room_number}`}
            </p>
          </div>

          {/* Enrollment Info */}
          {classroom.enrollment_capacity && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="text-sm text-blue-800">
                  <p className="font-semibold mb-1">Sĩ số tối đa: {classroom.enrollment_capacity} học sinh</p>
                  <p>Vui lòng đăng ký sớm để đảm bảo chỗ học.</p>
                </div>
              </div>
            </div>
          )}

          {/* Enrollment Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Họ và tên <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                placeholder="Nguyễn Văn A"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Mã số sinh viên
              </label>
              <input
                type="text"
                value={formData.student_id}
                onChange={(e) => setFormData({ ...formData, student_id: e.target.value })}
                placeholder="SV2024001"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="email@example.com"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Số điện thoại
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="0123456789"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>

            {/* Info Notice */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="text-sm text-green-800">
                  <p className="font-semibold mb-1">Lưu ý:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Yêu cầu ghi danh của bạn sẽ được gửi đến giáo viên</li>
                    <li>Giáo viên sẽ xem xét và phê duyệt yêu cầu</li>
                    <li>Bạn sẽ nhận được thông báo khi được chấp nhận</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <button
                type="button"
                onClick={() => router.push('/')}
                className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-all"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {submitting ? 'Đang gửi...' : 'Gửi yêu cầu ghi danh'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}

export default function StudentEnrollPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-700 font-semibold">Đang tải...</p>
        </div>
      </div>
    }>
      <StudentEnrollContent />
    </Suspense>
  );
}
