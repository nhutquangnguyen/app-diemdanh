'use client';

import { useState } from 'react';
import { Staff, CheckIn, ShiftTemplate, ScheduleWithDetails, Store } from '@/types';

interface StoreTodayProps {
  store: Store;
  staff: Staff[];
  todayCheckIns: CheckIn[];
  shifts: ShiftTemplate[];
  todaySchedules: ScheduleWithDetails[];
  staffFilter: 'all' | 'working' | 'late' | 'not_checked';
  staffSearch: string;
  expandedStaff: Set<string>;
  setStaffFilter: (filter: 'all' | 'working' | 'late' | 'not_checked') => void;
  setStaffSearch: (search: string) => void;
  toggleStaffExpand: (staffId: string) => void;
}

interface StaffWithStatus {
  staff: Staff;
  schedule: ScheduleWithDetails;
  checkIn?: CheckIn;
  status: 'on_time' | 'late' | 'absent';
  lateMinutes?: number;
}

export default function StoreToday({
  store,
  staff,
  todayCheckIns,
  shifts,
  todaySchedules,
  staffFilter,
  staffSearch,
  expandedStaff,
  setStaffFilter,
  setStaffSearch,
  toggleStaffExpand,
}: StoreTodayProps) {
  const [expandedShifts, setExpandedShifts] = useState<Set<string>>(new Set());
  const [selectedCheckIn, setSelectedCheckIn] = useState<CheckIn | null>(null);

  // Get current time
  const now = new Date();
  const currentTimeMinutes = now.getHours() * 60 + now.getMinutes();

  // Helper function to convert HH:mm:ss to minutes
  const timeToMinutes = (time: string): number => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  };

  // Helper function to calculate late minutes
  const calculateLateMinutes = (
    checkInTime: string,
    shiftStartTime: string,
    gracePeriodMinutes: number
  ): number => {
    const checkIn = new Date(checkInTime);
    const [shiftHour, shiftMin] = shiftStartTime.split(':').map(Number);

    const shiftStart = new Date(checkIn);
    shiftStart.setHours(shiftHour, shiftMin, 0, 0);

    const diffMs = checkIn.getTime() - shiftStart.getTime();
    const diffMinutes = Math.floor(diffMs / 1000 / 60);

    if (diffMinutes <= gracePeriodMinutes) {
      return 0;
    }

    return diffMinutes - gracePeriodMinutes;
  };

  // Determine if a shift is currently active
  const isShiftActive = (shift: ShiftTemplate): boolean => {
    const startMinutes = timeToMinutes(shift.start_time);
    const endMinutes = timeToMinutes(shift.end_time);

    // Handle shifts that cross midnight
    if (endMinutes < startMinutes) {
      return currentTimeMinutes >= startMinutes || currentTimeMinutes <= endMinutes;
    }

    return currentTimeMinutes >= startMinutes && currentTimeMinutes <= endMinutes;
  };

  // Determine shift status
  const getShiftStatus = (shift: ShiftTemplate): 'active' | 'upcoming' | 'completed' => {
    const startMinutes = timeToMinutes(shift.start_time);
    const endMinutes = timeToMinutes(shift.end_time);

    if (isShiftActive(shift)) {
      return 'active';
    }

    // Handle shifts that cross midnight
    if (endMinutes < startMinutes) {
      if (currentTimeMinutes > endMinutes && currentTimeMinutes < startMinutes) {
        return 'upcoming';
      }
      return 'completed';
    }

    if (currentTimeMinutes < startMinutes) {
      return 'upcoming';
    }

    return 'completed';
  };

  // Get staff with their status for a specific shift
  const getShiftStaffWithStatus = (shift: ShiftTemplate): StaffWithStatus[] => {
    const shiftSchedules = todaySchedules.filter(s => s.shift_template_id === shift.id);

    return shiftSchedules.map(schedule => {
      const staffMember = staff.find(s => s.id === schedule.staff_id);
      const checkIn = todayCheckIns.find(c => c.staff_id === schedule.staff_id);

      if (!staffMember) {
        return null;
      }

      let status: 'on_time' | 'late' | 'absent' = 'absent';
      let lateMinutes: number | undefined;

      if (checkIn) {
        const late = calculateLateMinutes(
          checkIn.check_in_time,
          shift.start_time,
          shift.grace_period_minutes
        );

        if (late > 0) {
          status = 'late';
          lateMinutes = late;
        } else {
          status = 'on_time';
        }
      }

      return {
        staff: staffMember,
        schedule,
        checkIn,
        status,
        lateMinutes,
      };
    }).filter(Boolean) as StaffWithStatus[];
  };

  // Sort shifts by start time
  const sortedShifts = [...shifts].sort((a, b) => {
    return timeToMinutes(a.start_time) - timeToMinutes(b.start_time);
  });

  // Get the current active shift
  const activeShift = sortedShifts.find(shift => isShiftActive(shift));

  // Toggle shift expansion
  const toggleShift = (shiftId: string) => {
    setExpandedShifts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(shiftId)) {
        newSet.delete(shiftId);
      } else {
        newSet.add(shiftId);
      }
      return newSet;
    });
  };

  // Format time for display
  const formatTime = (time: string): string => {
    return time.substring(0, 5); // HH:mm
  };

  // Format check-in time
  const formatCheckInTime = (timestamp: string): string => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="px-4 sm:px-6 py-6 space-y-4">
      {/* Current Shift Summary */}
      {activeShift && (() => {
        const staffWithStatus = getShiftStaffWithStatus(activeShift);
        const onTimeCount = staffWithStatus.filter(s => s.status === 'on_time').length;
        const lateCount = staffWithStatus.filter(s => s.status === 'late').length;
        const absentCount = staffWithStatus.filter(s => s.status === 'absent').length;
        const totalScheduled = staffWithStatus.length;
        const checkedInCount = onTimeCount + lateCount;

        return (
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-lg p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-sm opacity-90">⏰ CA HIỆN TẠI</div>
                <h2 className="text-2xl font-bold">{activeShift.name}</h2>
                <div className="text-sm opacity-90">
                  {formatTime(activeShift.start_time)} - {formatTime(activeShift.end_time)}
                </div>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold">{checkedInCount}/{totalScheduled}</div>
                <div className="text-sm opacity-90">Đã điểm danh</div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white bg-opacity-20 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold">{onTimeCount}</div>
                <div className="text-xs opacity-90">✅ Đúng giờ</div>
              </div>
              <div className="bg-white bg-opacity-20 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold">{lateCount}</div>
                <div className="text-xs opacity-90">⚠️ Muộn</div>
              </div>
              <div className="bg-white bg-opacity-20 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold">{absentCount}</div>
                <div className="text-xs opacity-90">❌ Vắng</div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* All Shifts for Today */}
      <div className="space-y-3">
        <h3 className="text-lg font-bold text-gray-800 px-2">📅 Ca làm việc hôm nay</h3>

        {sortedShifts.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
            <p className="text-gray-500">Chưa có ca làm việc nào</p>
          </div>
        ) : (
          sortedShifts.map(shift => {
            const shiftStatus = getShiftStatus(shift);
            const staffWithStatus = getShiftStaffWithStatus(shift);
            const isExpanded = expandedShifts.has(shift.id) || shiftStatus === 'active';
            const onTimeCount = staffWithStatus.filter(s => s.status === 'on_time').length;
            const lateCount = staffWithStatus.filter(s => s.status === 'late').length;
            const absentCount = staffWithStatus.filter(s => s.status === 'absent').length;

            return (
              <div
                key={shift.id}
                className={`bg-white rounded-lg border-2 shadow-sm overflow-hidden transition-all ${
                  shiftStatus === 'active'
                    ? 'border-blue-500'
                    : shiftStatus === 'upcoming'
                    ? 'border-gray-300'
                    : 'border-gray-200 opacity-75'
                }`}
              >
                {/* Shift Header */}
                <button
                  type="button"
                  onClick={() => toggleShift(shift.id)}
                  className="w-full p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-1 h-12 rounded-full"
                        style={{ backgroundColor: shift.color }}
                      />
                      <div className="text-left">
                        <h4 className="font-bold text-gray-800">{shift.name}</h4>
                        <div className="text-sm text-gray-600">
                          {formatTime(shift.start_time)} - {formatTime(shift.end_time)}
                        </div>
                        {shiftStatus === 'active' && (
                          <span className="inline-block px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full mt-1">
                            ĐANG DIỄN RA
                          </span>
                        )}
                        {shiftStatus === 'upcoming' && (
                          <span className="inline-block px-2 py-0.5 bg-gray-100 text-gray-600 text-xs font-semibold rounded-full mt-1">
                            SẮP TỚI
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right text-sm">
                        <div className="font-semibold text-gray-800">
                          {staffWithStatus.length} nhân viên
                        </div>
                        {/* Only show status breakdown for active or completed shifts */}
                        {shiftStatus !== 'upcoming' && staffWithStatus.length > 0 && (
                          <div className="flex gap-2 justify-end mt-1">
                            {onTimeCount > 0 && (
                              <span className="text-green-600 text-xs">✅ {onTimeCount}</span>
                            )}
                            {lateCount > 0 && (
                              <span className="text-yellow-600 text-xs">⚠️ {lateCount}</span>
                            )}
                            {absentCount > 0 && (
                              <span className="text-red-600 text-xs">❌ {absentCount}</span>
                            )}
                          </div>
                        )}
                      </div>
                      <svg
                        className={`w-5 h-5 text-gray-400 transition-transform ${
                          isExpanded ? 'rotate-180' : ''
                        }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </div>
                  </div>
                </button>

                {/* Staff List */}
                {isExpanded && (
                  <div className="border-t border-gray-200 bg-gray-50">
                    {staffWithStatus.length === 0 ? (
                      <div className="p-4 text-center text-gray-500 text-sm">
                        Chưa xếp nhân viên cho ca này
                      </div>
                    ) : (
                      <div className="divide-y divide-gray-200">
                        {staffWithStatus.map(({ staff: staffMember, checkIn, status, lateMinutes }) => {
                          const displayName = staffMember.name || staffMember.full_name;
                          const initials = displayName
                            ?.split(' ')
                            .slice(-2)
                            .map((n: string) => n[0])
                            .join('')
                            .toUpperCase() || '??';

                          return (
                            <div key={staffMember.id} className="p-4 hover:bg-gray-100 transition-colors">
                              <div className="flex items-start gap-3">
                                {/* Avatar or Photo */}
                                <div className="flex-shrink-0">
                                  {checkIn?.selfie_url ? (
                                    <button
                                      type="button"
                                      onClick={() => setSelectedCheckIn(checkIn)}
                                      className="w-12 h-12 rounded-full overflow-hidden border-2 border-gray-300 hover:border-blue-500 transition-colors"
                                    >
                                      <img
                                        src={checkIn.selfie_url}
                                        alt={displayName}
                                        className="w-full h-full object-cover"
                                      />
                                    </button>
                                  ) : (
                                    <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-sm bg-gradient-to-br from-gray-400 to-gray-500">
                                      {initials}
                                    </div>
                                  )}
                                </div>

                                {/* Staff Info */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <h5 className="font-semibold text-gray-800">{displayName}</h5>
                                    {/* Only show status badges for active or completed shifts */}
                                    {shiftStatus !== 'upcoming' && (
                                      <>
                                        {status === 'on_time' && (
                                          <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
                                            ✅ Đúng giờ
                                          </span>
                                        )}
                                        {status === 'late' && (
                                          <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs font-semibold rounded-full">
                                            ⚠️ Muộn {lateMinutes}p
                                          </span>
                                        )}
                                        {status === 'absent' && (
                                          <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-semibold rounded-full">
                                            ❌ Chưa điểm danh
                                          </span>
                                        )}
                                      </>
                                    )}
                                  </div>

                                  {checkIn ? (
                                    <div className="text-sm text-gray-600 space-y-1">
                                      <div className="flex items-center gap-2">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        <span>Vào: {formatCheckInTime(checkIn.check_in_time)}</span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                        <span>Khoảng cách: {Math.round(checkIn.distance_meters)}m</span>
                                      </div>
                                      {checkIn.check_out_time && (
                                        <div className="flex items-center gap-2">
                                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                          </svg>
                                          <span>Ra: {formatCheckInTime(checkIn.check_out_time)}</span>
                                        </div>
                                      )}
                                    </div>
                                  ) : shiftStatus === 'upcoming' ? (
                                    <div className="text-sm text-gray-500">
                                      Được xếp ca
                                    </div>
                                  ) : (
                                    <div className="text-sm text-gray-500">
                                      Chưa có thông tin điểm danh
                                    </div>
                                  )}
                                </div>

                                {/* Quick Actions - only for active shifts with absent staff */}
                                {shiftStatus === 'active' && status === 'absent' && (
                                  <div className="flex-shrink-0">
                                    <button
                                      type="button"
                                      className="px-3 py-1 bg-blue-100 hover:bg-blue-200 text-blue-700 text-xs font-semibold rounded transition-colors"
                                    >
                                      Nhắc nhở
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Photo Detail Modal */}
      {selectedCheckIn && (() => {
        const staffMember = staff.find(s => s.id === selectedCheckIn.staff_id);
        const displayName = staffMember ? (staffMember.name || staffMember.full_name) : 'N/A';

        return (
          <div
            className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedCheckIn(null)}
          >
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              {/* Header */}
              <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-800">{displayName}</h3>
                <button
                  type="button"
                  onClick={() => setSelectedCheckIn(null)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Photo */}
              <div className="p-4">
                <div className="mb-4">
                  <p className="text-sm font-medium text-gray-600 mb-2">📸 Ảnh điểm danh</p>
                  <img
                    src={selectedCheckIn.selfie_url}
                    alt="Check-in selfie"
                    className="w-full rounded-lg"
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>

                {/* Details */}
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium text-gray-600">⏰ Thời gian</p>
                    <p className="text-base font-semibold text-gray-800">
                      {new Date(selectedCheckIn.check_in_time).toLocaleString('vi-VN')}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-gray-600">📍 Vị trí</p>
                    <p className="text-base font-semibold text-gray-800">
                      Khoảng cách: {Math.round(selectedCheckIn.distance_meters)}m từ cửa hàng
                    </p>
                    <p className="text-sm text-gray-600">
                      {selectedCheckIn.latitude.toFixed(6)}, {selectedCheckIn.longitude.toFixed(6)}
                    </p>
                  </div>

                  {selectedCheckIn.check_out_time && (
                    <>
                      {selectedCheckIn.checkout_selfie_url && (
                        <div>
                          <p className="text-sm font-medium text-gray-600 mb-2">📸 Ảnh check-out</p>
                          <img
                            src={selectedCheckIn.checkout_selfie_url}
                            alt="Check-out selfie"
                            className="w-full rounded-lg"
                          />
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-medium text-gray-600">⏰ Giờ ra</p>
                        <p className="text-base font-semibold text-gray-800">
                          {new Date(selectedCheckIn.check_out_time).toLocaleString('vi-VN')}
                        </p>
                      </div>
                    </>
                  )}

                  <div>
                    <p className="text-sm font-medium text-gray-600">📊 Trạng thái</p>
                    <p className="text-base font-semibold text-gray-800">
                      {selectedCheckIn.status === 'success' && '✅ Thành công'}
                      {selectedCheckIn.status === 'late' && '⚠️ Muộn'}
                      {selectedCheckIn.status === 'wrong_location' && '❌ Sai vị trí'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
