'use client';

import { useState, useEffect } from 'react';
import { FeatureProps } from '@/core/types/feature';
import StoreShifts from '@/components/StoreShifts';
import { supabase } from '@/lib/supabase';
import { ShiftTemplate } from '@/types';

export default function ShiftsFeature({ workspaceId, config, adapter }: FeatureProps) {
  const [shifts, setShifts] = useState<ShiftTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [showShiftForm, setShowShiftForm] = useState(false);
  const [editingShift, setEditingShift] = useState<ShiftTemplate | null>(null);
  const [shiftFormData, setShiftFormData] = useState({
    name: '',
    start_time: '08:00',
    end_time: '17:00',
    grace_period_minutes: 15,
    color: '#3B82F6',
  });

  // Get table names from adapter
  const shiftsTable = adapter?.tables?.shifts || 'shift_templates';
  const workspaceIdField = adapter?.fields?.workspaceId || 'store_id';

  useEffect(() => {
    loadShifts();
  }, [workspaceId]);

  async function loadShifts() {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from(shiftsTable)
        .select('*')
        .eq(workspaceIdField, workspaceId)
        .is('deleted_at', null)
        .order('start_time');

      if (error) throw error;

      setShifts(data || []);
    } catch (error) {
      console.error('Error loading shifts:', error);
    } finally {
      setLoading(false);
    }
  }

  function calculateShiftDuration(startTime: string, endTime: string): string {
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);

    let totalMinutes = (endHour * 60 + endMin) - (startHour * 60 + startMin);

    // Handle overnight shifts
    if (totalMinutes < 0) {
      totalMinutes += 24 * 60;
    }

    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    if (minutes === 0) {
      return `${hours}h`;
    }
    return `${hours}h ${minutes}m`;
  }

  function resetShiftForm() {
    setShowShiftForm(false);
    setEditingShift(null);
    setShiftFormData({
      name: '',
      start_time: '08:00',
      end_time: '17:00',
      grace_period_minutes: 15,
      color: '#3B82F6',
    });
  }

  function startEditShift(shift: ShiftTemplate) {
    setEditingShift(shift);
    setShiftFormData({
      name: shift.name,
      start_time: shift.start_time.substring(0, 5),
      end_time: shift.end_time.substring(0, 5),
      grace_period_minutes: shift.grace_period_minutes || 15,
      color: shift.color || '#3B82F6',
    });
    setShowShiftForm(true);
  }

  async function handleShiftSubmit(e: React.FormEvent) {
    e.preventDefault();

    try {
      const shiftData = {
        name: shiftFormData.name,
        start_time: shiftFormData.start_time,
        end_time: shiftFormData.end_time,
        grace_period_minutes: shiftFormData.grace_period_minutes,
        color: shiftFormData.color,
        [workspaceIdField]: workspaceId,
      };

      if (editingShift) {
        // Update existing shift
        const { error } = await supabase
          .from(shiftsTable)
          .update(shiftData)
          .eq('id', editingShift.id);

        if (error) throw error;
      } else {
        // Create new shift
        const { error } = await supabase
          .from(shiftsTable)
          .insert(shiftData);

        if (error) throw error;
      }

      resetShiftForm();
      await loadShifts();
    } catch (error) {
      console.error('Error saving shift:', error);
      alert('Có lỗi xảy ra khi lưu ca làm việc');
    }
  }

  async function deleteShift(shiftId: string) {
    const confirmDelete = window.confirm('Bạn có chắc chắn muốn xóa ca làm việc này? Lịch làm việc liên quan sẽ bị ảnh hưởng.');
    if (!confirmDelete) return;

    try {
      const { error } = await supabase
        .from(shiftsTable)
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', shiftId);

      if (error) throw error;

      await loadShifts();
    } catch (error) {
      console.error('Error deleting shift:', error);
      alert('Có lỗi xảy ra khi xóa ca làm việc');
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
    <StoreShifts
      shifts={shifts}
      showShiftForm={showShiftForm}
      editingShift={editingShift}
      shiftFormData={shiftFormData}
      setShowShiftForm={setShowShiftForm}
      setEditingShift={setEditingShift}
      setShiftFormData={setShiftFormData}
      handleShiftSubmit={handleShiftSubmit}
      calculateShiftDuration={calculateShiftDuration}
      resetShiftForm={resetShiftForm}
      startEditShift={startEditShift}
      deleteShift={deleteShift}
    />
  );
}
