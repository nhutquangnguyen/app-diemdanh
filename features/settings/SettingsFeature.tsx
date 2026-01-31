'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { FeatureProps } from '@/core/types/feature';
import { SettingsView } from './SettingsView';

interface Workspace {
  id: string;
  name: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  gps_required?: boolean;
  selfie_required?: boolean;
  access_mode?: string;
  radius_meters?: number;
  [key: string]: any;
}

export function SettingsFeature({ workspaceId, config, adapter }: FeatureProps) {
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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

  async function updateSettings(updates: Partial<Workspace>) {
    try {
      setSaving(true);
      const tableName = adapter?.tables?.workspace || 'stores';

      const { error } = await supabase
        .from(tableName)
        .update(updates)
        .eq('id', workspaceId);

      if (error) throw error;

      setWorkspace(prev => prev ? { ...prev, ...updates } : null);
      alert('✓ Đã lưu cài đặt');
    } catch (error: any) {
      console.error('Error updating settings:', error);
      alert(`Lỗi: ${error.message}`);
    } finally {
      setSaving(false);
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

  const SettingsViewComponent = adapter?.components?.SettingsView || SettingsView;

  return (
    <SettingsViewComponent
      workspace={workspace}
      config={config}
      onUpdate={updateSettings}
      saving={saving}
    />
  );
}
