'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { getCurrentUser } from '@/lib/auth';
import { getPlugin } from '@/core/utils/pluginRegistry';
import { WorkspaceShell } from '@/core/components/WorkspaceShell';
import { Workspace } from '@/core/types/workspace';

export default function OwnerWorkspacePage() {
  const params = useParams();
  const router = useRouter();
  const workspaceId = params.id as string;

  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadWorkspace();
  }, [workspaceId]);

  async function loadWorkspace() {
    try {
      // Check authentication
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        router.push(`/auth/login?returnUrl=/owner/${workspaceId}`);
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

      // Verify ownership
      if (workspaceData.owner_id !== currentUser.id) {
        setError('Bạn không có quyền truy cập workspace này');
        setLoading(false);
        return;
      }

      setWorkspace(workspaceData);
      setLoading(false);
    } catch (error) {
      console.error('Error loading workspace:', error);
      setError('Có lỗi xảy ra khi tải workspace');
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
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
          <p className="text-gray-600 mb-6">{error || 'Không thể tải workspace'}</p>
          <button
            onClick={() => router.push('/owner')}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-all"
          >
            Về Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Get plugin based on workspace type
  const plugin = getPlugin(workspace.workspace_type || 'business');

  if (!plugin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Plugin không tồn tại</h2>
          <p className="text-gray-600 mb-6">
            Không tìm thấy plugin cho workspace type: {workspace.workspace_type}
          </p>
          <button
            onClick={() => router.push('/owner')}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-all"
          >
            Về Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Render workspace with plugin system
  return <WorkspaceShell workspace={workspace} plugin={plugin} />;
}
