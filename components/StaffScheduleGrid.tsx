import { useState } from 'react';
import { Staff, ShiftTemplate, ScheduleWithDetails } from '@/types';

interface StaffScheduleGridProps {
  staff: Staff[];
  shifts: ShiftTemplate[];
  schedules: ScheduleWithDetails[];
  currentWeekStart: Date;
  navigateWeek: (direction: 'prev' | 'next') => void;
  goToToday: () => void;
  getWeekDays: () => Date[];
  formatDateSchedule: (date: Date) => string;
  openAssignModal: (shift: ShiftTemplate, date: Date) => void;
  handleRemoveStaffFromShift?: (scheduleId: string, staffName: string) => void;
  handleAssignShift?: (staffId: string, shiftId: string, date: string) => Promise<void>;
  copyPreviousWeek: () => void;
  selectedItem: { type: 'day' | 'staff'; id: string; date?: Date } | null;
  setSelectedItem: (item: { type: 'day' | 'staff'; id: string; date?: Date } | null) => void;
  clipboard: { type: 'day' | 'staff'; schedules: ScheduleWithDetails[] } | null;
  handleToolbarCopy: () => void;
  handleToolbarPaste: () => void;
  handleToolbarClear: () => void;
  viewMode: 'staff-based' | 'date-rows';
  handleViewModeChange: (mode: 'staff-based' | 'date-rows') => void;
}

