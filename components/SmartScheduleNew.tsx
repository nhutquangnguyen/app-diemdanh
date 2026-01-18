import { useState, useEffect, useRef } from 'react';
import { Staff, ShiftTemplate } from '@/types';
import { supabase } from '@/lib/supabase';
import {
  generateSmartSchedule,
  getWeekStartDate,
  getWeekDates,
  calculateShiftDuration
} from '@/lib/smartSchedule';
import { useToast } from '@/components/Toast';

interface SmartScheduleNewProps {
  storeId: string;
  staff: Staff[];
  shifts: ShiftTemplate[];
  currentWeekStart: Date;
  navigateWeek: (direction: 'prev' | 'next') => void;
  setWeekStart?: (date: Date) => void;
  goToToday: () => void;
  onScheduleApplied: () => void;
}

export default function SmartScheduleNew({
  storeId,
  staff,
  shifts,
  currentWeekStart,
  navigateWeek,
  setWeekStart,
  goToToday,
  onScheduleApplied,
}: SmartScheduleNewProps) {
  const toast = useToast();

  // State
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [requirements, setRequirements] = useState<{ [key: string]: number }>({});
  const [availability, setAvailability] = useState<{ [key: string]: boolean }>({});
  const [expandedStaff, setExpandedStaff] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generatedSchedule, setGeneratedSchedule] = useState<any>(null);
  const [submissionStatus, setSubmissionStatus] = useState<{ [staffId: string]: { submitted: boolean; isOverride: boolean } }>({});
  const [lockedStaff, setLockedStaff] = useState<Set<string>>(new Set()); // Staff IDs that are locked
  const [originalAvailability, setOriginalAvailability] = useState<{ [key: string]: boolean }>({}); // Store original staff submissions
  const [bulkApplyValue, setBulkApplyValue] = useState<string>('1');
  const [showWeekPicker, setShowWeekPicker] = useState(false);
  const [calendarViewDate, setCalendarViewDate] = useState<Date>(currentWeekStart); // Separate state for calendar view
  const [errorModal, setErrorModal] = useState<{ title: string; message: string; suggestions: string[]; footer?: string } | null>(null);
  const weekPickerRef = useRef<HTMLDivElement>(null);

  const weekStartStr = getWeekStartDate(currentWeekStart);
  const weekDates = getWeekDates(weekStartStr);
  const dayNames = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

  // Load data
  useEffect(() => {
    loadData();
  }, [weekStartStr, storeId]);

  // Click outside to close week picker
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (weekPickerRef.current && !weekPickerRef.current.contains(event.target as Node)) {
        setShowWeekPicker(false);
      }
    }

    if (showWeekPicker) {
      // Reset calendar view to current week's month when opening picker
      setCalendarViewDate(new Date(currentWeekStart));
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showWeekPicker, currentWeekStart]);

  async function loadData() {
    try {
      setLoading(true);

      // Load requirements
      const { data: reqData, error: reqError } = await supabase
        .from('shift_requirements')
        .select('*')
        .eq('store_id', storeId)
        .eq('week_start_date', weekStartStr);

      if (reqError) throw reqError;

      const reqMap: { [key: string]: number } = {};
      reqData?.forEach(item => {
        const key = `${item.day_of_week}_${item.shift_template_id}`;
        reqMap[key] = item.required_staff_count;
      });
      setRequirements(reqMap);

      // Load availability
      const { data: availData, error: availError } = await supabase
        .from('staff_availability')
        .select('*')
        .eq('store_id', storeId)
        .eq('week_start_date', weekStartStr);

      if (availError) throw availError;

      const availMap: { [key: string]: boolean } = {};
      const originalMap: { [key: string]: boolean } = {}; // Store original staff submissions
      const statusMap: { [staffId: string]: { submitted: boolean; isOverride: boolean } } = {};
      const locked = new Set<string>();

      // Track submission status per staff
      staff.forEach(s => {
        statusMap[s.id] = { submitted: false, isOverride: false };
      });

      availData?.forEach(item => {
        const key = `${item.staff_id}_${item.day_of_week}_${item.shift_template_id}`;
        availMap[key] = item.is_available;

        // Track if staff has submitted and whether it's an override
        if (statusMap[item.staff_id]) {
          statusMap[item.staff_id].submitted = true;
          if (item.is_owner_override) {
            statusMap[item.staff_id].isOverride = true;
          } else {
            // This is staff's own submission - save as original and lock
            originalMap[key] = item.is_available;
            locked.add(item.staff_id);
          }
        }
      });

      setAvailability(availMap);
      setOriginalAvailability(originalMap);
      setSubmissionStatus(statusMap);
      setLockedStaff(locked);

    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Lỗi khi tải dữ liệu');
    } finally {
      setLoading(false);
    }
  }

  // Get/Set requirement
  function getRequirement(dayIndex: number, shiftId: string): number {
    const key = `${dayIndex}_${shiftId}`;
    return requirements[key] || 0;
  }

  function setRequirement(dayIndex: number, shiftId: string, value: number) {
    const key = `${dayIndex}_${shiftId}`;
    setRequirements(prev => ({ ...prev, [key]: Math.max(0, value) }));
  }

  // Bulk apply requirement
  function bulkApplyRequirement(value: number) {
    const newReqs: { [key: string]: number } = {};
    for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
      for (const shift of shifts) {
        const key = `${dayIndex}_${shift.id}`;
        newReqs[key] = value;
      }
    }
    setRequirements(newReqs);
    if (value === 0) {
      toast.success('Đã xóa tất cả yêu cầu');
    } else {
      toast.success(`Đã áp dụng ${value} người cho tất cả ca`);
    }
  }

  function handleBulkApply() {
    const num = parseInt(bulkApplyValue);
    if (isNaN(num) || num < 0) {
      toast.error('Vui lòng nhập số hợp lệ (≥ 0)');
      return;
    }
    bulkApplyRequirement(num);
  }

  // Get/Set availability
  function isAvailable(staffId: string, dayIndex: number, shiftId: string): boolean {
    const key = `${staffId}_${dayIndex}_${shiftId}`;
    return availability[key] || false;
  }

  function toggleAvailability(staffId: string, dayIndex: number, shiftId: string) {
    const key = `${staffId}_${dayIndex}_${shiftId}`;
    setAvailability(prev => ({ ...prev, [key]: !prev[key] }));
  }

  // Quick apply for staff
  function quickApplyStaff(staffId: string, pattern: 'all' | 'weekdays' | 'weekends' | 'clear') {
    const newAvail = { ...availability };

    for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
      let shouldApply = false;

      if (pattern === 'all') shouldApply = true;
      else if (pattern === 'weekdays' && dayIndex >= 0 && dayIndex <= 4) shouldApply = true;
      else if (pattern === 'weekends' && (dayIndex === 5 || dayIndex === 6)) shouldApply = true;
      else if (pattern === 'clear') shouldApply = false;

      if (pattern !== 'clear' || pattern === 'clear') {
        for (const shift of shifts) {
          const key = `${staffId}_${dayIndex}_${shift.id}`;
          newAvail[key] = shouldApply;
        }
      }
    }

    setAvailability(newAvail);
  }

  // Count staff availability
  function countStaffAvailability(staffId: string): { available: number; total: number } {
    let available = 0;
    const total = 7 * shifts.length;

    for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
      for (const shift of shifts) {
        if (isAvailable(staffId, dayIndex, shift.id)) {
          available++;
        }
      }
    }

    return { available, total };
  }

  // Toggle lock/unlock for a staff member
  function toggleLock(staffId: string) {
    setLockedStaff(prev => {
      const newSet = new Set(prev);
      if (newSet.has(staffId)) {
        newSet.delete(staffId);
      } else {
        newSet.add(staffId);
      }
      return newSet;
    });
  }

  // Reset to staff's original submission
  function resetToOriginal(staffId: string) {
    const newAvail = { ...availability };

    // Clear current availability for this staff
    Object.keys(newAvail).forEach(key => {
      if (key.startsWith(`${staffId}_`)) {
        delete newAvail[key];
      }
    });

    // Restore original
    Object.entries(originalAvailability).forEach(([key, value]) => {
      if (key.startsWith(`${staffId}_`)) {
        newAvail[key] = value;
      }
    });

    setAvailability(newAvail);
    toast.success('Đã khôi phục lịch rảnh gốc của nhân viên');
  }

  // Save to database
  async function handleSave() {
    try {
      setSaving(true);

      // Prepare requirement records
      const reqRecords = Object.entries(requirements)
        .filter(([_, count]) => count > 0)
        .map(([key, count]) => {
          const [dayOfWeek, shiftTemplateId] = key.split('_');
          return {
            store_id: storeId,
            week_start_date: weekStartStr,
            shift_template_id: shiftTemplateId,
            day_of_week: parseInt(dayOfWeek),
            required_staff_count: count,
          };
        });

      // Get current user for tracking
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Prepare availability records
      const availRecords = Object.entries(availability)
        .filter(([_, isAvail]) => isAvail)
        .map(([key]) => {
          const [staffId, dayOfWeek, shiftTemplateId] = key.split('_');
          const status = submissionStatus[staffId];

          // Determine if this is an override
          // It's an override if: staff submitted originally AND owner unlocked to edit
          const isOverride = status && status.submitted && !status.isOverride && !lockedStaff.has(staffId);

          return {
            staff_id: staffId,
            store_id: storeId,
            week_start_date: weekStartStr,
            shift_template_id: shiftTemplateId,
            day_of_week: parseInt(dayOfWeek),
            is_available: true,
            created_by: user.id,
            modified_by: user.id,
            is_owner_override: isOverride,
            override_reason: isOverride ? 'Owner manually edited availability' : null,
          };
        });

      // Delete existing
      await supabase.from('shift_requirements').delete()
        .eq('store_id', storeId).eq('week_start_date', weekStartStr);
      await supabase.from('staff_availability').delete()
        .eq('store_id', storeId).eq('week_start_date', weekStartStr);

      // Insert new
      if (reqRecords.length > 0) {
        const { error: reqError } = await supabase.from('shift_requirements').insert(reqRecords);
        if (reqError) throw reqError;
      }
      if (availRecords.length > 0) {
        const { error: availError } = await supabase.from('staff_availability').insert(availRecords);
        if (availError) throw availError;
      }

      toast.success('Đã lưu thành công');
      await loadData(); // Reload to update submission status

      // Navigate to next step only from step 1
      // Step 2 uses handleGenerate instead of handleSave
      if (step === 1) {
        setStep(2);
      }
    } catch (error) {
      console.error('Error saving:', error);
      toast.error('Lỗi khi lưu dữ liệu');
    } finally {
      setSaving(false);
    }
  }

  // Generate schedule
  async function handleGenerate() {
    try {
      setGenerating(true);

      // Detailed validation
      const hasRequirements = Object.values(requirements).some(v => v > 0);
      const hasAvailability = Object.values(availability).some(v => v);

      // Check if no requirements set
      if (!hasRequirements) {
        showErrorModal(
          'Chưa có yêu cầu nhân viên',
          'Bạn chưa nhập số lượng nhân viên cần thiết cho bất kỳ ca làm việc nào.',
          [
            'Quay lại Bước 2 và nhập số lượng nhân viên cần thiết cho mỗi ca',
            'Hoặc sử dụng tính năng "Áp dụng nhanh" để thiết lập nhanh cho tất cả'
          ]
        );
        return;
      }

      // Check if no staff available
      if (staff.length === 0) {
        showErrorModal(
          'Không có nhân viên',
          'Cửa hàng chưa có nhân viên nào để xếp lịch.',
          [
            'Vào tab "Nhân viên" để thêm nhân viên mới',
            'Đảm bảo có ít nhất 1 nhân viên trước khi tạo lịch tự động'
          ]
        );
        return;
      }

      // Check if no one marked as available
      if (!hasAvailability) {
        showErrorModal(
          'Không có nhân viên rảnh',
          'Chưa có nhân viên nào được đánh dấu là có thể làm việc.',
          [
            'Mở rộng từng nhân viên và đánh dấu các ca làm việc họ có thể làm',
            'Sử dụng "Áp dụng nhanh" (Tất cả tuần, T2-T6, T7-CN) để thiết lập nhanh',
            'Ít nhất 1 nhân viên cần có ít nhất 1 ca được đánh dấu là rảnh'
          ]
        );
        return;
      }

      // Prepare data
      const shiftsData = [];
      for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
        for (const shift of shifts) {
          const required = getRequirement(dayIndex, shift.id);
          if (required > 0) {
            shiftsData.push({
              date: weekDates[dayIndex],
              shiftTemplateId: shift.id,
              shiftName: shift.name,
              startTime: shift.start_time,
              endTime: shift.end_time,
              duration: calculateShiftDuration(shift.start_time, shift.end_time),
              required,
              dayOfWeek: dayIndex === 6 ? 0 : dayIndex + 1,
            });
          }
        }
      }

      // Prepare availability matrix
      const availabilityMatrix: any = {};
      staff.forEach(s => {
        availabilityMatrix[s.id] = {};
        weekDates.forEach((date, dayIndex) => {
          availabilityMatrix[s.id][date] = {};
          shifts.forEach(shift => {
            availabilityMatrix[s.id][date][shift.id] = isAvailable(s.id, dayIndex, shift.id);
          });
        });
      });

      // Check if ALL shifts have no available staff (complete block)
      const totalShiftsNeeded = shiftsData.length;
      let shiftsWithNoStaff = 0;
      const shiftsWithNoStaffList: string[] = [];

      for (const shiftData of shiftsData) {
        const dayIndex = weekDates.indexOf(shiftData.date);
        const availableStaff = staff.filter(s =>
          isAvailable(s.id, dayIndex, shiftData.shiftTemplateId)
        );

        if (availableStaff.length === 0) {
          shiftsWithNoStaff++;
          const dayName = dayNames[dayIndex];
          shiftsWithNoStaffList.push(`${dayName} - ${shiftData.shiftName}`);
        }
      }

      // Only block if NO shifts can be scheduled at all
      if (totalShiftsNeeded > 0 && shiftsWithNoStaff === totalShiftsNeeded) {
        showErrorModal(
          'Không thể tạo lịch',
          'Không có nhân viên nào rảnh cho tất cả các ca làm việc.',
          [
            'Quay lại Bước 1 và đánh dấu nhân viên rảnh cho các ca',
            'Hoặc giảm số lượng nhân viên yêu cầu ở Bước 2'
          ]
        );
        return;
      }

      // Show warning if SOME shifts are missing staff, but continue
      if (shiftsWithNoStaff > 0 && shiftsWithNoStaff < totalShiftsNeeded) {
        toast.warning(
          `Cảnh báo: ${shiftsWithNoStaff} ca không có đủ nhân viên. Hệ thống sẽ xếp lịch cho các ca có thể.`
        );
      }

      // Save first
      await handleSave();

      // Run algorithm
      const result = generateSmartSchedule(
        shiftsData,
        availabilityMatrix,
        staff.map(s => s.id)
      );

      setGeneratedSchedule(result);
      setStep(3); // Go to step 3 instead of showing modal

    } catch (error) {
      console.error('Error generating:', error);
      toast.error('Lỗi khi tạo lịch');
    } finally {
      setGenerating(false);
    }
  }

  // Show error modal helper
  function showErrorModal(title: string, message: string, suggestions: string[], footer?: string) {
    setErrorModal({ title, message, suggestions, footer });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 py-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-800">
              Lịch Thông Minh 🤖
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              Bước {step}/3: {step === 1 ? 'Lịch rảnh' : step === 2 ? 'Số lượng nhân viên' : 'Xem trước lịch'}
            </p>
          </div>
          <button
            onClick={goToToday}
            className="text-sm text-blue-600 hover:text-blue-700 font-semibold px-4 py-2 rounded-lg hover:bg-blue-50"
          >
            Tuần Này
          </button>
        </div>

        {/* Progress bar */}
        <div className="flex gap-2 mb-4">
          <div className={`flex-1 h-2 rounded-full ${step >= 1 ? 'bg-blue-600' : 'bg-gray-200'}`} />
          <div className={`flex-1 h-2 rounded-full ${step >= 2 ? 'bg-blue-600' : 'bg-gray-200'}`} />
          <div className={`flex-1 h-2 rounded-full ${step >= 3 ? 'bg-blue-600' : 'bg-gray-200'}`} />
        </div>

        {/* Week Picker */}
        <div ref={weekPickerRef} className="flex items-center justify-center relative">
          <button
            onClick={() => setShowWeekPicker(!showWeekPicker)}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="text-sm font-semibold text-gray-700">
              {(() => {
                const formatDM = (d: string) => {
                  const date = new Date(d);
                  return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}`;
                };
                return `${formatDM(weekDates[0])} - ${formatDM(weekDates[6])}`;
              })()}
            </span>
            <svg className={`w-4 h-4 text-gray-600 transition-transform ${showWeekPicker ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* Month Calendar Picker Dropdown */}
          {showWeekPicker && (
            <div className="absolute top-full mt-2 left-1/2 transform -translate-x-1/2 bg-white border border-gray-300 rounded-lg shadow-lg p-4 z-50 w-[320px] sm:w-[360px]">
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={() => {
                    // Just change the calendar view, don't change selected week
                    const newDate = new Date(calendarViewDate);
                    newDate.setMonth(newDate.getMonth() - 1);
                    setCalendarViewDate(newDate);
                  }}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <h3 className="text-sm font-semibold text-gray-800">
                  Tháng {calendarViewDate.getMonth() + 1}/{calendarViewDate.getFullYear()}
                </h3>
                <button
                  onClick={() => {
                    // Just change the calendar view, don't change selected week
                    const newDate = new Date(calendarViewDate);
                    newDate.setMonth(newDate.getMonth() + 1);
                    setCalendarViewDate(newDate);
                  }}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>

              {/* Calendar Grid */}
              <div className="space-y-1">
                {/* Day headers */}
                <div className="grid grid-cols-7 gap-1 mb-2">
                  {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((day) => (
                    <div key={day} className="text-xs font-semibold text-gray-600 text-center py-1">
                      {day}
                    </div>
                  ))}
                </div>

                {/* Calendar days grouped by weeks */}
                {(() => {
                  const year = calendarViewDate.getFullYear();
                  const month = calendarViewDate.getMonth();
                  const firstDay = new Date(year, month, 1);
                  const lastDay = new Date(year, month + 1, 0);

                  // Get first Monday of the calendar (might be from previous month)
                  const firstMonday = new Date(firstDay);
                  const dayOfWeek = firstDay.getDay();
                  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
                  firstMonday.setDate(firstDay.getDate() + diff);

                  const weeks = [];
                  const currentDate = new Date(firstMonday);

                  // Generate weeks - maximum 6 weeks to display (standard calendar)
                  // Stop when we've passed the last day of the month
                  while (weeks.length < 6) {
                    const weekStart = new Date(currentDate);
                    weekStart.setHours(0, 0, 0, 0); // Normalize to midnight
                    const weekDays = [];

                    // Collect 7 days for this week (Monday to Sunday)
                    for (let i = 0; i < 7; i++) {
                      weekDays.push(new Date(currentDate));
                      currentDate.setDate(currentDate.getDate() + 1);
                    }

                    // Only add this week if it contains at least one day from the current month
                    const hasCurrentMonthDay = weekDays.some(day => day.getMonth() === month);
                    if (hasCurrentMonthDay) {
                      weeks.push({ weekStart, weekDays });
                    }

                    // Stop if we've gone past the last day of the month and already have weeks
                    if (weekStart > lastDay && weeks.length > 0) {
                      break;
                    }
                  }

                  const selectedWeekStart = new Date(currentWeekStart);
                  selectedWeekStart.setHours(0, 0, 0, 0);

                  return weeks.map((week, weekIdx) => {
                    const isSelectedWeek = week.weekStart.getTime() === selectedWeekStart.getTime();

                    return (
                      <button
                        key={weekIdx}
                        onClick={() => {
                          if (setWeekStart) {
                            // Normalize the date to ensure it's set at midnight with correct day
                            const normalizedDate = new Date(week.weekStart);
                            normalizedDate.setHours(0, 0, 0, 0);
                            setWeekStart(normalizedDate);
                          } else {
                            // Fall back to navigating multiple weeks
                            const diffWeeks = Math.round((week.weekStart.getTime() - currentWeekStart.getTime()) / (7 * 24 * 60 * 60 * 1000));
                            if (diffWeeks !== 0) {
                              for (let i = 0; i < Math.abs(diffWeeks); i++) {
                                navigateWeek(diffWeeks > 0 ? 'next' : 'prev');
                              }
                            }
                          }
                          setShowWeekPicker(false);
                        }}
                        className={`grid grid-cols-7 gap-1 p-1 rounded-lg transition-colors w-full ${
                          isSelectedWeek
                            ? 'bg-blue-100 hover:bg-blue-200'
                            : 'hover:bg-gray-100'
                        }`}
                      >
                        {week.weekDays.map((day, dayIdx) => {
                          const isCurrentMonth = day.getMonth() === month;
                          const isToday = day.toDateString() === new Date().toDateString();

                          return (
                            <div
                              key={dayIdx}
                              className={`text-xs py-1 text-center rounded ${
                                isToday
                                  ? 'bg-blue-600 text-white font-bold'
                                  : isCurrentMonth
                                    ? 'text-gray-800'
                                    : 'text-gray-400'
                              }`}
                            >
                              {day.getDate()}
                            </div>
                          );
                        })}
                      </button>
                    );
                  });
                })()}
              </div>

              {/* Quick actions */}
              <div className="mt-3 pt-3 border-t border-gray-200">
                <button
                  onClick={() => {
                    goToToday();
                    setShowWeekPicker(false);
                  }}
                  className="w-full px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg font-medium"
                >
                  Tuần này
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* STEP 2: Requirements (swapped from 1) */}
      {step === 2 && (
        <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Số Lượng Nhân Viên Cần</h2>

          {/* Bulk apply */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="text-sm font-semibold text-gray-700 mb-3">Áp dụng nhanh:</div>
            <div className="flex flex-wrap gap-2 items-center">
              <input
                type="number"
                min="0"
                value={bulkApplyValue}
                onChange={(e) => setBulkApplyValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleBulkApply();
                  }
                }}
                className="w-20 px-3 py-2 border border-gray-300 rounded-lg text-center font-semibold focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="0"
              />
              <button
                onClick={handleBulkApply}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-sm transition-colors"
              >
                Áp dụng cho tất cả
              </button>
              <button
                onClick={() => bulkApplyRequirement(0)}
                className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-semibold text-sm transition-colors"
              >
                Xóa tất cả
              </button>
            </div>
          </div>

          {/* Requirements Grid */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b-2 border-gray-300">
                  <th className="text-left p-2 sm:p-3 text-gray-700 font-bold text-xs sm:text-sm sticky left-0 bg-white z-10 min-w-[80px] sm:min-w-0">
                    Ca
                  </th>
                  {dayNames.map((day, idx) => (
                    <th key={idx} className="p-1 sm:p-2 text-center text-gray-700 font-bold text-[10px] sm:text-xs w-[40px] sm:w-16">
                      {day}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {shifts.map((shift, shiftIdx) => (
                  <tr key={shift.id} className={`border-b ${shiftIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                    <td className="p-2 sm:p-3 sticky left-0 bg-inherit z-10 min-w-[80px] sm:min-w-0">
                      <div className="flex items-center gap-1 sm:gap-2">
                        <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full flex-shrink-0" style={{ backgroundColor: shift.color }} />
                        <span className="font-semibold text-xs sm:text-sm text-gray-800 truncate">{shift.name}</span>
                      </div>
                    </td>
                    {weekDates.map((_, dayIndex) => {
                      const value = getRequirement(dayIndex, shift.id);
                      return (
                        <td key={dayIndex} className="p-0.5 sm:p-2 text-center w-[40px] sm:w-16">
                          <button
                            onClick={() => {
                              const newValue = prompt('Nhập số lượng nhân viên cần:', value.toString());
                              if (newValue !== null) {
                                const num = parseInt(newValue);
                                if (!isNaN(num) && num >= 0) {
                                  setRequirement(dayIndex, shift.id, num);
                                }
                              }
                            }}
                            className="w-8 h-8 sm:w-12 sm:h-12 bg-white hover:bg-blue-50 border-2 border-gray-300 hover:border-blue-500 rounded sm:rounded-lg mx-auto font-bold text-sm sm:text-lg text-gray-800 transition-all active:scale-95"
                          >
                            {value}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Actions */}
          <div className="mt-6 flex gap-3">
            <button
              onClick={() => setStep(1)}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50"
            >
              Quay lại
            </button>
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold flex items-center justify-center gap-2"
            >
              {generating ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Đang tạo...
                </>
              ) : (
                <>
                  🤖 Tạo Lịch Tự Động
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* STEP 1: Availability (swapped from 2) */}
      {step === 1 && (
        <div className="space-y-4">
          {/* Submission Status Summary */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border-2 border-blue-200 p-4">
            <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Trạng thái gửi lịch rảnh
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-white rounded-lg p-3 text-center shadow-sm">
                <div className="text-2xl font-bold text-gray-700">{staff.length}</div>
                <div className="text-xs text-gray-600 mt-1">Tổng nhân viên</div>
              </div>
              <div className="bg-white rounded-lg p-3 text-center shadow-sm">
                <div className="text-2xl font-bold text-green-600">
                  {Object.values(submissionStatus).filter(s => s.submitted && !s.isOverride).length}
                </div>
                <div className="text-xs text-gray-600 mt-1">✅ Đã gửi</div>
              </div>
              <div className="bg-white rounded-lg p-3 text-center shadow-sm">
                <div className="text-2xl font-bold text-orange-600">
                  {Object.values(submissionStatus).filter(s => s.submitted && s.isOverride).length}
                </div>
                <div className="text-xs text-gray-600 mt-1">⚠️ Override</div>
              </div>
              <div className="bg-white rounded-lg p-3 text-center shadow-sm">
                <div className="text-2xl font-bold text-red-600">
                  {Object.values(submissionStatus).filter(s => !s.submitted).length}
                </div>
                <div className="text-xs text-gray-600 mt-1">⏳ Chưa gửi</div>
              </div>
            </div>
            <div className="mt-3 text-xs text-gray-600 bg-white/50 rounded-lg p-2">
              💡 <span className="font-semibold">Lưu ý:</span> Bạn có thể đặt lịch rảnh cho nhân viên chưa gửi. Lịch này sẽ được đánh dấu là "Override" và nhân viên sẽ được thông báo.
            </div>
          </div>

          {staff.map(staffMember => {
            const { available, total } = countStaffAvailability(staffMember.id);
            const percentage = total > 0 ? (available / total) * 100 : 0;
            const isExpanded = expandedStaff.has(staffMember.id);
            const status = submissionStatus[staffMember.id] || { submitted: false, isOverride: false };

            let badgeColor = 'bg-gray-200 text-gray-700';
            let badgeEmoji = '⚪';
            if (percentage >= 80) { badgeColor = 'bg-green-100 text-green-700'; badgeEmoji = '🟢'; }
            else if (percentage >= 50) { badgeColor = 'bg-yellow-100 text-yellow-700'; badgeEmoji = '🟡'; }
            else if (percentage > 0) { badgeColor = 'bg-orange-100 text-orange-700'; badgeEmoji = '🟠'; }
            else { badgeColor = 'bg-red-100 text-red-700'; badgeEmoji = '🔴'; }

            return (
              <div key={staffMember.id} className={`bg-white rounded-lg shadow ${status.isOverride ? 'border-2 border-orange-300' : ''}`}>
                {/* Staff Header */}
                <button
                  onClick={() => {
                    const newExpanded = new Set(expandedStaff);
                    if (isExpanded) newExpanded.delete(staffMember.id);
                    else newExpanded.add(staffMember.id);
                    setExpandedStaff(newExpanded);
                  }}
                  className="w-full p-4 flex items-center justify-between hover:bg-gray-50"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                      {staffMember.display_name.split(' ').slice(-2).map(n => n[0]).join('').toUpperCase()}
                    </div>
                    <div className="text-left">
                      <div className="flex items-center gap-2">
                        <div className="font-semibold text-gray-800">{staffMember.display_name}</div>
                        {lockedStaff.has(staffMember.id) && (
                          <svg className="w-4 h-4 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                          </svg>
                        )}
                        {status.submitted && !status.isOverride && (
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold">
                            ✅ Đã gửi
                          </span>
                        )}
                        {status.isOverride && (
                          <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-semibold">
                            ⚠️ Override
                          </span>
                        )}
                        {!status.submitted && (
                          <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-semibold">
                            ⏳ Chưa gửi
                          </span>
                        )}
                      </div>
                      <div className={`text-xs px-2 py-1 rounded-full inline-block ${badgeColor}`}>
                        {badgeEmoji} {available}/{total}
                      </div>
                    </div>
                  </div>
                  <svg
                    className={`w-5 h-5 text-gray-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Expanded Content */}
                {isExpanded && (
                  <div className="p-4 border-t border-gray-200">
                    {/* Lock/Unlock Controls */}
                    {status.submitted && !status.isOverride && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2 flex-1">
                            {lockedStaff.has(staffMember.id) ? (
                              <>
                                <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                                </svg>
                                <span className="text-xs text-blue-800 font-medium">
                                  Lịch đã khóa (dữ liệu nhân viên gửi)
                                </span>
                              </>
                            ) : (
                              <>
                                <svg className="w-5 h-5 text-orange-600" fill="currentColor" viewBox="0 0 20 20">
                                  <path d="M10 2a5 5 0 00-5 5v2a2 2 0 00-2 2v5a2 2 0 002 2h10a2 2 0 002-2v-5a2 2 0 00-2-2H7V7a3 3 0 015.905-.75 1 1 0 001.937-.5A5.002 5.002 0 0010 2z" />
                                </svg>
                                <span className="text-xs text-orange-800 font-medium">
                                  Đã mở khóa - Có thể chỉnh sửa
                                </span>
                              </>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => toggleLock(staffMember.id)}
                              className={`px-3 py-1.5 rounded text-xs font-semibold transition-all ${
                                lockedStaff.has(staffMember.id)
                                  ? 'bg-orange-600 hover:bg-orange-700 text-white'
                                  : 'bg-blue-600 hover:bg-blue-700 text-white'
                              }`}
                            >
                              {lockedStaff.has(staffMember.id) ? '🔓 Mở khóa' : '🔒 Khóa lại'}
                            </button>
                            {!lockedStaff.has(staffMember.id) && (
                              <button
                                onClick={() => resetToOriginal(staffMember.id)}
                                className="px-3 py-1.5 bg-gray-500 hover:bg-gray-600 text-white rounded text-xs font-semibold"
                              >
                                ↺ Reset
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Quick Actions */}
                    <div className="bg-gray-50 rounded-lg p-3 mb-4">
                      <div className="text-xs font-semibold text-gray-600 mb-2">Áp dụng nhanh:</div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => quickApplyStaff(staffMember.id, 'all')}
                          disabled={lockedStaff.has(staffMember.id)}
                          className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Tất cả tuần
                        </button>
                        <button
                          onClick={() => quickApplyStaff(staffMember.id, 'weekdays')}
                          disabled={lockedStaff.has(staffMember.id)}
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          T2-T6
                        </button>
                        <button
                          onClick={() => quickApplyStaff(staffMember.id, 'weekends')}
                          disabled={lockedStaff.has(staffMember.id)}
                          className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          T7-CN
                        </button>
                        <button
                          onClick={() => quickApplyStaff(staffMember.id, 'clear')}
                          disabled={lockedStaff.has(staffMember.id)}
                          className="px-3 py-1.5 bg-gray-500 hover:bg-gray-600 text-white rounded text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Bỏ chọn
                        </button>
                      </div>
                    </div>

                    {/* Availability Grid */}
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr>
                            <th className="text-left text-xs font-semibold text-gray-600 p-2">Ca</th>
                            {dayNames.map((day, idx) => (
                              <th key={idx} className="text-center text-xs font-semibold text-gray-600 p-2">
                                {day}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {shifts.map(shift => (
                            <tr key={shift.id} className="border-t border-gray-100">
                              <td className="p-2">
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: shift.color }} />
                                  <span className="text-xs font-medium text-gray-700">{shift.name}</span>
                                </div>
                              </td>
                              {weekDates.map((_, dayIndex) => {
                                const checked = isAvailable(staffMember.id, dayIndex, shift.id);
                                const isLocked = lockedStaff.has(staffMember.id);
                                return (
                                  <td key={dayIndex} className="p-2 text-center">
                                    <button
                                      onClick={() => !isLocked && toggleAvailability(staffMember.id, dayIndex, shift.id)}
                                      disabled={isLocked}
                                      className={`w-full h-8 flex items-center justify-center ${isLocked ? 'cursor-not-allowed opacity-50' : ''}`}
                                    >
                                      {checked ? (
                                        <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                        </svg>
                                      ) : (
                                        <svg className="w-5 h-5 text-gray-300" fill="currentColor" viewBox="0 0 20 20">
                                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm0-2a6 6 0 100-12 6 6 0 000 12z" clipRule="evenodd" />
                                        </svg>
                                      )}
                                    </button>
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* Actions */}
          <div className="flex gap-3 mt-6">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold"
            >
              {saving ? 'Đang lưu...' : 'Lưu & Tiếp tục'}
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: Preview Schedule */}
      {step === 3 && generatedSchedule && (
        <Step3PreviewContent
          generatedSchedule={generatedSchedule}
          staff={staff}
          shifts={shifts}
          weekDates={weekDates}
          storeId={storeId}
          weekStartStr={weekStartStr}
          dayNames={dayNames}
          onBack={() => setStep(2)}
          onApplied={() => {
            setStep(1);
            onScheduleApplied();
          }}
          toast={toast}
        />
      )}

      {/* Error Modal */}
      {errorModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-md w-full p-6">
            {/* Icon and Title */}
            <div className="flex items-start gap-3 mb-4">
              <div className="flex-shrink-0 w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-gray-900 mb-1">{errorModal.title}</h3>
                <p className="text-sm text-gray-600">{errorModal.message}</p>
              </div>
            </div>

            {/* Suggestions */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <div className="text-sm font-semibold text-blue-900 mb-2">💡 Giải pháp:</div>
              <ul className="space-y-2">
                {errorModal.suggestions.map((suggestion, idx) => (
                  <li key={idx} className="text-sm text-blue-800 flex gap-2">
                    <span className="flex-shrink-0">•</span>
                    <span>{suggestion}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Footer message if any */}
            {errorModal.footer && (
              <p className="text-xs text-gray-500 mb-4 italic">{errorModal.footer}</p>
            )}

            {/* Close Button */}
            <button
              onClick={() => setErrorModal(null)}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg font-semibold transition-colors"
            >
              Đã hiểu
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Step 3 Preview Component
function Step3PreviewContent({
  generatedSchedule,
  staff,
  shifts,
  weekDates,
  storeId,
  weekStartStr,
  dayNames,
  onBack,
  onApplied,
  toast,
}: {
  generatedSchedule: any;
  staff: Staff[];
  shifts: ShiftTemplate[];
  weekDates: string[];
  storeId: string;
  weekStartStr: string;
  dayNames: string[];
  onBack: () => void;
  onApplied: () => void;
  toast: any;
}) {
  const [applying, setApplying] = useState(false);
  const [viewMode, setViewMode] = useState<'staff-rows' | 'date-rows'>('staff-rows');
  const [showHelp, setShowHelp] = useState<string | null>(null);
  const helpRef = useRef<HTMLDivElement>(null);

  const { assignments, warnings, stats, staffHours, staffShiftCount } = generatedSchedule;

  // Close help tooltip when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (helpRef.current && !helpRef.current.contains(event.target as Node)) {
        setShowHelp(null);
      }
    }

    if (showHelp) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showHelp]);

  // Get staff member by ID
  const getStaff = (staffId: string) => staff.find(s => s.id === staffId);

  // Get shift by ID
  const getShift = (shiftId: string) => shifts.find(s => s.id === shiftId);

  // Get assignments for staff on date
  const getAssignments = (staffId: string, date: string): string[] => {
    return assignments[staffId]?.[date] || [];
  };

  // Apply the generated schedule
  async function handleApply() {
    try {
      setApplying(true);

      // Create schedule generation record
      const { data: generationData, error: genError } = await supabase
        .from('schedule_generations')
        .insert([
          {
            store_id: storeId,
            week_start_date: weekStartStr,
            total_shifts_required: stats.totalShiftsRequired,
            total_shifts_filled: stats.totalShiftsFilled,
            coverage_percent: stats.coveragePercent,
            fairness_score: stats.fairnessScore,
            total_warnings: warnings.length,
            is_accepted: true,
            accepted_at: new Date().toISOString(),
          },
        ])
        .select()
        .single();

      if (genError) throw genError;

      // Prepare schedule records
      const scheduleRecords = [];
      for (const staffId of Object.keys(assignments)) {
        for (const date of Object.keys(assignments[staffId])) {
          const shiftIds = assignments[staffId][date] || [];
          for (const shiftId of shiftIds) {
            scheduleRecords.push({
              staff_id: staffId,
              store_id: storeId,
              shift_template_id: shiftId,
              scheduled_date: date,
              generation_id: generationData.id,
            });
          }
        }
      }

      // Delete existing schedules for this week
      const weekEnd = new Date(weekStartStr);
      weekEnd.setDate(weekEnd.getDate() + 6);

      await supabase
        .from('staff_schedules')
        .delete()
        .eq('store_id', storeId)
        .gte('scheduled_date', weekStartStr)
        .lte('scheduled_date', weekEnd.toISOString().split('T')[0]);

      // Insert new schedules
      if (scheduleRecords.length > 0) {
        const { error: schedError } = await supabase
          .from('staff_schedules')
          .insert(scheduleRecords);

        if (schedError) throw schedError;
      }

      toast.success(`Đã áp dụng lịch! ${stats.totalShiftsFilled}/${stats.totalShiftsRequired} ca được xếp`);
      onApplied();

    } catch (error) {
      console.error('Error applying schedule:', error);
      toast.error('Lỗi khi áp dụng lịch');
    } finally {
      setApplying(false);
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6">
      {/* All Content in One Page */}
      <div className="space-y-6">
        {/* Stats Section */}
        <div>
          <h3 className="text-lg font-bold text-gray-800 mb-4">Thống Kê</h3>
          <div>
            {/* Statistics Cards */}
            <div ref={helpRef} className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
              {/* Độ Phủ */}
              <div className="bg-blue-50 rounded-lg p-3 relative">
                <div className="flex items-center gap-1 mb-1">
                  <div className="text-xs text-gray-600">Độ Phủ</div>
                  <button
                    onClick={() => setShowHelp(showHelp === 'coverage' ? null : 'coverage')}
                    className="text-blue-600 hover:text-blue-700 transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </button>
                </div>
                {showHelp === 'coverage' && (
                  <div className="absolute z-50 top-full left-0 mt-1 bg-white border border-blue-300 rounded-lg shadow-lg p-3 text-xs text-gray-700 w-48 sm:w-64 max-w-[calc(100vw-2rem)]">
                    <p className="font-semibold text-blue-700 mb-1">Độ Phủ</p>
                    <p>Tỷ lệ phần trăm (%) ca làm việc được xếp thành công so với tổng số ca cần xếp. Độ phủ càng cao thì lịch càng đầy đủ.</p>
                  </div>
                )}
                <div className="text-2xl font-bold text-blue-600">{stats.coveragePercent}%</div>
                <div className="text-xs text-gray-500">{stats.totalShiftsFilled}/{stats.totalShiftsRequired} ca</div>
              </div>

              {/* Công Bằng */}
              <div className="bg-green-50 rounded-lg p-3 relative">
                <div className="flex items-center gap-1 mb-1">
                  <div className="text-xs text-gray-600">Công Bằng</div>
                  <button
                    onClick={() => setShowHelp(showHelp === 'fairness' ? null : 'fairness')}
                    className="text-green-600 hover:text-green-700 transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </button>
                </div>
                {showHelp === 'fairness' && (
                  <div className="absolute z-50 top-full right-0 mt-1 bg-white border border-green-300 rounded-lg shadow-lg p-3 text-xs text-gray-700 w-48 sm:w-64 max-w-[calc(100vw-2rem)]">
                    <p className="font-semibold text-green-700 mb-1">Độ Công Bằng</p>
                    <p>Điểm đánh giá mức độ cân bằng giờ làm việc giữa các nhân viên. Điểm càng cao (gần 100) thì việc phân bổ ca càng công bằng, tránh người làm nhiều người làm ít.</p>
                  </div>
                )}
                <div className="text-2xl font-bold text-green-600">{stats.fairnessScore}/100</div>
                <div className="text-xs text-gray-500">Điểm công bằng</div>
              </div>

              {/* Giờ Trung Bình */}
              <div className="bg-purple-50 rounded-lg p-3 relative">
                <div className="flex items-center gap-1 mb-1">
                  <div className="text-xs text-gray-600">Giờ TB</div>
                  <button
                    onClick={() => setShowHelp(showHelp === 'hours' ? null : 'hours')}
                    className="text-purple-600 hover:text-purple-700 transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </button>
                </div>
                {showHelp === 'hours' && (
                  <div className="absolute z-50 top-full left-0 mt-1 bg-white border border-purple-300 rounded-lg shadow-lg p-3 text-xs text-gray-700 w-48 sm:w-64 max-w-[calc(100vw-2rem)]">
                    <p className="font-semibold text-purple-700 mb-1">Giờ Trung Bình</p>
                    <p>Số giờ làm việc trung bình mỗi nhân viên trong tuần. Khoảng nhỏ nhất - lớn nhất cho biết người làm ít nhất và nhiều nhất có bao nhiêu giờ.</p>
                  </div>
                )}
                <div className="text-2xl font-bold text-purple-600">{stats.avgHoursPerStaff}h</div>
                <div className="text-xs text-gray-500">{stats.minHours}h - {stats.maxHours}h</div>
              </div>

              {/* Cảnh Báo */}
              <div className="bg-orange-50 rounded-lg p-3 relative">
                <div className="flex items-center gap-1 mb-1">
                  <div className="text-xs text-gray-600">Cảnh Báo</div>
                  <button
                    onClick={() => setShowHelp(showHelp === 'warnings' ? null : 'warnings')}
                    className="text-orange-600 hover:text-orange-700 transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </button>
                </div>
                {showHelp === 'warnings' && (
                  <div className="absolute z-50 top-full right-0 mt-1 bg-white border border-orange-300 rounded-lg shadow-lg p-3 text-xs text-gray-700 w-48 sm:w-64 max-w-[calc(100vw-2rem)]">
                    <p className="font-semibold text-orange-700 mb-1">Cảnh Báo</p>
                    <p>Số vấn đề tiềm ẩn được phát hiện trong lịch (vd: ca thiếu người, nhân viên làm quá nhiều giờ, làm liên tục nhiều ngày). Kiểm tra chi tiết bên dưới để xem cụ thể.</p>
                  </div>
                )}
                <div className="text-2xl font-bold text-orange-600">{warnings.length}</div>
                <div className="text-xs text-gray-500">Vấn đề phát hiện</div>
              </div>
            </div>

            {/* Warnings List */}
            {warnings.length > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex gap-2 mb-2">
                  <svg className="w-5 h-5 text-yellow-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <div className="flex-1">
                    <div className="font-semibold text-yellow-800 text-sm mb-2">Cảnh báo ({warnings.length}):</div>
                    <div className="space-y-1 max-h-64 overflow-y-auto">
                      {warnings.map((warning: any, idx: number) => (
                        <div
                          key={idx}
                          className={`text-xs px-2 py-1 rounded ${
                            warning.severity === 'critical'
                              ? 'bg-red-100 text-red-800'
                              : warning.severity === 'warning'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {warning.message}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Schedule Section */}
        <div>
          <h3 className="text-lg font-bold text-gray-800 mb-4">Lịch Làm Việc</h3>
          <div>
            {/* View Toggle & Legend */}
            <div className="mb-4 space-y-3">
              {/* Toggle Button */}
              <div className="flex justify-end">
                <div className="inline-flex rounded-lg border border-gray-300 bg-white p-1">
                  <button
                    onClick={() => setViewMode('staff-rows')}
                    className={`px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-all ${
                      viewMode === 'staff-rows'
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    NV theo hàng
                  </button>
                  <button
                    onClick={() => setViewMode('date-rows')}
                    className={`px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-all ${
                      viewMode === 'date-rows'
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    Ngày theo hàng
                  </button>
                </div>
              </div>

              {/* Legend */}
              <div className="flex flex-wrap gap-2 sm:gap-3 bg-gray-50 p-2 sm:p-3 rounded-lg">
                {shifts.map(shift => (
                  <div key={shift.id} className="flex items-center gap-1 sm:gap-2">
                    <div
                      className="w-3 h-3 sm:w-4 sm:h-4 rounded"
                      style={{ backgroundColor: shift.color }}
                    />
                    <span className="text-xs font-medium text-gray-700">{shift.name}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto -mx-4 sm:-mx-6 px-4 sm:px-6">
              {viewMode === 'staff-rows' ? (
                // Staff as Rows
                <table className="w-full border-collapse min-w-full">
                  <thead>
                    <tr className="border-b-2 border-gray-300">
                      <th className="text-left p-2 sm:p-3 text-gray-700 font-bold text-xs sm:text-sm border-r border-gray-200 sticky left-0 bg-white z-30 shadow-[2px_0_4px_rgba(0,0,0,0.05)] w-16 sm:w-auto">
                        <div className="whitespace-nowrap text-xs sm:text-sm">NV</div>
                      </th>
                      {weekDates.map((date, dayIndex) => (
                        <th key={date} className="p-0.5 sm:p-2 text-center border-r border-gray-200 last:border-r-0 w-[25px] sm:w-[80px]">
                          <div className="text-[9px] sm:text-xs font-semibold text-gray-600">{dayNames[dayIndex]}</div>
                          <div className="text-[8px] sm:text-xs text-gray-500">
                            {new Date(date).getDate()}/{new Date(date).getMonth() + 1}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {staff.map((staffMember, index) => (
                      <tr
                        key={staffMember.id}
                        className={`border-b border-gray-200 ${
                          index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                        }`}
                      >
                        <td className={`p-2 sm:p-3 border-r border-gray-200 sticky left-0 z-30 shadow-[2px_0_4px_rgba(0,0,0,0.05)] ${
                          index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                        }`}>
                          <div className="font-semibold text-gray-800 text-xs sm:text-sm whitespace-nowrap overflow-hidden text-ellipsis max-w-[50px] sm:max-w-none" title={staffMember.display_name}>
                            {staffMember.display_name.length > 6 ? `${staffMember.display_name.substring(0, 5)}...` : staffMember.display_name}
                          </div>
                        </td>
                        {weekDates.map((date) => {
                          const shiftIds = getAssignments(staffMember.id, date);
                          const assignedShifts = shiftIds.map(id => getShift(id)).filter(Boolean);

                          return (
                            <td
                              key={date}
                              className="p-0 sm:p-1 border-r border-gray-200 last:border-r-0 text-center align-top w-[25px] sm:w-[80px]"
                            >
                              {assignedShifts.length > 0 ? (
                                <div className="flex flex-col gap-0.5 min-h-[30px] sm:min-h-[40px] py-1">
                                  {assignedShifts.map((shift) => shift && (
                                    <div
                                      key={shift.id}
                                      className="w-full h-3 sm:h-4 rounded"
                                      style={{ backgroundColor: shift.color }}
                                      title={`${shift.name}\n${shift.start_time.substring(0, 5)} - ${shift.end_time.substring(0, 5)}`}
                                    />
                                  ))}
                                </div>
                              ) : (
                                <div className="text-gray-300 text-[10px] sm:text-xs min-h-[30px] sm:min-h-[40px] flex items-center justify-center">--</div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                // Dates as Rows
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b-2 border-gray-300">
                      <th className="text-left pl-1 pr-1 py-2 sm:pl-2 sm:pr-3 sm:py-3 text-gray-700 font-bold text-xs sm:text-sm border-r-2 border-gray-300 sticky left-0 bg-white z-30 w-16 sm:w-auto">
                        Ngày
                      </th>
                      {staff.map((staffMember) => (
                        <th key={staffMember.id} className="p-1 sm:p-3 text-center border-r border-gray-200 last:border-r-0 min-w-[60px] sm:min-w-[120px]">
                          <div className="font-semibold text-gray-800 text-xs sm:text-sm truncate">
                            {staffMember.display_name}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {weekDates.map((date, dayIndex) => (
                      <tr
                        key={date}
                        className={`border-b border-gray-200 ${
                          dayIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                        }`}
                      >
                        <td className={`pl-1 pr-1 py-2 sm:pl-2 sm:pr-3 sm:py-3 border-r-2 border-gray-300 sticky left-0 z-30 w-16 sm:w-auto ${
                          dayIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                        }`}>
                          <div className="font-semibold text-gray-800 text-xs sm:text-sm whitespace-nowrap">
                            {dayNames[dayIndex].slice(0, 2)}
                          </div>
                          <div className="text-xs text-gray-500 whitespace-nowrap">
                            {new Date(date).getDate()}/{new Date(date).getMonth() + 1}
                          </div>
                        </td>
                        {staff.map((staffMember) => {
                          const shiftIds = getAssignments(staffMember.id, date);
                          const assignedShifts = shiftIds.map(id => getShift(id)).filter(Boolean);

                          return (
                            <td
                              key={staffMember.id}
                              className="p-1 sm:p-2 border-r border-gray-200 last:border-r-0 text-center align-middle"
                            >
                              {assignedShifts.length > 0 ? (
                                <div className="flex flex-col gap-1">
                                  {assignedShifts.map((shift) => shift && (
                                    <div
                                      key={shift.id}
                                      className="px-1 sm:px-2 py-0.5 sm:py-1 rounded text-[10px] sm:text-xs font-medium text-white"
                                      style={{ backgroundColor: shift.color }}
                                    >
                                      {shift.name}
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="text-red-500 text-[10px] sm:text-xs font-medium bg-red-50 py-0.5 sm:py-1 px-1 sm:px-2 rounded">
                                  OFF
                                </div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        {/* Distribution Section */}
        <div>
          <h3 className="text-lg font-bold text-gray-800 mb-4">Phân Bổ</h3>
          <div>
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-semibold text-gray-800 text-sm mb-3">Phân Bổ Công Việc:</h4>
              <div className="space-y-3">
                {staff.map((staffMember) => {
                  const hours = staffHours[staffMember.id] || 0;
                  const shiftCount = staffShiftCount[staffMember.id] || 0;
                  const maxHours = Math.max(...Object.values(staffHours).map(h => Number(h) || 0));
                  const percentage = maxHours > 0 ? (hours / maxHours) * 100 : 0;

                  return (
                    <div key={staffMember.id} className="space-y-1">
                      {/* Name and Stats Row */}
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-medium text-gray-700 truncate" title={staffMember.display_name}>
                          {staffMember.display_name}
                        </div>
                        <div className="text-xs font-semibold text-gray-700 ml-2">
                          {shiftCount} ca, {hours}h
                        </div>
                      </div>
                      {/* Progress Bar */}
                      <div className="bg-gray-200 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-blue-500 to-blue-600 h-full transition-all"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 mt-6">
        <button
          onClick={onBack}
          className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50"
        >
          Quay lại
        </button>
        <button
          onClick={handleApply}
          disabled={applying}
          className="flex-1 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {applying ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Đang Áp Dụng...
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Chấp Nhận & Áp Dụng
            </>
          )}
        </button>
      </div>
    </div>
  );
}
