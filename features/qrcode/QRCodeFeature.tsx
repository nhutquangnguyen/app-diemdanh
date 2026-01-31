'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { FeatureProps } from '@/core/types/feature';
import { QRCodeView } from './QRCodeView';

interface Workspace {
  id: string;
  name: string;
  [key: string]: any;
}

export function QRCodeFeature({ workspaceId, config, adapter }: FeatureProps) {
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadWorkspace() {
    try {
      setLoading(true);
      const tableName = adapter?.tables?.workspace || 'stores';

      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .eq('id', workspaceId)
        .single();

      if (error) throw error;
      setWorkspace(data);
    } catch (error) {
      console.error('Error loading workspace:', error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadWorkspace();
  }, [workspaceId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Đang tải...</p>
        </div>
      </div>
    );
  }

  if (!workspace) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">Không tìm thấy thông tin</p>
      </div>
    );
  }

  const QRCodeViewComponent = adapter?.components?.QRCodeView || QRCodeView;

  return (
    <QRCodeViewComponent
      workspace={workspace}
      config={config}
    />
  );
}
