'use client';

import { useState, useEffect } from 'react';

interface TodayViewProps {
  people: any[];
  checkIns: any[];
  shifts: any[];
  schedules: any[];
  config: Record<string, any>;
  onViewPhoto?: (checkIn: any) => void;
}

export function TodayView({ people, checkIns, shifts, schedules, config, onViewPhoto }: TodayViewProps) {
  const [expandedShifts, setExpandedShifts] = useState<Set<string>>(new Set());
  const [currentTime, setCurrentTime] = useState(new Date());

  const peopleLabel = config.peopleLabel || 'People';
  const gracePeriodMinutes = config.lateThresholdMinutes || 15;

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Helpers
  const timeToMinutes = (time: string) => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  };

  const calculateLateMinutes = (checkInTime: string, shiftStartTime: string) => {
    const checkIn = new Date(checkInTime);
    const [shiftHour, shiftMin] = shiftStartTime.split(':').map(Number);
    const shiftStart = new Date(checkIn);
    shiftStart.setHours(shiftHour, shiftMin, 0, 0);
    const diffMinutes = Math.floor((checkIn.getTime() - shiftStart.getTime()) / 60000);
    return diffMinutes <= gracePeriodMinutes ? 0 : diffMinutes - gracePeriodMinutes;
  };

  const currentTimeMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();

  const isShiftActive = (shift: any) => {
    const startMinutes = timeToMinutes(shift.start_time);
    const endMinutes = timeToMinutes(shift.end_time);
    if (endMinutes < startMinutes) {
      return currentTimeMinutes >= startMinutes || currentTimeMinutes <= endMinutes;
    }
    return currentTimeMinutes >= startMinutes && currentTimeMinutes <= endMinutes;
  };

  const getShiftStatus = (shift: any) => {
    const startMinutes = timeToMinutes(shift.start_time);
    const endMinutes = timeToMinutes(shift.end_time);

    if (isShiftActive(shift)) return 'active';

    if (endMinutes < startMinutes) {
      return currentTimeMinutes > endMinutes && currentTimeMinutes < startMinutes ? 'upcoming' : 'completed';
    }
    return currentTimeMinutes < startMinutes ? 'upcoming' : 'completed';
  };

  const getShiftPeopleWithStatus = (shift: any) => {
    const shiftSchedules = schedules.filter(s => s.shift_template_id === shift.id);

    return shiftSchedules.map(schedule => {
      const person = people.find(p => p.id === (schedule.staff_id || schedule.student_id));
      const checkIn = checkIns.find(c => (c.staff_id || c.student_id) === (schedule.staff_id || schedule.student_id));

      if (!person) return null;

      let status = 'absent';
      let lateMinutes = undefined;

      if (checkIn) {
        const late = calculateLateMinutes(checkIn.check_in_time, shift.start_time);
        if (late > 0) {
          status = 'late';
          lateMinutes = late;
        } else {
          status = 'on_time';
        }
      }

      return { person, schedule, checkIn, status, lateMinutes };
    }).filter(Boolean);
  };

  const sortedShifts = [...shifts].sort((a, b) => timeToMinutes(a.start_time) - timeToMinutes(b.start_time));
  const activeShift = sortedShifts.find(shift => isShiftActive(shift));

  const formatTime = (time: string) => time.substring(0, 5);
  const formatCheckInTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="space-y-4">
      {/* Current Time */}
      <div className="flex items-center justify-between text-sm text-gray-600">
        <div>
          📅 {currentTime.toLocaleDateString('vi-VN', {
            weekday: 'short',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
          })}
        </div>
        <div className="tabular-nums">
          🕐 {currentTime.toLocaleTimeString('vi-VN', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
          })}
        </div>
      </div>

      {/* Active Shift Summary */}
      {activeShift && (() => {
        const peopleWithStatus = getShiftPeopleWithStatus(activeShift);
        const onTimeCount = peopleWithStatus.filter(p => p && p.status === 'on_time').length;
        const lateCount = peopleWithStatus.filter(p => p && p.status === 'late').length;
        const absentCount = peopleWithStatus.filter(p => p && p.status === 'absent').length;
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
                <div className="text-3xl font-bold">{checkedInCount}/{peopleWithStatus.length}</div>
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

      {/* All Shifts */}
      <div className="space-y-3">
        <h3 className="text-lg font-bold text-gray-800">📅 Ca làm việc hôm nay</h3>

        {sortedShifts.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
            <p className="text-gray-500">Chưa có ca làm việc nào</p>
          </div>
        ) : (
          sortedShifts.map(shift => {
            const shiftStatus = getShiftStatus(shift);
            const peopleWithStatus = getShiftPeopleWithStatus(shift);
            const isExpanded = expandedShifts.has(shift.id) || shiftStatus === 'active';
            const onTimeCount = peopleWithStatus.filter(p => p && p.status === 'on_time').length;
            const lateCount = peopleWithStatus.filter(p => p && p.status === 'late').length;
            const absentCount = peopleWithStatus.filter(p => p && p.status === 'absent').length;

            return (
              <div
                key={shift.id}
                className={`bg-white rounded-lg border-2 shadow-sm overflow-hidden ${
                  shiftStatus === 'active' ? 'border-blue-500' :
                  shiftStatus === 'upcoming' ? 'border-gray-300' :
                  'border-gray-200 opacity-75'
                }`}
              >
                {/* Shift Header */}
                <button
                  type="button"
                  onClick={() => {
                    setExpandedShifts(prev => {
                      const newSet = new Set(prev);
                      newSet.has(shift.id) ? newSet.delete(shift.id) : newSet.add(shift.id);
                      return newSet;
                    });
                  }}
                  className="w-full p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-1 h-12 rounded-full"
                        style={{ backgroundColor: shift.color || '#3b82f6' }}
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
                          {peopleWithStatus.length} {peopleLabel.toLowerCase()}
                        </div>
                        {shiftStatus !== 'upcoming' && peopleWithStatus.length > 0 && (
                          <div className="flex gap-2 justify-end mt-1">
                            {onTimeCount > 0 && <span className="text-green-600 text-xs">✅ {onTimeCount}</span>}
                            {lateCount > 0 && <span className="text-yellow-600 text-xs">⚠️ {lateCount}</span>}
                            {absentCount > 0 && <span className="text-red-600 text-xs">❌ {absentCount}</span>}
                          </div>
                        )}
                      </div>
                      <svg
                        className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </button>

                {/* Expanded People List */}
                {isExpanded && (
                  <div className="border-t border-gray-200 bg-gray-50 p-4 space-y-2">
                    {peopleWithStatus.length === 0 ? (
                      <p className="text-gray-500 text-sm text-center py-2">
                        Chưa có {peopleLabel.toLowerCase()} nào được xếp lịch
                      </p>
                    ) : (
                      peopleWithStatus.map((item: any) => (
                        <div
                          key={item.person.id}
                          className="bg-white rounded-lg p-3 flex items-center gap-3"
                        >
                          {/* Avatar/Photo */}
                          <button
                            onClick={() => item.checkIn && onViewPhoto?.(item.checkIn)}
                            className={`flex-shrink-0 ${item.checkIn?.selfie_url ? 'cursor-pointer' : ''}`}
                          >
                            {item.checkIn?.selfie_url ? (
                              <img
                                src={item.checkIn.selfie_url}
                                alt={item.person.name}
                                className="w-12 h-12 rounded-full object-cover border-2 border-gray-200"
                              />
                            ) : (
                              <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-semibold">
                                {item.person.name.charAt(0).toUpperCase()}
                              </div>
                            )}
                          </button>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-gray-900">{item.person.name}</div>
                            {item.checkIn && (
                              <div className="text-sm text-gray-600">
                                {formatCheckInTime(item.checkIn.check_in_time)}
                                {item.checkIn.distance_from_store && (
                                  <span className="ml-2">• {item.checkIn.distance_from_store}m</span>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Status Badge */}
                          <div>
                            {item.status === 'on_time' && (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                ✅ Đúng giờ
                              </span>
                            )}
                            {item.status === 'late' && (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                ⚠️ Muộn {item.lateMinutes}p
                              </span>
                            )}
                            {item.status === 'absent' && (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                ❌ Vắng
                              </span>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
