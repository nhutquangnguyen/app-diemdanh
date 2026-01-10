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
}: StaffScheduleGridProps) {
  const [selectedCell, setSelectedCell] = useState<{ staffId: string; date: string } | null>(null);

  const today = formatDateSchedule(new Date());
  const weekDays = getWeekDays();

  // Get color for a cell based on shift type
  const getShiftColor = (staffId: string, date: Date): string | null => {
    const dateStr = formatDateSchedule(date);
    const staffSchedules = schedules.filter(
      s => s.staff_id === staffId && s.scheduled_date === dateStr
    );

    if (staffSchedules.length === 0) return null;

    // Get the first shift's color
    const firstSchedule = staffSchedules[0];
    return firstSchedule.shift_template?.color || '#3B82F6';
  };

  // Get all shifts for a staff member on a specific date
  const getStaffShiftsForDate = (staffId: string, date: Date): ScheduleWithDetails[] => {
    const dateStr = formatDateSchedule(date);
    return schedules.filter(
      s => s.staff_id === staffId && s.scheduled_date === dateStr
    );
  };

  // Check if there's a scheduling conflict (multiple shifts)
  const hasConflict = (staffId: string, date: Date): boolean => {
    return getStaffShiftsForDate(staffId, date).length > 1;
  };

  // Handle cell click
  const handleCellClick = (staffId: string, date: Date) => {
    const dateStr = formatDateSchedule(date);
    const staffShifts = getStaffShiftsForDate(staffId, date);

    if (staffShifts.length === 0) {
      // No shift - open modal to assign one (default to first shift)
      if (shifts.length > 0) {
        openAssignModal(shifts[0], date);
      }
    } else {
      // Has shift - show details
      setSelectedCell({ staffId, date: dateStr });
    }
  };

  return (
    <div className="px-4 sm:px-6 py-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
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
            <div className="text-sm text-gray-600">Tháng {weekDays[0].getMonth() + 1}/{weekDays[0].getFullYear()}</div>
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
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-orange-500" />
              <span className="text-gray-700">Ca tối</span>
            </div>
          </div>
        </div>
      </div>

      {/* Schedule Grid */}
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        {/* Desktop View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-100 border-b border-gray-300">
                <th className="text-left p-3 text-gray-700 font-bold text-sm border-r border-gray-300 sticky left-0 bg-gray-100 z-10 w-48">
                  <div>TUẦN 1</div>
                </th>
                {weekDays.map((day) => {
                  const isToday = formatDateSchedule(day) === today;
                  const dayNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
                  const monthStr = `Tháng ${day.getMonth() + 1}`;

                  return (
                    <th
                      key={day.toISOString()}
                      className={`p-3 font-bold text-sm border-r border-gray-300 last:border-r-0 ${
                        isToday ? 'bg-blue-100 text-blue-700' : 'text-gray-700'
                      }`}
                    >
                      <div className="text-center">
                        <div className="text-xs opacity-75">{monthStr}</div>
                        <div className="text-lg">{dayNames[day.getDay()]}</div>
                        <div className="text-base">{day.getDate()}</div>
                      </div>
                    </th>
                  );
                })}
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
                  {/* Staff Name Column */}
                  <td className="p-3 border-r border-gray-300 sticky left-0 bg-inherit z-10">
                    <div>
                      <div className="font-bold text-gray-800 text-sm">
                        {staffMember.name || staffMember.full_name}
                      </div>
                      <div className="text-xs text-gray-500">{staffMember.email}</div>
                    </div>
                  </td>
                  {/* Day Cells */}
                  {weekDays.map((day) => {
                    const dateStr = formatDateSchedule(day);
                    const isToday = dateStr === today;
                    const shiftColor = getShiftColor(staffMember.id, day);
                    const hasMultipleShifts = hasConflict(staffMember.id, day);
                    const staffShifts = getStaffShiftsForDate(staffMember.id, day);

                    return (
                      <td
                        key={day.toISOString()}
                        className={`p-2 border-r border-gray-300 last:border-r-0 cursor-pointer hover:bg-blue-50 transition-all relative ${
                          isToday ? 'bg-blue-50' : ''
                        }`}
                        onClick={() => handleCellClick(staffMember.id, day)}
                      >
                        <div className="h-16 flex items-center justify-center relative">
                          {shiftColor ? (
                            <div className="relative w-full h-full flex items-center justify-center">
                              <div
                                className="w-10 h-10 rounded"
                                style={{ backgroundColor: shiftColor }}
                              />
                              {hasMultipleShifts && (
                                <div className="absolute top-0 right-0 bg-yellow-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                                  ⚠
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="text-gray-400 text-xl">--</div>
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

        {/* Mobile View */}
        <div className="md:hidden">
          {staff.map((staffMember) => (
            <div key={staffMember.id} className="border-b border-gray-200 last:border-b-0">
              {/* Staff Header */}
              <div className="bg-gray-100 px-4 py-3 font-bold text-gray-800">
                {staffMember.name || staffMember.full_name}
              </div>

              {/* Week Grid for this staff */}
              <div className="grid grid-cols-7 gap-1 p-2">
                {weekDays.map((day) => {
                  const dateStr = formatDateSchedule(day);
                  const isToday = dateStr === today;
                  const shiftColor = getShiftColor(staffMember.id, day);
                  const hasMultipleShifts = hasConflict(staffMember.id, day);
                  const dayNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

                  return (
                    <div key={day.toISOString()} className="text-center">
                      <div className={`text-xs font-semibold mb-1 ${
                        isToday ? 'text-blue-600' : 'text-gray-600'
                      }`}>
                        {dayNames[day.getDay()]}
                      </div>
                      <div className={`text-xs mb-1 ${
                        isToday ? 'text-blue-600 font-bold' : 'text-gray-500'
                      }`}>
                        {day.getDate()}
                      </div>
                      <div
                        className={`h-12 flex items-center justify-center rounded cursor-pointer hover:opacity-80 transition-all ${
                          isToday ? 'ring-2 ring-blue-400' : ''
                        }`}
                        style={{
                          backgroundColor: shiftColor || '#f3f4f6',
                        }}
                        onClick={() => handleCellClick(staffMember.id, day)}
                      >
                        {!shiftColor && (
                          <span className="text-gray-400 text-xs">--</span>
                        )}
                        {hasMultipleShifts && (
                          <span className="text-xs">⚠</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Cell Details Modal */}
      {selectedCell && (() => {
        const staffMember = staff.find(s => s.id === selectedCell.staffId);
        const date = weekDays.find(d => formatDateSchedule(d) === selectedCell.date);
        const staffShifts = date ? getStaffShiftsForDate(selectedCell.staffId, date) : [];

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
                <h3 className="text-lg font-bold text-gray-800">Chi Tiết Lịch</h3>
                <button
                  onClick={() => setSelectedCell(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <div className="text-sm text-gray-600">Nhân viên</div>
                  <div className="font-semibold text-gray-800">{staffMember.name || staffMember.full_name}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Ngày</div>
                  <div className="font-semibold text-gray-800">{selectedCell.date}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600 mb-2">Ca làm việc</div>
                  {staffShifts.length === 0 ? (
                    <div className="text-gray-500 text-sm italic">Chưa được xếp ca</div>
                  ) : (
                    <div className="space-y-2">
                      {staffShifts.map((schedule) => (
                        <div
                          key={schedule.id}
                          className="flex items-center gap-3 p-3 rounded-lg border-2"
                          style={{ borderColor: schedule.shift_template?.color }}
                        >
                          <div
                            className="w-4 h-4 rounded"
                            style={{ backgroundColor: schedule.shift_template?.color }}
                          />
                          <div className="flex-1">
                            <div className="font-semibold text-gray-800">
                              {schedule.shift_template?.name}
                            </div>
                            <div className="text-sm text-gray-600">
                              {schedule.shift_template?.start_time.substring(0, 5)} - {schedule.shift_template?.end_time.substring(0, 5)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <button
                onClick={() => {
                  setSelectedCell(null);
                  if (shifts.length > 0) {
                    openAssignModal(shifts[0], date);
                  }
                }}
                className="w-full mt-6 bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg font-semibold transition-all"
              >
                Chỉnh Sửa Lịch
              </button>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
