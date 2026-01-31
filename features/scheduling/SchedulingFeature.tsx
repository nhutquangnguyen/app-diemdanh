'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FeatureProps } from '@/core/types/feature';
import StoreSchedule from '@/components/StoreSchedule';
import { supabase } from '@/lib/supabase';
import { ShiftTemplate, Staff, ScheduleWithDetails, WeekSummary } from '@/types';

export default function SchedulingFeature({ workspaceId, config, adapter }: FeatureProps) {
  const router = useRouter();
  const [staff, setStaff] = useState<Staff[]>([]);
  const [shifts, setShifts] = useState<ShiftTemplate[]>([]);
  const [schedules, setSchedules] = useState<ScheduleWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRemoving, setIsRemoving] = useState<string | null>(null);
  const [weekSummary, setWeekSummary] = useState<WeekSummary>({
    totalShifts: 0,
    staffCount: 0,
    totalHours: 0,
  });

  // Week navigation
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() => {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(today.setDate(diff));
  });

  // Selection state for copy/paste
  const [selectedItem, setSelectedItem] = useState<{ type: 'day' | 'staff'; id: string; date?: Date } | null>(null);
  const [clipboard, setClipboard] = useState<{ type: 'day' | 'staff'; schedules: ScheduleWithDetails[] } | null>(null);

  // Get table/field names from adapter
  const staffTable = adapter?.tables?.people || 'staff';
  const shiftsTable = adapter?.tables?.shifts || 'shift_templates';
  const schedulesTable = adapter?.tables?.schedules || 'staff_schedules';
  const workspaceIdField = adapter?.fields?.workspaceId || 'store_id';

  useEffect(() => {
    loadData();
  }, [workspaceId, currentWeekStart]);

  async function loadData() {
    try {
      setLoading(true);

      // Load staff
      const { data: staffData, error: staffError } = await supabase
        .from(staffTable)
        .select('*')
        .eq(workspaceIdField, workspaceId)
        .is('deleted_at', null)
        .order('name');

      if (staffError) throw staffError;

      // Load shifts
      const { data: shiftsData, error: shiftsError } = await supabase
        .from(shiftsTable)
        .select('*')
        .eq(workspaceIdField, workspaceId)
        .is('deleted_at', null)
        .order('start_time');

      if (shiftsError) throw shiftsError;

      // Load schedules for current week
      const weekStart = formatDateSchedule(currentWeekStart);
      const weekEnd = formatDateSchedule(getWeekEnd(currentWeekStart));

      const { data: schedulesData, error: schedulesError } = await supabase
        .from(schedulesTable)
        .select('*')
        .eq(workspaceIdField, workspaceId)
        .gte('scheduled_date', weekStart)
        .lte('scheduled_date', weekEnd);

      if (schedulesError) throw schedulesError;

      // Enrich schedules with staff and shift data
      const enrichedSchedules = (schedulesData || []).map(schedule => {
        const staffMember = staffData?.find(s => s.id === schedule.staff_id);
        const shift = shiftsData?.find(sh => sh.id === schedule.shift_template_id || sh.id === schedule.shift_id);

        return {
          ...schedule,
          staff: staffMember ? { id: staffMember.id, name: staffMember.name } : null,
          shift_template: shift ? {
            id: shift.id,
            name: shift.name,
            start_time: shift.start_time,
            end_time: shift.end_time,
            color: shift.color
          } : null,
        };
      });

      setStaff(staffData || []);
      setShifts(shiftsData || []);
      setSchedules(enrichedSchedules);

    } catch (error) {
      console.error('Error loading schedule data:', error);
    } finally {
      setLoading(false);
    }
  }

  // Date formatting helpers
  function formatDateSchedule(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  function getWeekEnd(weekStart: Date): Date {
    const end = new Date(weekStart);
    end.setDate(end.getDate() + 6);
    return end;
  }

  function formatDateDisplay(date: Date, shortName?: boolean): string {
    const dayNames = shortName
      ? ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7']
      : ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];

    const day = date.getDate();
    const month = date.getMonth() + 1;
    const dayName = dayNames[date.getDay()];

    return `${dayName} ${day}/${month}`;
  }

  function getWeekDays(): Date[] {
    const days: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(currentWeekStart);
      day.setDate(currentWeekStart.getDate() + i);
      days.push(day);
    }
    return days;
  }

  function navigateWeek(direction: 'prev' | 'next') {
    const newWeekStart = new Date(currentWeekStart);
    newWeekStart.setDate(newWeekStart.getDate() + (direction === 'next' ? 7 : -7));
    setCurrentWeekStart(newWeekStart);
  }

  function goToToday() {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1);
    setCurrentWeekStart(new Date(today.setDate(diff)));
  }

  function getStaffForShiftAndDate(shiftId: string, date: Date): ScheduleWithDetails[] {
    const dateStr = formatDateSchedule(date);
    return schedules.filter(schedule =>
      schedule.shift_template_id === shiftId &&
      schedule.scheduled_date === dateStr
    );
  }

  async function copyPreviousWeek() {
    // Implementation would copy last week's schedule to this week
    console.log('Copy previous week - to be implemented');
  }

  function openAssignModal(shift: ShiftTemplate, date: Date) {
    // Implementation would open modal to assign staff
    console.log('Open assign modal', shift, date);
  }

  async function handleRemoveStaffFromShift(scheduleId: string, staffName: string) {
    if (!confirm(`Xóa ${staffName} khỏi ca làm này?`)) return;

    setIsRemoving(scheduleId);
    try {
      const { error } = await supabase
        .from(schedulesTable)
        .delete()
        .eq('id', scheduleId);

      if (error) throw error;

      // Reload data
      await loadData();
    } catch (error) {
      console.error('Error removing staff:', error);
      alert('Có lỗi xảy ra khi xóa nhân viên');
    } finally {
      setIsRemoving(null);
    }
  }

  // Touch handlers for mobile
  function handleTouchStart(e: React.TouchEvent) {
    // Implementation for touch start
  }

  function handleTouchMove(e: React.TouchEvent) {
    // Implementation for touch move
  }

  function handleTouchEnd() {
    // Implementation for touch end
  }

  // Toolbar actions
  function handleToolbarCopy() {
    if (!selectedItem) return;

    if (selectedItem.type === 'day' && selectedItem.date) {
      const dateStr = formatDateSchedule(selectedItem.date);
      const daySchedules = schedules.filter(s => s.scheduled_date === dateStr);
      setClipboard({ type: 'day', schedules: daySchedules });
    } else if (selectedItem.type === 'staff') {
      const staffSchedules = schedules.filter(s => s.staff_id === selectedItem.id);
      setClipboard({ type: 'staff', schedules: staffSchedules });
    }
  }

  function handleToolbarPaste() {
    // Implementation for paste
    console.log('Paste - to be implemented');
  }

  function handleToolbarClear() {
    setSelectedItem(null);
    setClipboard(null);
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <StoreSchedule
      storeId={workspaceId}
      staff={staff}
      shifts={shifts}
      schedules={schedules}
      currentWeekStart={currentWeekStart}
      isRemoving={isRemoving}
      weekSummary={weekSummary}
      copyPreviousWeek={copyPreviousWeek}
      navigateWeek={navigateWeek}
      goToToday={goToToday}
      getWeekDays={getWeekDays}
      formatDateSchedule={formatDateSchedule}
      formatDateDisplay={formatDateDisplay}
      getStaffForShiftAndDate={getStaffForShiftAndDate}
      openAssignModal={openAssignModal}
      handleRemoveStaffFromShift={handleRemoveStaffFromShift}
      handleTouchStart={handleTouchStart}
      handleTouchMove={handleTouchMove}
      handleTouchEnd={handleTouchEnd}
      selectedItem={selectedItem}
      setSelectedItem={setSelectedItem}
      clipboard={clipboard}
      setClipboard={setClipboard}
      handleToolbarCopy={handleToolbarCopy}
      handleToolbarPaste={handleToolbarPaste}
      handleToolbarClear={handleToolbarClear}
    />
  );
}
