import { useState } from 'react';
import Link from 'next/link';
import { Staff, ShiftTemplate, ScheduleWithDetails, WeekSummary } from '@/types';
import StaffScheduleGrid from './StaffScheduleGrid';

interface StoreScheduleProps {
  storeId: string;
  staff: Staff[];
  shifts: ShiftTemplate[];
  schedules: ScheduleWithDetails[];
  currentWeekStart: Date;
  isRemoving: string | null;
  weekSummary: WeekSummary;
  copyPreviousWeek: () => void;
  navigateWeek: (direction: 'prev' | 'next') => void;
  goToToday: () => void;
  getWeekDays: () => Date[];
  formatDateSchedule: (date: Date) => string;
  formatDateDisplay: (date: Date, shortName?: boolean) => string;
  getStaffForShiftAndDate: (shiftId: string, date: Date) => ScheduleWithDetails[];
  openAssignModal: (shift: ShiftTemplate, date: Date) => void;
  handleRemoveStaffFromShift: (scheduleId: string, staffName: string) => void;
  handleAssignShift?: (staffId: string, shiftId: string, date: string) => Promise<void>;
  handleTouchStart: (e: React.TouchEvent) => void;
  handleTouchMove: (e: React.TouchEvent) => void;
  handleTouchEnd: () => void;
}

