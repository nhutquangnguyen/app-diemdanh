'use client';

import { useState, useEffect } from 'react';
import { FeatureProps } from '@/core/types/feature';
import ScheduleView from './ScheduleView';

export default function SchedulingFeature({ workspaceId, config, adapter }: FeatureProps) {
  const [schedules, setSchedules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSchedules();
  }, [workspaceId]);

  async function loadSchedules() {
    try {
      const { supabase } = await import('@/lib/supabase');

      // Get table name from adapter or use default
      const scheduleTable = adapter?.tables?.schedules || 'shift_templates';

      // Load all schedules for this workspace
      const { data, error } = await supabase
        .from(scheduleTable)
        .select('*')
        .eq(adapter?.tables?.workspace ? 'class_id' : 'store_id', workspaceId)
        .order('day_of_week')
        .order('start_time');

      if (error) throw error;

      setSchedules(data || []);
    } catch (error) {
      console.error('Error loading schedules:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <ScheduleView
      schedules={schedules}
      config={config}
      onRefresh={loadSchedules}
    />
  );
}
