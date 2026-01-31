'use client';

import { useState, useEffect } from 'react';
import { FeatureProps } from '@/core/types/feature';
import StoreStaff from '@/components/StoreStaff';
import { supabase } from '@/lib/supabase';
import { Staff } from '@/types';

export default function PeopleFeature({ workspaceId, config, adapter }: FeatureProps) {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);

  // Swipe state management
  const [swipeState, setSwipeState] = useState<Record<string, number>>({});
  const [swipeStart, setSwipeStart] = useState<{ staffId: string; x: number } | null>(null);

  // Edit state management
  const [editingStaffId, setEditingStaffId] = useState<string | null>(null);
  const [editSalaryType, setEditSalaryType] = useState<'hourly' | 'monthly' | 'daily'>('hourly');
  const [editHourRate, setEditHourRate] = useState<string>('');
  const [editMonthlyRate, setEditMonthlyRate] = useState<string>('');
  const [editDailyRate, setEditDailyRate] = useState<string>('');
  const [editName, setEditName] = useState<string>('');

  // Get table names from adapter
  const staffTable = adapter?.tables?.people || 'staff';
  const workspaceIdField = adapter?.fields?.workspaceId || 'store_id';

  useEffect(() => {
    loadStaff();
  }, [workspaceId]);

  async function loadStaff() {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from(staffTable)
        .select('*')
        .eq(workspaceIdField, workspaceId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setStaff(data || []);
    } catch (error) {
      console.error('Error loading staff:', error);
    } finally {
      setLoading(false);
    }
  }

  // Swipe handlers
  function handleStaffTouchStart(e: React.TouchEvent, staffId: string) {
    setSwipeStart({ staffId, x: e.touches[0].clientX });
  }

  function handleStaffTouchMove(e: React.TouchEvent, staffId: string) {
    if (!swipeStart || swipeStart.staffId !== staffId) return;

    const currentX = e.touches[0].clientX;
    const diff = swipeStart.x - currentX;
    const offset = Math.max(-80, Math.min(0, -diff));

    setSwipeState(prev => ({ ...prev, [staffId]: offset }));
  }

  function handleStaffTouchEnd(staffId: string) {
    if (!swipeStart || swipeStart.staffId !== staffId) return;

    const offset = swipeState[staffId] || 0;
    const finalOffset = offset < -40 ? -80 : 0;

    setSwipeState(prev => ({ ...prev, [staffId]: finalOffset }));
    setSwipeStart(null);
  }

  // Delete staff
  async function deleteStaff(staffId: string) {
    const confirmDelete = window.confirm('Bạn có chắc chắn muốn xóa nhân viên này?');
    if (!confirmDelete) return;

    try {
      const { error } = await supabase
        .from(staffTable)
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', staffId);

      if (error) throw error;

      await loadStaff();
    } catch (error) {
      console.error('Error deleting staff:', error);
      alert('Có lỗi xảy ra khi xóa nhân viên');
    }
  }

  // Update staff info
  async function updateStaffInfo(staffId: string) {
    try {
      const updateData: any = {
        salary_type: editSalaryType,
        name: editName || null,
      };

      if (editSalaryType === 'hourly') {
        updateData.hour_rate = parseFloat(editHourRate) || 0;
        updateData.monthly_rate = null;
        updateData.daily_rate = null;
      } else if (editSalaryType === 'monthly') {
        updateData.monthly_rate = parseFloat(editMonthlyRate) || 0;
        updateData.hour_rate = null;
        updateData.daily_rate = null;
      } else if (editSalaryType === 'daily') {
        updateData.daily_rate = parseFloat(editDailyRate) || 0;
        updateData.hour_rate = null;
        updateData.monthly_rate = null;
      }

      const { error } = await supabase
        .from(staffTable)
        .update(updateData)
        .eq('id', staffId);

      if (error) throw error;

      setEditingStaffId(null);
      setEditSalaryType('hourly');
      setEditHourRate('');
      setEditMonthlyRate('');
      setEditDailyRate('');
      setEditName('');

      await loadStaff();
    } catch (error) {
      console.error('Error updating staff:', error);
      alert('Có lỗi xảy ra khi cập nhật thông tin nhân viên');
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
    <StoreStaff
      storeId={workspaceId}
      staff={staff}
      swipeState={swipeState}
      swipeStart={swipeStart}
      editingStaffId={editingStaffId}
      editSalaryType={editSalaryType}
      editHourRate={editHourRate}
      editMonthlyRate={editMonthlyRate}
      editDailyRate={editDailyRate}
      editName={editName}
      setSwipeState={setSwipeState}
      setEditingStaffId={setEditingStaffId}
      setEditSalaryType={setEditSalaryType}
      setEditHourRate={setEditHourRate}
      setEditMonthlyRate={setEditMonthlyRate}
      setEditDailyRate={setEditDailyRate}
      setEditName={setEditName}
      handleStaffTouchStart={handleStaffTouchStart}
      handleStaffTouchMove={handleStaffTouchMove}
      handleStaffTouchEnd={handleStaffTouchEnd}
      deleteStaff={deleteStaff}
      updateStaffInfo={updateStaffInfo}
    />
  );
}
