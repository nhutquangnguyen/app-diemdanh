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

  // Assign modal state
  const [assignModal, setAssignModal] = useState<{ shift: ShiftTemplate; date: Date } | null>(null);
  const [selectedStaffIds, setSelectedStaffIds] = useState<string[]>([]);

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
    if (!confirm('Bạn có chắc chắn muốn sao chép lịch tuần trước? Lịch hiện tại sẽ bị ghi đè.')) {
      return;
    }

    try {
      // Calculate previous week's Monday
      const previousWeekStart = new Date(currentWeekStart);
      previousWeekStart.setDate(previousWeekStart.getDate() - 7);

      // Calculate date ranges
      const previousWeekDates: string[] = [];
      const currentWeekDates: string[] = [];

      for (let i = 0; i < 7; i++) {
        const prevDate = new Date(previousWeekStart);
        prevDate.setDate(previousWeekStart.getDate() + i);
        previousWeekDates.push(prevDate.toISOString().split('T')[0]);

        const currDate = new Date(currentWeekStart);
        currDate.setDate(currentWeekStart.getDate() + i);
        currentWeekDates.push(currDate.toISOString().split('T')[0]);
      }

      // Load previous week's schedules
      const { data: previousSchedules, error: loadError } = await supabase
        .from(schedulesTable)
        .select('*')
        .eq(workspaceIdField, workspaceId)
        .in('scheduled_date', previousWeekDates);

      if (loadError) throw loadError;

      if (!previousSchedules || previousSchedules.length === 0) {
        alert('Không tìm thấy lịch tuần trước để sao chép');
        return;
      }

      // Delete current week's schedules
      const { error: deleteError } = await supabase
        .from(schedulesTable)
        .delete()
        .eq(workspaceIdField, workspaceId)
        .in('scheduled_date', currentWeekDates);

      if (deleteError) throw deleteError;

      // Create new schedules for current week based on previous week
      const personIdField = adapter?.fields?.personId || 'staff_id';
      const newSchedules = previousSchedules.map(schedule => {
        // Find the day of week from previous schedule
        const dayIndex = previousWeekDates.indexOf(schedule.scheduled_date);
        const newDate = currentWeekDates[dayIndex];

        // Create new schedule object
        const newSchedule: any = {
          [personIdField]: schedule[personIdField],
          [workspaceIdField]: workspaceId,
          shift_template_id: schedule.shift_template_id,
          scheduled_date: newDate,
        };

        return newSchedule;
      });

      // Insert new schedules
      const { error: insertError } = await supabase
        .from(schedulesTable)
        .insert(newSchedules);

      if (insertError) throw insertError;

      // Reload schedules
      await loadData();

      alert(`Đã sao chép ${previousSchedules.length} ca làm việc từ tuần trước!`);
    } catch (error) {
      console.error('Error copying previous week:', error);
      alert('Có lỗi xảy ra khi sao chép lịch tuần trước');
    }
  }

  function openAssignModal(shift: ShiftTemplate, date: Date) {
    // Get currently assigned staff for this shift and date
    const dateStr = formatDateSchedule(date);
    const assignedStaff = schedules
      .filter(s => s.shift_template_id === shift.id && s.scheduled_date === dateStr)
      .map(s => s.staff_id);

    setSelectedStaffIds(assignedStaff);
    setAssignModal({ shift, date });
  }

  function closeAssignModal() {
    setAssignModal(null);
    setSelectedStaffIds([]);
  }

  function toggleStaffSelection(staffId: string) {
    setSelectedStaffIds(prev => {
      if (prev.includes(staffId)) {
        return prev.filter(id => id !== staffId);
      } else {
        return [...prev, staffId];
      }
    });
  }

  async function saveAssignments() {
    if (!assignModal) return;

    try {
      const dateStr = formatDateSchedule(assignModal.date);
      const personIdField = adapter?.fields?.personId || 'staff_id';

      // Get current assignments
      const currentAssignments = schedules.filter(
        s => s.shift_template_id === assignModal.shift.id && s.scheduled_date === dateStr
      );
      const currentStaffIds = currentAssignments.map(s => s.staff_id);

      // Calculate changes
      const toAdd = selectedStaffIds.filter(id => !currentStaffIds.includes(id));
      const toRemove = currentStaffIds.filter(id => !selectedStaffIds.includes(id));

      // Remove unselected staff
      for (const staffId of toRemove) {
        const scheduleToRemove = currentAssignments.find(s => s.staff_id === staffId);
        if (scheduleToRemove) {
          const { error } = await supabase
            .from(schedulesTable)
            .delete()
            .eq('id', scheduleToRemove.id);

          if (error) throw error;
        }
      }

      // Add newly selected staff
      const newSchedules = toAdd.map(staffId => ({
        [personIdField]: staffId,
        [workspaceIdField]: workspaceId,
        shift_template_id: assignModal.shift.id,
        scheduled_date: dateStr,
      }));

      if (newSchedules.length > 0) {
        const { error } = await supabase
          .from(schedulesTable)
          .insert(newSchedules);

        if (error) throw error;
      }

      // Reload data and close modal
      await loadData();
      closeAssignModal();

    } catch (error) {
      console.error('Error saving assignments:', error);
      alert('Có lỗi xảy ra khi lưu phân công');
    }
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

  async function handleAssignShift(staffId: string, shiftId: string, date: string) {
    try {
      const personIdField = adapter?.fields?.personId || 'staff_id';

      const scheduleData: any = {
        [personIdField]: staffId,
        [workspaceIdField]: workspaceId,
        shift_template_id: shiftId,
        scheduled_date: date,
      };

      const { error } = await supabase
        .from(schedulesTable)
        .insert([scheduleData]);

      if (error) throw error;

      // Reload data
      await loadData();
    } catch (error) {
      console.error('Error assigning shift:', error);
      throw error;
    }
  }

  // Touch handlers for mobile swipe navigation
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  // Minimum swipe distance (in px) to trigger navigation
  const minSwipeDistance = 50;

  function handleTouchStart(e: React.TouchEvent) {
    setTouchEnd(null); // Reset touch end
    setTouchStart(e.targetTouches[0].clientX);
  }

  function handleTouchMove(e: React.TouchEvent) {
    setTouchEnd(e.targetTouches[0].clientX);
  }

  function handleTouchEnd() {
    if (!touchStart || !touchEnd) return;

    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe) {
      // Swipe left = next week
      navigateWeek('next');
    } else if (isRightSwipe) {
      // Swipe right = previous week
      navigateWeek('prev');
    }

    // Reset
    setTouchStart(null);
    setTouchEnd(null);
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

  async function handleToolbarPaste() {
    if (!clipboard || !selectedItem) {
      alert('Vui lòng chọn nơi cần dán lịch');
      return;
    }

    if (clipboard.schedules.length === 0) {
      alert('Không có lịch để dán');
      return;
    }

    try {
      const personIdField = adapter?.fields?.personId || 'staff_id';
      let newSchedules: any[] = [];

      if (clipboard.type === 'day' && selectedItem.type === 'day' && selectedItem.date) {
        // Paste a day's schedules to another day
        const targetDateStr = formatDateSchedule(selectedItem.date);

        // Delete existing schedules on target date
        const { error: deleteError } = await supabase
          .from(schedulesTable)
          .delete()
          .eq(workspaceIdField, workspaceId)
          .eq('scheduled_date', targetDateStr);

        if (deleteError) throw deleteError;

        // Create new schedules for target date
        newSchedules = clipboard.schedules.map(schedule => ({
          [personIdField]: (schedule as any)[personIdField],
          [workspaceIdField]: workspaceId,
          shift_template_id: schedule.shift_template_id,
          scheduled_date: targetDateStr,
        }));

      } else if (clipboard.type === 'staff' && selectedItem.type === 'staff') {
        // Paste a staff's entire week schedule to another staff
        const targetStaffId = selectedItem.id;

        // Get all unique dates from clipboard schedules
        const scheduleDates = [...new Set(clipboard.schedules.map(s => s.scheduled_date))];

        // Delete existing schedules for target staff on those dates
        const { error: deleteError } = await supabase
          .from(schedulesTable)
          .delete()
          .eq(workspaceIdField, workspaceId)
          .eq(personIdField, targetStaffId)
          .in('scheduled_date', scheduleDates);

        if (deleteError) throw deleteError;

        // Create new schedules for target staff
        newSchedules = clipboard.schedules.map(schedule => ({
          [personIdField]: targetStaffId,
          [workspaceIdField]: workspaceId,
          shift_template_id: schedule.shift_template_id,
          scheduled_date: schedule.scheduled_date,
        }));

      } else {
        alert('Không thể dán: Loại sao chép và loại dán không khớp');
        return;
      }

      // Insert new schedules
      if (newSchedules.length > 0) {
        const { error: insertError } = await supabase
          .from(schedulesTable)
          .insert(newSchedules);

        if (insertError) throw insertError;

        // Reload data
        await loadData();

        alert(`Đã dán ${newSchedules.length} ca làm việc!`);
      }

    } catch (error) {
      console.error('Error pasting schedules:', error);
      alert('Có lỗi xảy ra khi dán lịch');
    }
  }

  async function handleToolbarClear() {
    if (!selectedItem) {
      alert('Vui lòng chọn ngày hoặc nhân viên cần xóa lịch');
      return;
    }

    const confirmMessage = selectedItem.type === 'day'
      ? 'Bạn có chắc chắn muốn xóa tất cả lịch làm việc trong ngày này?'
      : 'Bạn có chắc chắn muốn xóa tất cả lịch làm việc của nhân viên này trong tuần?';

    if (!confirm(confirmMessage)) {
      return;
    }

    try {
      const personIdField = adapter?.fields?.personId || 'staff_id';

      if (selectedItem.type === 'day' && selectedItem.date) {
        // Delete all schedules for the selected day
        const targetDateStr = formatDateSchedule(selectedItem.date);

        const { error } = await supabase
          .from(schedulesTable)
          .delete()
          .eq(workspaceIdField, workspaceId)
          .eq('scheduled_date', targetDateStr);

        if (error) throw error;

        alert('Đã xóa tất cả lịch làm việc trong ngày này!');
      } else if (selectedItem.type === 'staff') {
        // Delete all schedules for the selected staff in the current week
        const weekStart = formatDateSchedule(currentWeekStart);
        const weekEnd = formatDateSchedule(getWeekEnd(currentWeekStart));

        const { error } = await supabase
          .from(schedulesTable)
          .delete()
          .eq(workspaceIdField, workspaceId)
          .eq(personIdField, selectedItem.id)
          .gte('scheduled_date', weekStart)
          .lte('scheduled_date', weekEnd);

        if (error) throw error;

        alert('Đã xóa tất cả lịch làm việc của nhân viên này trong tuần!');
      }

      // Clear selection and reload data
      setSelectedItem(null);
      setClipboard(null);
      await loadData();

    } catch (error) {
      console.error('Error clearing schedules:', error);
      alert('Có lỗi xảy ra khi xóa lịch');
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
    <>
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
        handleAssignShift={handleAssignShift}
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

      {/* Assign Staff Modal */}
      {assignModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={closeAssignModal}
        >
          <div
            className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xl font-bold">Phân Công Nhân Viên</h3>
                <button
                  onClick={closeAssignModal}
                  className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-2 transition-all"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="space-y-1 text-sm">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded"
                    style={{ backgroundColor: assignModal.shift.color }}
                  />
                  <span className="font-semibold">{assignModal.shift.name}</span>
                  <span className="opacity-90">
                    ({assignModal.shift.start_time.substring(0, 5)} - {assignModal.shift.end_time.substring(0, 5)})
                  </span>
                </div>
                <div>
                  <span className="opacity-90">Ngày: </span>
                  <span className="font-semibold">{formatDateDisplay(assignModal.date)}</span>
                </div>
              </div>
            </div>

            {/* Staff List */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-250px)]">
              <div className="mb-4 text-sm text-gray-600">
                Chọn nhân viên làm ca này ({selectedStaffIds.length} được chọn)
              </div>
              <div className="space-y-2">
                {staff.map((staffMember) => {
                  const isSelected = selectedStaffIds.includes(staffMember.id);
                  const initials = staffMember.display_name
                    .split(' ')
                    .slice(-2)
                    .map(n => n[0])
                    .join('')
                    .toUpperCase() || '??';

                  return (
                    <label
                      key={staffMember.id}
                      className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all hover:bg-gray-50 ${
                        isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleStaffSelection(staffMember.id)}
                        className="w-5 h-5 text-blue-600 rounded"
                      />
                      <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0 bg-gradient-to-br from-blue-500 to-blue-600">
                        {initials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-gray-800">{staffMember.display_name}</div>
                        <div className="text-xs text-gray-500 truncate">{staffMember.email}</div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-gray-200 p-4 flex gap-3">
              <button
                onClick={closeAssignModal}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-3 rounded-lg font-semibold transition-all"
              >
                Hủy
              </button>
              <button
                onClick={saveAssignments}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg font-semibold transition-all"
              >
                Lưu ({selectedStaffIds.length})
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
