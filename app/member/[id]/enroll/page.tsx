'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { getPlugin } from '@/core/utils/pluginRegistry';
import Header from '@/components/Header';

export default function MemberEnrollPage() {
  const params = useParams();
  const router = useRouter();
  const workspaceId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [workspace, setWorkspace] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [enrolling, setEnrolling] = useState(false);

  useEffect(() => {
    loadData();
  }, [workspaceId]);

  async function loadData() {
    try {
      // Check authentication
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        const returnUrl = `/member/${workspaceId}/enroll`;
        router.push(`/auth/login?returnUrl=${encodeURIComponent(returnUrl)}`);
        return;
      }

      setUser(currentUser);

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

      // Check if workspace allows enrollment
      if (workspaceData.access_mode !== 'open_enrollment') {
        setError('Workspace này không cho phép tự ghi danh');
        setLoading(false);
        return;
      }

      setWorkspace(workspaceData);

      // Check if already enrolled
      const { data: existingStudent } = await supabase
        .from('students')
        .select('status')
        .eq('class_id', workspaceId)
        .eq('user_id', currentUser.id)
        .maybeSingle();

      if (existingStudent) {
        if (existingStudent.status === 'active') {
          // Already enrolled, redirect to member page
          router.push(`/member/${workspaceId}`);
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

      setLoading(false);
    } catch (error) {
      console.error('Error loading data:', error);
      setError('Có lỗi xảy ra khi tải dữ liệu');
      setLoading(false);
    }
  }

  async function handleEnroll() {
    if (!user || !workspace) return;

    setEnrolling(true);

    try {
      const { error: insertError } = await supabase
        .from('students')
        .insert([
          {
            class_id: workspaceId,
            user_id: user.id,
            full_name: user.user_metadata?.full_name || user.email,
            email: user.email,
            status: 'active', // Auto-approve for open enrollment
          },
        ]);

      if (insertError) throw insertError;

      // Success - redirect to member page
      router.push(`/member/${workspaceId}`);
    } catch (error) {
      console.error('Error enrolling:', error);
      alert('Có lỗi xảy ra khi ghi danh. Vui lòng thử lại.');
      setEnrolling(false);
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

  if (error || !workspace) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
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
            className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-all"
          >
            Về Trang Chủ
          </button>
        </div>
      </div>
    );
  }

  const plugin = getPlugin(workspace.workspace_type || 'business');

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100">
      <Header />

      <main className="max-w-2xl mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="text-6xl mb-4">{plugin?.icon || '🎓'}</div>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">
              Ghi Danh Vào Lớp
            </h1>
            <h2 className="text-xl text-gray-600 mb-4">
              {workspace.name}
            </h2>
            {workspace.subject && (
              <p className="text-gray-500">
                {workspace.subject} • {workspace.grade_level}
              </p>
            )}
          </div>

          {/* Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <svg className="w-6 h-6 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <h4 className="font-semibold text-blue-900 mb-1">Tự động phê duyệt</h4>
                <p className="text-sm text-blue-700">
                  Lớp học này cho phép tự ghi danh. Bạn sẽ được thêm vào lớp ngay lập tức.
                </p>
              </div>
            </div>
          </div>

          {/* User Info */}
          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Họ tên
              </label>
              <input
                type="text"
                value={user?.user_metadata?.full_name || user?.email || ''}
                disabled
                className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-700"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                value={user?.email || ''}
                disabled
                className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-700"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-4">
            <button
              onClick={() => router.push('/')}
              className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 px-6 py-3 rounded-lg font-semibold transition-all"
            >
              Hủy
            </button>
            <button
              onClick={handleEnroll}
              disabled={enrolling}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {enrolling ? 'Đang ghi danh...' : 'Xác nhận ghi danh'}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
