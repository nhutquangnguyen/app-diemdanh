import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { ShiftTemplate } from '@/types';

interface StaffScheduleProps {
  storeId: string;
  staffId: string;
  shifts: ShiftTemplate[];
}

export default function StaffSchedule({ storeId, staffId, shifts }: StaffScheduleProps) {
  const [loading, setLoading] = useState(true);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [checkIns, setCheckIns] = useState<any[]>([]);
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() => {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(today.setDate(diff));
  });

  const dayNames = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

  useEffect(() => {
    loadSchedules();
  }, [currentWeekStart, storeId, staffId]);

  async function loadSchedules() {
    try {
      setLoading(true);

      // Calculate week dates
      const weekDates: string[] = [];
      for (let i = 0; i < 7; i++) {
        const date = new Date(currentWeekStart);
        date.setDate(currentWeekStart.getDate() + i);
        weekDates.push(date.toISOString().split('T')[0]);
      }

      // Load schedules for this week
      const { data, error } = await supabase
        .from('staff_schedules')
        .select(`
          *,
          shift_template:shift_templates(*)
        `)
        .eq('staff_id', staffId)
        .eq('store_id', storeId)
        .in('scheduled_date', weekDates);

      if (error) throw error;
      setSchedules(data || []);

      // Load check-ins for this week
      const weekStart = new Date(currentWeekStart);
      weekStart.setHours(0, 0, 0, 0);
      const weekEnd = new Date(currentWeekStart);
      weekEnd.setDate(weekEnd.getDate() + 7);
      weekEnd.setHours(0, 0, 0, 0);

      const { data: checkInsData, error: checkInsError } = await supabase
        .from('check_ins')
        .select('*')
        .eq('staff_id', staffId)
        .eq('store_id', storeId)
        .gte('check_in_time', weekStart.toISOString())
        .lt('check_in_time', weekEnd.toISOString());

      if (checkInsError) throw checkInsError;
      setCheckIns(checkInsData || []);

    } catch (error) {
      console.error('Error loading schedules:', error);
    } finally {
      setLoading(false);
    }
  }

  function navigateWeek(direction: 'prev' | 'next') {
    const newDate = new Date(currentWeekStart);
    newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
    setCurrentWeekStart(newDate);
  }

  function goToToday() {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1);
    setCurrentWeekStart(new Date(today.setDate(diff)));
  }

  // Get schedules for a specific date
  function getSchedulesForDate(dateStr: string) {
    return schedules.filter(s => s.scheduled_date === dateStr);
  }

  // Calculate week dates
  const weekDates: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(currentWeekStart);
    date.setDate(currentWeekStart.getDate() + i);
    weekDates.push(date);
  }

  // Calculate total hours for the week
  const totalHours = schedules.reduce((sum, schedule) => {
    const shift = schedule.shift_template;
    if (!shift) return sum;

    const [startHour, startMin] = shift.start_time.split(':').map(Number);
    const [endHour, endMin] = shift.end_time.split(':').map(Number);
    const startMinutes = startHour * 60 + startMin;
    let endMinutes = endHour * 60 + endMin;
    if (endMinutes < startMinutes) endMinutes += 24 * 60;
    const hours = (endMinutes - startMinutes) / 60;
    return sum + hours;
  }, 0);

  // Calculate attendance statistics
  const totalShifts = schedules.length;
  const onTimeCount = checkIns.filter(ci => !ci.is_late).length;
  const lateCount = checkIns.filter(ci => ci.is_late).length;
  const absentCount = totalShifts - checkIns.length;

  const today = new Date().toDateString();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 space-y-6">
      {/* Week Navigator */}
      <div className="bg-white rounded-xl shadow-md p-4">
        <div className="bg-gray-50 rounded-lg py-2 px-3 mb-4">
          <div className="flex items-center justify-between mb-2">
            <button
              onClick={() => navigateWeek('prev')}
              className="p-1 hover:bg-gray-200 rounded transition-all"
            >
              <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            <div className="text-center">
              <div className="text-sm font-semibold text-gray-700">
                {(() => {
                  const formatDM = (d: Date) => {
                    return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`;
                  };
                  return `${formatDM(weekDates[0])} - ${formatDM(weekDates[6])}`;
                })()}
              </div>
            </div>

            <button
              onClick={() => navigateWeek('next')}
              className="p-1 hover:bg-gray-200 rounded transition-all"
            >
              <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Tuần này button */}
          <button
            onClick={goToToday}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold py-2 px-4 rounded-lg transition-colors shadow-sm"
          >
            Tuần này
          </button>
        </div>

        {/* Week Statistics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
          <div className="bg-blue-50 rounded-lg p-3 text-center">
            <div className="text-xl font-bold text-blue-600">{totalShifts}</div>
            <div className="text-xs text-gray-600 mt-1">Tổng ca</div>
          </div>
          <div className="bg-green-50 rounded-lg p-3 text-center">
            <div className="text-xl font-bold text-green-600">{onTimeCount}</div>
            <div className="text-xs text-gray-600 mt-1">Đúng giờ</div>
          </div>
          <div className="bg-orange-50 rounded-lg p-3 text-center">
            <div className="text-xl font-bold text-orange-600">{lateCount}</div>
            <div className="text-xs text-gray-600 mt-1">Muộn</div>
          </div>
          <div className="bg-red-50 rounded-lg p-3 text-center">
            <div className="text-xl font-bold text-red-600">{absentCount}</div>
            <div className="text-xs text-gray-600 mt-1">Vắng</div>
          </div>
        </div>
      </div>

      {/* Weekly Schedule */}
      <div>
        <h3 className="text-lg font-bold text-gray-800 mb-3">Lịch Làm Việc</h3>

        {schedules.length === 0 ? (
          <div className="bg-white rounded-xl border-2 border-dashed border-gray-300 p-8 text-center">
            <div className="text-gray-400 text-3xl mb-2">📅</div>
            <p className="text-gray-600">Chưa có lịch làm việc</p>
            <p className="text-sm text-gray-500 mt-1">Owner chưa xếp lịch cho tuần này</p>
          </div>
        ) : (
          <div className="space-y-2">
            {weekDates.map((date, index) => {
              const dateStr = date.toISOString().split('T')[0];
              const daySchedules = getSchedulesForDate(dateStr);
              const isToday = date.toDateString() === today;

              return (
                <div
                  key={dateStr}
                  className={`bg-white rounded-xl border-2 p-4 transition-all ${
                    isToday
                      ? 'border-blue-500 shadow-md'
                      : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className={`font-bold ${isToday ? 'text-blue-600' : 'text-gray-700'}`}>
                        {dayNames[index]}
                      </div>
                      <div className="text-sm text-gray-500">
                        {date.getDate()}/{date.getMonth() + 1}
                      </div>
                      {isToday && (
                        <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded-full">
                          Hôm nay
                        </span>
                      )}
                    </div>

                    {daySchedules.length > 0 && (
                      <div className="text-sm text-gray-500">
                        {daySchedules.length} ca
                      </div>
                    )}
                  </div>

                  {daySchedules.length === 0 ? (
                    <div className="text-center py-2 text-gray-400 text-sm">Nghỉ</div>
                  ) : (
                    <div className="space-y-2">
                      {daySchedules.map((schedule) => {
                        const shift = schedule.shift_template;

                        // Find matching check-in for this schedule
                        const checkIn = checkIns.find(ci => {
                          const ciDate = new Date(ci.check_in_time).toISOString().split('T')[0];
                          return ciDate === dateStr && ci.shift_template_id === shift.id;
                        });

                        // Determine status
                        let statusBadge = null;
                        if (checkIn) {
                          if (checkIn.is_late) {
                            statusBadge = (
                              <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full font-semibold flex items-center gap-1">
                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                                Muộn
                              </span>
                            );
                          } else {
                            statusBadge = (
                              <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-semibold flex items-center gap-1">
                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                                Đúng giờ
                              </span>
                            );
                          }
                        } else {
                          // Check if this shift is in the past
                          const now = new Date();
                          const shiftDate = new Date(dateStr);
                          const [endHour, endMin] = shift.end_time.split(':').map(Number);
                          shiftDate.setHours(endHour, endMin, 0, 0);

                          if (shiftDate < now) {
                            statusBadge = (
                              <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full font-semibold flex items-center gap-1">
                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                </svg>
                                Vắng
                              </span>
                            );
                          }
                        }

                        return (
                          <div
                            key={schedule.id}
                            className="flex items-center gap-3 bg-gray-50 rounded-lg p-3"
                          >
                            <div
                              className="w-3 h-3 rounded-full flex-shrink-0"
                              style={{ backgroundColor: shift.color }}
                            />
                            <div className="flex-1">
                              <div className="font-semibold text-gray-800 text-sm">
                                {shift.name}
                              </div>
                              <div className="text-xs text-gray-600">
                                {shift.start_time} - {shift.end_time}
                              </div>
                            </div>
                            {statusBadge && (
                              <div className="flex-shrink-0">
                                {statusBadge}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