export default function StaffScheduleGrid({
  staff,
  shifts,
  schedules,
  currentWeekStart,
  navigateWeek,
  goToToday,
  getWeekDays,
  formatDateSchedule,
  openAssignModal,
  handleRemoveStaffFromShift,
  handleAssignShift,
  copyPreviousWeek,
  selectedItem,
  setSelectedItem,
  clipboard,
  handleToolbarCopy,
  handleToolbarPaste,
  handleToolbarClear,
  viewMode,
  handleViewModeChange,
}: StaffScheduleGridProps) {
  const [selectedCell, setSelectedCell] = useState<{ staffId: string; date: string } | null>(null);

  const today = formatDateSchedule(new Date());
  const weekDays = getWeekDays();

  // Format week range as dd/mm - dd/mm
  const formatDayMonth = (date: Date) => {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    return `${day}/${month}`;
  };
  const weekRangeStr = `${formatDayMonth(weekDays[0])} - ${formatDayMonth(weekDays[6])}`;

  // Get all shifts for a staff member on a specific date
  const getStaffShiftsForDate = (staffId: string, date: Date): ScheduleWithDetails[] => {
    const dateStr = formatDateSchedule(date);
    return schedules.filter(
      s => s.staff_id === staffId && s.scheduled_date === dateStr
    );
  };

  // Handle cell click - always show the selection modal
  const handleCellClick = (staffId: string, date: Date) => {
    const dateStr = formatDateSchedule(date);
    setSelectedCell({ staffId, date: dateStr });
  };

  return (
    <div>
      {/* Header */}
      <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6 mb-6">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Lịch Làm Việc</h1>
          <button
            onClick={goToToday}
            className="text-sm text-blue-600 hover:text-blue-700 font-semibold px-4 py-2 rounded-lg hover:bg-blue-50 transition-all"
          >
            Hôm nay
          </button>
        </div>

        {/* Week Navigation */}
        <div className="flex items-center justify-between gap-4">
          <button
            onClick={() => navigateWeek('prev')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-all"
          >
            <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="text-center">
            <div className="text-sm font-semibold text-gray-700 mb-2">{weekRangeStr}</div>
            <button
              onClick={copyPreviousWeek}
              className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-md text-xs font-medium transition-all shadow-sm hover:shadow-md"
            >
              Sao Chép Tuần Trước
            </button>
          </div>
          <button
            onClick={() => navigateWeek('next')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-all"
          >
            <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

      </div>

      {/* View Toggle + Toolbar */}
      <div className="mb-4">
        <div className="flex items-center gap-3">
          {/* View Toggle */}
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => handleViewModeChange('staff-based')}
              className={`p-2 rounded-md transition-all ${
                viewMode === 'staff-based'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:bg-gray-200'
              }`}
              title="Nhân viên theo cột"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </button>
            <button
              onClick={() => handleViewModeChange('date-rows')}
              className={`p-2 rounded-md transition-all ${
                viewMode === 'date-rows'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:bg-gray-200'
              }`}
              title="Ngày theo hàng"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </button>
          </div>

          {/* Divider */}
          <div className="h-6 w-px bg-gray-300"></div>

          {/* Toolbar Buttons */}
          <div className="flex gap-1">
          <button
            onClick={handleToolbarCopy}
            disabled={!selectedItem}
            className="flex items-center gap-1 px-2 py-1.5 rounded-md text-xs font-medium transition-all
              bg-blue-100 text-blue-700 hover:bg-blue-200
              disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            <span>Sao chép</span>
          </button>

          <button
            onClick={handleToolbarPaste}
            disabled={!clipboard || !selectedItem}
            className="flex items-center gap-1 px-2 py-1.5 rounded-md text-xs font-medium transition-all
              bg-green-100 text-green-700 hover:bg-green-200
              disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span>Dán</span>
          </button>

          <button
            onClick={handleToolbarClear}
            disabled={!selectedItem}
            className="flex items-center gap-1 px-2 py-1.5 rounded-md text-xs font-medium transition-all
              bg-red-100 text-red-700 hover:bg-red-200
              disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            <span>Xóa</span>
          </button>
          </div>
        </div>
      </div>

      {/* Schedule Grid */}
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        {/* Desktop/Tablet View */}
        <div className="hidden sm:block">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gradient-to-r from-blue-600 to-indigo-600">
                <th className="text-left px-3 py-2 text-white font-bold text-sm border-r border-blue-500 sticky left-0 bg-gradient-to-r from-blue-600 to-indigo-600 z-10 w-32">
                  Nhân viên
                </th>
                {weekDays.map((day) => {
                  const isToday = formatDateSchedule(day) === today;
                  const dayNames = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
                  const dateStr = formatDateSchedule(day);
                  const isSelected = selectedItem?.type === 'day' && selectedItem?.id === dateStr;

                  return (
                    <th key={day.toISOString()} className="px-2 py-2 text-center border-r border-blue-500 last:border-r-0">
                      <button
                        onClick={() => {
                          if (isSelected) {
                            setSelectedItem(null);
                          } else {
                            setSelectedItem({ type: 'day', id: dateStr, date: day });
                          }
                        }}
                        className={`w-full px-2 py-1 rounded transition-all text-sm ${
                          isSelected
                            ? 'bg-blue-600 text-white font-bold shadow-md ring-2 ring-blue-400'
                            : isToday
                            ? 'bg-yellow-100 text-gray-900 font-bold hover:bg-yellow-200'
                            : 'text-white font-semibold hover:bg-blue-700'
                        }`}
                      >
                        <div className="text-xs">{dayNames[day.getDay() === 0 ? 6 : day.getDay() - 1]}</div>
                        <div className="text-sm font-bold">
                          {day.getDate()}
                        </div>
                      </button>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {staff.map((staffMember, index) => {
                const isSelected = selectedItem?.type === 'staff' && selectedItem?.id === staffMember.id;

                return (
                  <tr
                    key={staffMember.id}
                    className={`border-b border-gray-200 ${
                      isSelected
                        ? 'bg-blue-100'
                        : index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                    } hover:bg-blue-50`}
                  >
                    {/* Staff Name Column - Clickable */}
                    <td className={`px-2 py-2 border-r border-gray-200 sticky left-0 z-10 ${
                      isSelected
                        ? 'bg-blue-100'
                        : index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                    }`}>
                      <button
                        onClick={() => {
                          if (isSelected) {
                            setSelectedItem(null);
                          } else {
                            setSelectedItem({ type: 'staff', id: staffMember.id });
                          }
                        }}
                        className={`w-full text-left px-2 py-1 rounded transition-all text-sm ${
                          isSelected
                            ? 'bg-blue-600 text-white font-bold shadow-md ring-2 ring-blue-400'
                            : 'font-semibold text-gray-800 hover:bg-blue-200'
                        }`}
                        title={staffMember.name || staffMember.full_name}
                      >
                        {staffMember.name || staffMember.full_name}
                      </button>
                    </td>

                    {/* Day Cells */}
                    {weekDays.map((day) => {
                      const dateStr = formatDateSchedule(day);
                      const isToday = dateStr === today;
                      const staffShifts = getStaffShiftsForDate(staffMember.id, day);

                      return (
                        <td
                          key={day.toISOString()}
                          className={`px-2 py-2 border-r border-gray-200 last:border-r-0 cursor-pointer hover:bg-blue-100 transition-all text-center ${
                            isToday ? 'bg-blue-50' : ''
                          }`}
                          onClick={() => handleCellClick(staffMember.id, day)}
                        >
                          <div className="flex flex-col gap-1 items-center justify-center min-h-[40px]">
                            {staffShifts.length === 0 ? (
                              <div className="text-gray-300 text-sm">--</div>
                            ) : (
                              staffShifts.map((schedule) => (
                                <div
                                  key={schedule.id}
                                  className="w-full h-3 rounded-sm max-w-[80px]"
                                  style={{ backgroundColor: schedule.shift_template?.color || '#3B82F6' }}
                                  title={schedule.shift_template?.name}
                                />
                              ))
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile View - Compact 7-day display */}
        <div className="sm:hidden">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gradient-to-r from-blue-600 to-indigo-600">
                <th className="text-left px-1 py-1 text-white font-bold text-[10px] border-r border-blue-500 sticky left-0 bg-gradient-to-r from-blue-600 to-indigo-600 z-10 w-12">
                  <div className="break-words leading-tight">Tên</div>
                </th>
                {weekDays.map((day) => {
                  const isToday = formatDateSchedule(day) === today;
                  const dayNames = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
                  const dateStr = formatDateSchedule(day);
                  const isSelected = selectedItem?.type === 'day' && selectedItem?.id === dateStr;
                  return (
                    <th key={day.toISOString()} className="px-0.5 py-1 text-center border-r border-blue-500 last:border-r-0 w-[13%]">
                      <button
                        onClick={() => {
                          if (isSelected) {
                            setSelectedItem(null);
                          } else {
                            setSelectedItem({ type: 'day', id: dateStr, date: day });
                          }
                        }}
                        className={`w-full px-0.5 py-0.5 rounded transition-all ${
                          isSelected
                            ? 'bg-blue-600 text-white ring-1 ring-blue-400'
                            : isToday
                            ? 'text-yellow-300'
                            : 'text-white hover:bg-blue-700'
                        }`}
                      >
                        <div className="text-[9px] font-bold">{dayNames[day.getDay() === 0 ? 6 : day.getDay() - 1]}</div>
                        <div className={`text-[10px] font-bold ${
                          isToday && !isSelected ? 'bg-yellow-400 text-blue-900 w-4 h-4 rounded-full flex items-center justify-center mx-auto text-[9px]' : ''
                        }`}>
                          {day.getDate()}
                        </div>
                      </button>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {staff.map((staffMember, index) => {
                const isSelected = selectedItem?.type === 'staff' && selectedItem?.id === staffMember.id;
                return (
                  <tr
                    key={staffMember.id}
                    className={`border-b border-gray-200 ${
                      isSelected
                        ? 'bg-blue-100'
                        : index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                    }`}
                  >
                    {/* Staff Name */}
                    <td className={`px-1 py-1 border-r border-gray-200 sticky left-0 z-10 ${
                      isSelected
                        ? 'bg-blue-100'
                        : index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                    }`}>
                      <button
                        onClick={() => {
                          if (isSelected) {
                            setSelectedItem(null);
                          } else {
                            setSelectedItem({ type: 'staff', id: staffMember.id });
                          }
                        }}
                        className={`w-full text-left px-1 py-0.5 rounded transition-all text-[9px] ${
                          isSelected
                            ? 'bg-blue-600 text-white font-bold shadow-sm ring-1 ring-blue-400'
                            : 'font-semibold text-gray-800 hover:bg-blue-200'
                        }`}
                        title={staffMember.name || staffMember.full_name}
                      >
                        {(() => {
                          const name = staffMember.name || staffMember.full_name;
                          const shortName = name.split(' ').slice(-2).join(' ');
                          return shortName.length > 9 ? `${shortName.substring(0, 8)}..` : shortName;
                        })()}
                      </button>
                    </td>
                  {/* Day Cells */}
                  {weekDays.map((day) => {
                    const dateStr = formatDateSchedule(day);
                    const isToday = dateStr === today;
                    const staffShifts = getStaffShiftsForDate(staffMember.id, day);

                    return (
                      <td
                        key={day.toISOString()}
                        className={`px-0.5 py-1 border-r border-gray-200 last:border-r-0 text-center ${
                          isToday ? 'bg-blue-50' : ''
                        }`}
                        onClick={() => handleCellClick(staffMember.id, day)}
                      >
                        <div className="flex flex-col gap-0.5 items-center justify-center min-h-[24px]">
                          {staffShifts.length === 0 ? (
                            <div className="text-gray-300 text-[8px]">--</div>
                          ) : (
                            staffShifts.map((schedule) => (
                              <div
                                key={schedule.id}
                                className="w-full h-2 rounded-sm"
                                style={{ backgroundColor: schedule.shift_template?.color || '#3B82F6' }}
                                title={schedule.shift_template?.name}
                              />
                            ))
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
        <div className="text-xs font-semibold text-gray-700 mb-2">Chú thích:</div>
        <div className="flex flex-wrap gap-3 text-xs">
          {shifts.map(shift => (
            <div key={shift.id} className="flex items-center gap-2">
              <div
                className="w-4 h-4 rounded"
                style={{ backgroundColor: shift.color }}
              />
              <span className="text-gray-700">{shift.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Shift Selection Modal */}
      {selectedCell && (() => {
        const staffMember = staff.find(s => s.id === selectedCell.staffId);
        const date = weekDays.find(d => formatDateSchedule(d) === selectedCell.date);
        const staffShifts = date ? getStaffShiftsForDate(selectedCell.staffId, date) : [];
        const selectedShiftIds = staffShifts.map(s => s.shift_template_id);

        const handleShiftToggle = async (shiftId: string) => {
          if (!date || !staffMember) return;

          const isSelected = selectedShiftIds.includes(shiftId);

          if (isSelected) {
            // Remove this shift
            const scheduleToRemove = staffShifts.find(s => s.shift_template_id === shiftId);
            if (scheduleToRemove && handleRemoveStaffFromShift) {
              handleRemoveStaffFromShift(scheduleToRemove.id, staffMember.name || staffMember.full_name);
            }
          } else {
            // Add this shift directly
            if (handleAssignShift) {
              await handleAssignShift(staffMember.id, shiftId, selectedCell.date);
            }
          }
        };

        return staffMember && date && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedCell(null)}
          >
            <div
              className="bg-white rounded-lg shadow-xl max-w-md w-full p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-800">Chọn Ca Làm Việc</h3>
                <button
                  onClick={() => setSelectedCell(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-3 mb-4">
                <div>
                  <div className="text-sm text-gray-600">Nhân viên</div>
                  <div className="font-semibold text-gray-800">{staffMember.name || staffMember.full_name}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Ngày</div>
                  <div className="font-semibold text-gray-800">{selectedCell.date}</div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-sm font-semibold text-gray-700 mb-3">Chọn ca:</div>
                {shifts.map((shift) => {
                  const isSelected = selectedShiftIds.includes(shift.id);
                  return (
                    <label
                      key={shift.id}
                      className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all hover:bg-gray-50 ${
                        isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleShiftToggle(shift.id)}
                        className="w-5 h-5 text-blue-600 rounded"
                      />
                      <div
                        className="w-4 h-4 rounded flex-shrink-0"
                        style={{ backgroundColor: shift.color }}
                      />
                      <div className="flex-1">
                        <div className="font-semibold text-gray-800 text-sm">
                          {shift.name}
                        </div>
                        <div className="text-xs text-gray-600">
                          {shift.start_time.substring(0, 5)} - {shift.end_time.substring(0, 5)}
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>

              <button
                onClick={() => setSelectedCell(null)}
                className="w-full mt-6 bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-3 rounded-lg font-semibold transition-all"
              >
                Đóng
              </button>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