export default function StoreSchedule({
  storeId,
  staff,
  shifts,
  schedules,
  currentWeekStart,
  isRemoving,
  weekSummary,
  copyPreviousWeek,
  navigateWeek,
  goToToday,
  getWeekDays,
  formatDateSchedule,
  formatDateDisplay,
  getStaffForShiftAndDate,
  openAssignModal,
  handleRemoveStaffFromShift,
  handleAssignShift,
  handleTouchStart,
  handleTouchMove,
  handleTouchEnd,
}: StoreScheduleProps) {
  const [viewMode, setViewMode] = useState<'shift-based' | 'staff-based' | 'date-rows'>('staff-based');
  const [selectedCell, setSelectedCell] = useState<{ staffId: string; date: Date } | null>(null);
  const today = formatDateSchedule(new Date());
  const weekDays = getWeekDays();

  // Helper function to get staff schedules for a specific date
  const getStaffSchedulesForDate = (staffId: string, date: Date): ScheduleWithDetails[] => {
    const dateStr = formatDateSchedule(date);
    return schedules.filter(schedule =>
      schedule.staff_id === staffId &&
      schedule.scheduled_date === dateStr
    );
  };

  // Render view toggle component (icon-based) - positioned in left side of week navigation
  const ViewToggle = () => (
    <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
      <button
        onClick={() => setViewMode('staff-based')}
        className={`p-2 rounded-md transition-all ${
          viewMode === 'staff-based'
            ? 'bg-blue-600 text-white'
            : 'text-gray-600 hover:bg-gray-200'
        }`}
        title="Theo Nhân Viên"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </button>
      <button
        onClick={() => setViewMode('shift-based')}
        className={`p-2 rounded-md transition-all ${
          viewMode === 'shift-based'
            ? 'bg-blue-600 text-white'
            : 'text-gray-600 hover:bg-gray-200'
        }`}
        title="Theo Ca Làm"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </button>
      <button
        onClick={() => setViewMode('date-rows')}
        className={`p-2 rounded-md transition-all ${
          viewMode === 'date-rows'
            ? 'bg-blue-600 text-white'
            : 'text-gray-600 hover:bg-gray-200'
        }`}
        title="Ngày theo hàng"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      </button>
    </div>
  );

  // Show staff-based grid view
  if (viewMode === 'staff-based') {
    return (
      <div className="px-4 sm:px-6 py-6">
        <div className="mb-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-700">Chế độ xem:</h2>
            <ViewToggle />
          </div>
        </div>

        <StaffScheduleGrid
          staff={staff}
          shifts={shifts}
          schedules={schedules}
          currentWeekStart={currentWeekStart}
          navigateWeek={navigateWeek}
          goToToday={goToToday}
          getWeekDays={getWeekDays}
          formatDateSchedule={formatDateSchedule}
          openAssignModal={openAssignModal}
          handleRemoveStaffFromShift={handleRemoveStaffFromShift}
          handleAssignShift={handleAssignShift}
          copyPreviousWeek={copyPreviousWeek}
        />
      </div>
    );
  }

  // NEW: Date-rows view (Dates as rows, Staff as columns)
  if (viewMode === 'date-rows') {
    const dayNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

    return (
      <div className="px-4 sm:px-6 py-6">
        {/* View Toggle */}
        <div className="mb-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-700">Chế độ xem:</h2>
            <ViewToggle />
          </div>
        </div>

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
              <div className="text-sm font-semibold text-gray-700 mb-2">
                {(() => {
                  const formatDayMonth = (date: Date) => {
                    const day = date.getDate().toString().padStart(2, '0');
                    const month = (date.getMonth() + 1).toString().padStart(2, '0');
                    return `${day}/${month}`;
                  };
                  return `${formatDayMonth(weekDays[0])} - ${formatDayMonth(weekDays[6])}`;
                })()}
              </div>
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

        {/* Transposed Schedule Grid: Dates as Rows, Staff as Columns */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gradient-to-r from-blue-600 to-indigo-600">
                  <th className="text-left px-1 py-1.5 sm:p-3 text-white font-bold text-[9px] sm:text-sm border-r border-blue-500 sticky left-0 bg-gradient-to-r from-blue-600 to-indigo-600 z-10 w-10 sm:w-20">
                    Ngày
                  </th>
                  {staff.map((staffMember) => {
                    const name = staffMember.name || staffMember.full_name;
                    const shortName = name.split(' ').slice(-2).join(' '); // Last 2 words for mobile
                    return (
                      <th
                        key={staffMember.id}
                        className="px-1 py-1.5 sm:p-3 text-center text-white font-bold text-[9px] sm:text-sm border-r border-blue-500 w-14 sm:w-28"
                        title={name}
                      >
                        <span className="hidden sm:inline">{name}</span>
                        <span className="sm:hidden">{shortName.length > 8 ? shortName.substring(0, 7) + '.' : shortName}</span>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {weekDays.map((day, dayIndex) => {
                  const isToday = formatDateSchedule(day) === today;

                  return (
                    <tr
                      key={day.toISOString()}
                      className={`border-b border-gray-200 ${
                        dayIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                      } ${isToday ? 'bg-yellow-50' : ''}`}
                    >
                      <td className={`px-1 py-1 sm:p-3 border-r border-gray-200 sticky left-0 z-10 ${
                        dayIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                      } ${isToday ? 'bg-yellow-50' : ''}`}>
                        <div className="font-semibold text-gray-800 text-[9px] sm:text-sm">
                          {dayNames[day.getDay()]}
                        </div>
                        <div className="text-[7px] sm:text-xs text-gray-500">
                          {day.getDate()}/{day.getMonth() + 1}
                        </div>
                      </td>
                      {staff.map((staffMember) => {
                        const staffSchedules = getStaffSchedulesForDate(staffMember.id, day);

                        return (
                          <td
                            key={staffMember.id}
                            className="px-0.5 py-0.5 sm:p-2 border-r border-gray-200 text-center align-middle cursor-pointer hover:bg-blue-50 transition-all"
                            onClick={() => setSelectedCell({ staffId: staffMember.id, date: day })}
                          >
                            {staffSchedules.length > 0 ? (
                              <div className="flex flex-col gap-0.5 sm:gap-1">
                                {staffSchedules.map((schedule) => {
                                  const shift = shifts.find(s => s.id === schedule.shift_template_id);
                                  if (!shift) return null;

                                  // Get short shift name (first word or abbreviation)
                                  const getShortShiftName = (name: string) => {
                                    if (name.includes('sáng')) return 'Sáng';
                                    if (name.includes('trưa')) return 'Trưa';
                                    if (name.includes('tối')) return 'Tối';
                                    return name.split(' ')[0]; // First word
                                  };

                                  return (
                                    <div
                                      key={schedule.id}
                                      className="px-0.5 py-0.5 sm:px-2 sm:py-1 rounded text-[7px] sm:text-xs font-medium text-white whitespace-nowrap"
                                      style={{ backgroundColor: shift.color }}
                                      title={shift.name}
                                    >
                                      <span className="sm:hidden">{getShortShiftName(shift.name)}</span>
                                      <span className="hidden sm:inline">{shift.name}</span>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <div className="text-red-500 text-[7px] sm:text-xs font-bold bg-red-50 py-0.5 px-0.5 sm:py-1 sm:px-2 rounded">
                                OFF
                              </div>
                            )}
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
        <div className="mt-4 bg-white rounded-lg shadow p-4">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">Chú thích:</h4>
          <div className="flex flex-wrap gap-3">
            {shifts.map(shift => (
              <div key={shift.id} className="flex items-center gap-2">
                <div
                  className="w-4 h-4 rounded"
                  style={{ backgroundColor: shift.color }}
                />
                <span className="text-xs font-medium text-gray-700">{shift.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Shift Selection Modal */}
        {selectedCell && (() => {
          const staffMember = staff.find(s => s.id === selectedCell.staffId);
          const staffSchedules = getStaffSchedulesForDate(selectedCell.staffId, selectedCell.date);
          const selectedShiftIds = staffSchedules.map(s => s.shift_template_id);

          const handleShiftToggle = async (shiftId: string) => {
            if (!staffMember) return;

            const isSelected = selectedShiftIds.includes(shiftId);

            if (isSelected) {
              // Remove this shift
              const scheduleToRemove = staffSchedules.find(s => s.shift_template_id === shiftId);
              if (scheduleToRemove && handleRemoveStaffFromShift) {
                handleRemoveStaffFromShift(scheduleToRemove.id, staffMember.name || staffMember.full_name);
              }
            } else {
              // Add this shift
              if (handleAssignShift) {
                await handleAssignShift(staffMember.id, shiftId, formatDateSchedule(selectedCell.date));
              }
            }
          };

          return staffMember && (
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
                    <div className="font-semibold text-gray-800">{formatDateSchedule(selectedCell.date)}</div>
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

  // Original shift-based view
  return (
    <div className="px-4 sm:px-6 py-6">
      {/* View Toggle */}
      <div className="mb-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-700">Chế độ xem:</h2>
          <ViewToggle />
        </div>
      </div>

      {/* Header - Same as staff-based view */}
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
            <div className="text-sm font-semibold text-gray-700 mb-2">
              {(() => {
                const formatDayMonth = (date: Date) => {
                  const day = date.getDate().toString().padStart(2, '0');
                  const month = (date.getMonth() + 1).toString().padStart(2, '0');
                  return `${day}/${month}`;
                };
                return `${formatDayMonth(weekDays[0])} - ${formatDayMonth(weekDays[6])}`;
              })()}
            </div>
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

      {/* Schedule Grid */}
      {shifts.length === 0 ? (
        <div className="bg-white rounded-lg shadow-lg p-12 text-center">
          <p className="text-lg text-gray-600 mb-4">Chưa có ca làm việc nào được tạo</p>
          <p className="text-sm text-gray-500">Vui lòng tạo ca làm việc trong tab "Quản Lý Ca"</p>
        </div>
      ) : staff.length === 0 ? (
        <div className="bg-white rounded-lg shadow-lg p-12 text-center">
          <p className="text-lg text-gray-600 mb-4">Bạn cần thêm nhân viên trước khi xếp lịch</p>
          <Link href={`/owner/stores/${storeId}/add-staff`}>
            <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-all">
              Thêm Nhân Viên
            </button>
          </Link>
        </div>
      ) : (
        <div
          className="bg-white rounded-lg shadow-lg overflow-hidden select-none"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Desktop View */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gradient-to-r from-blue-600 to-indigo-600">
                  <th className="text-left p-4 text-white font-bold text-sm border-r border-blue-500 sticky left-0 bg-gradient-to-r from-blue-600 to-indigo-600 z-10">
                    Ca Làm Việc
                  </th>
                  {weekDays.map((day) => {
                    const isToday = formatDateSchedule(day) === today;
                    return (
                      <th
                        key={day.toISOString()}
                        className={`p-4 text-white font-bold text-sm border-r border-blue-500 ${
                          isToday ? 'bg-yellow-500' : ''
                        }`}
                      >
                        <div className="text-center">
                          <div>{formatDateDisplay(day, true)}</div>
                          <div className="text-xs font-normal opacity-90">
                            {day.getDate()}/{day.getMonth() + 1}
                          </div>
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {shifts.map((shift, shiftIndex) => (
                  <tr
                    key={shift.id}
                    className={shiftIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                  >
                    {/* Shift Info Column */}
                    <td className="p-4 border-b border-r border-gray-200 sticky left-0 bg-white z-10">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-1 h-12 rounded-full flex-shrink-0"
                          style={{ backgroundColor: shift.color }}
                        />
                        <div>
                          <div className="font-bold text-gray-800 text-sm">
                            {shift.name}
                          </div>
                          <div className="text-xs text-gray-600">
                            {shift.start_time.substring(0, 5)} - {shift.end_time.substring(0, 5)}
                          </div>
                        </div>
                      </div>
                    </td>
                    {/* Day Cells */}
                    {weekDays.map((day) => {
                      const assignedStaff = getStaffForShiftAndDate(shift.id, day);
                      const isToday = formatDateSchedule(day) === today;

                      return (
                        <td
                          key={day.toISOString()}
                          className={`p-2 border-b border-r border-gray-200 align-top ${
                            isToday ? 'bg-yellow-50' : ''
                          }`}
                        >
                          <div
                            onClick={() => openAssignModal(shift, day)}
                            className="w-full min-h-[80px] p-2 rounded-lg hover:bg-blue-50 transition-all border-2 border-dashed border-gray-300 hover:border-blue-400 group cursor-pointer"
                          >
                            {assignedStaff.length === 0 ? (
                              <div className="flex flex-col items-center justify-center text-gray-400 group-hover:text-blue-600">
                                <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                </svg>
                                <span className="text-xs font-semibold">Thêm</span>
                              </div>
                            ) : (
                              <div className="space-y-1">
                                {assignedStaff.map((schedule) => {
                                  const staffMember = staff.find(s => s.id === schedule.staff_id);
                                  if (!staffMember) return null;

                                  return (
                                    <div
                                      key={schedule.id}
                                      className="group/badge relative bg-blue-100 px-2 py-1.5 rounded text-left"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <div className="flex items-center justify-between gap-1">
                                        <div className="flex items-center gap-1.5 flex-1 min-w-0">
                                          <div className="w-5 h-5 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
                                            {(staffMember.name || staffMember.full_name)?.split(' ').slice(-2).map(n => n[0]).join('').toUpperCase() || '??'}
                                          </div>
                                          <span className="text-xs font-semibold text-gray-800 truncate">
                                            {staffMember.name || staffMember.full_name}
                                          </span>
                                        </div>
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleRemoveStaffFromShift(schedule.id, staffMember.name || staffMember.full_name || '');
                                          }}
                                          disabled={isRemoving === schedule.id}
                                          className="opacity-0 group-hover/badge:opacity-100 transition-opacity hover:bg-red-100 rounded p-0.5 disabled:opacity-50 flex-shrink-0"
                                          title="Xóa"
                                        >
                                          {isRemoving === schedule.id ? (
                                            <div className="w-3 h-3 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
                                          ) : (
                                            <svg className="w-3 h-3 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                                              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                            </svg>
                                          )}
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile View - Swipeable Days */}
          <div className="lg:hidden">
            {weekDays.map((day) => (
              <div key={day.toISOString()} className="border-b border-gray-200 last:border-b-0">
                {/* Day Header */}
                <div className={`px-4 py-3 ${
                  formatDateSchedule(day) === today
                    ? 'bg-yellow-500 text-white'
                    : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white'
                }`}>
                  <div className="font-bold text-base">
                    {formatDateDisplay(day)}
                  </div>
                </div>

                {/* Shifts for this day */}
                <div className="p-3 space-y-3">
                  {shifts.map((shift) => {
                    const assignedStaff = getStaffForShiftAndDate(shift.id, day);

                    return (
                      <div key={shift.id} className="border-2 border-gray-200 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2 flex-1">
                            <div
                              className="w-1 h-10 rounded-full"
                              style={{ backgroundColor: shift.color }}
                            />
                            <div>
                              <div className="font-bold text-gray-800 text-sm">
                                {shift.name}
                              </div>
                              <div className="text-xs text-gray-600">
                                {shift.start_time.substring(0, 5)} - {shift.end_time.substring(0, 5)}
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={() => openAssignModal(shift, day)}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold"
                          >
                            Thêm
                          </button>
                        </div>

                        {assignedStaff.length > 0 && (
                          <div className="space-y-1">
                            {assignedStaff.map((schedule) => {
                              const staffMember = staff.find(s => s.id === schedule.staff_id);
                              if (!staffMember) return null;

                              return (
                                <div
                                  key={schedule.id}
                                  className="group/badge bg-gray-100 px-3 py-2 rounded-lg flex items-center justify-between"
                                >
                                  <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                                      {(staffMember.name || staffMember.full_name)?.split(' ').slice(-2).map(n => n[0]).join('').toUpperCase() || '??'}
                                    </div>
                                    <span className="text-sm font-semibold text-gray-800">
                                      {staffMember.name || staffMember.full_name}
                                    </span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveStaffFromShift(schedule.id, staffMember.name || staffMember.full_name || '')}
                                    disabled={isRemoving === schedule.id}
                                    className="hover:bg-red-100 rounded p-1 disabled:opacity-50"
                                  >
                                    {isRemoving === schedule.id ? (
                                      <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
                                    ) : (
                                      <svg className="w-4 h-4 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                      </svg>
                                    )}
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
