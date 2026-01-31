'use client';

import { useState, useEffect } from 'react';
import { FeatureProps } from '@/core/types/feature';
import { supabase } from '@/lib/supabase';
import SmartScheduleNew from '@/components/SmartScheduleNew';
import { Staff, ShiftTemplate } from '@/types';

export default function AISchedulingFeature({ workspaceId, config, adapter }: FeatureProps) {
  const [loading, setLoading] = useState(true);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [shifts, setShifts] = useState<ShiftTemplate[]>([]);
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() => {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(today.setDate(diff));
  });

  useEffect(() => {
    loadData();
  }, [workspaceId]);

  async function loadData() {
    try {
      setLoading(true);

      // Load staff
      const { data: staffData, error: staffError } = await supabase
        .from('staff')
        .select('*')
        .eq('store_id', workspaceId)
        .order('display_name');

      if (staffError) throw staffError;

      // Load shifts
      const { data: shiftsData, error: shiftsError } = await supabase
        .from('shift_templates')
        .select('*')
        .eq('store_id', workspaceId)
        .order('start_time');

      if (shiftsError) throw shiftsError;

      setStaff(staffData || []);
      setShifts(shiftsData || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }

  function navigateWeek(direction: 'prev' | 'next') {
    const newDate = new Date(currentWeekStart);
    newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
    setCurrentWeekStart(newDate);
  }

  function goToToday() {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1);
    setCurrentWeekStart(new Date(today.setDate(diff)));
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <SmartScheduleNew
      storeId={workspaceId}
      staff={staff}
      shifts={shifts}
      currentWeekStart={currentWeekStart}
      navigateWeek={navigateWeek}
      setWeekStart={setCurrentWeekStart}
      goToToday={goToToday}
      onScheduleApplied={loadData}
    />
  );
}
