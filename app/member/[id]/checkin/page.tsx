'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { getPlugin } from '@/core/utils/pluginRegistry';
import Header from '@/components/Header';
import CheckInFlow from '@/components/common/CheckInFlow';

export default function MemberCheckinPage() {
  const params = useParams();
  const router = useRouter();
  const workspaceId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [workspace, setWorkspace] = useState<any>(null);
  const [memberData, setMemberData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [workspaceId]);

  async function loadData() {
    try {
      // Check authentication
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        router.push(`/auth/login?returnUrl=/member/${workspaceId}/checkin`);
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

      // Get plugin to determine member table
      const plugin = getPlugin(workspaceData.workspace_type || 'business');
      const memberTable = plugin?.adapters?.people?.tables?.people ||
                         (workspaceData.workspace_type === 'education' ? 'students' : 'staff');
      const workspaceIdField = workspaceData.workspace_type === 'education' ? 'class_id' : 'store_id';

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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Đang tải...</p>
        </div>
      </div>
    );
  }

  if (error || !workspace || !memberData) {
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

  // Redirect to old checkin/submit for now (will refactor CheckInFlow later)
  useEffect(() => {
    const param = workspace.workspace_type === 'education' ? 'class' : 'store';
    router.replace(`/checkin/submit?${param}=${workspaceId}`);
  }, [workspace, workspaceId, router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Đang chuyển hướng...</p>
      </div>
    </div>
  );
}
