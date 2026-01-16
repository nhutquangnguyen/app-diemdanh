import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { ShiftTemplate, CheckIn } from '@/types';

interface StaffTodayProps {
  storeId: string;
  staffId: string;
  shifts: ShiftTemplate[];
}

export default function StaffToday({ storeId, staffId, shifts }: StaffTodayProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [todayCheckIns, setTodayCheckIns] = useState<CheckIn[]>([]);
  const [todaySchedules, setTodaySchedules] = useState<any[]>([]);
  const [currentShift, setCurrentShift] = useState<any | null>(null);

  useEffect(() => {
    loadTodayData();
    // Refresh every 30 seconds
    const interval = setInterval(loadTodayData, 30000);
    return () => clearInterval(interval);
  }, [storeId, staffId]);

  async function loadTodayData() {
    try {
      setLoading(true);

      // Get today's date range
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const todayStart = today.toISOString();
      const tomorrowStart = tomorrow.toISOString();
      const todayStr = today.toISOString().split('T')[0];

      // Load today's check-ins
      const { data: checkInsData, error: checkInsError } = await supabase
        .from('check_ins')
        .select('*')
        .eq('staff_id', staffId)
        .eq('store_id', storeId)
        .gte('check_in_time', todayStart)
        .lt('check_in_time', tomorrowStart)
        .order('check_in_time', { ascending: false });

      if (checkInsError) throw checkInsError;
      setTodayCheckIns(checkInsData || []);

      // Load today's scheduled shifts
      const { data: schedulesData, error: schedulesError } = await supabase
        .from('staff_schedules')
        .select(`
          *,
          shift_template:shift_templates(*)
        `)
        .eq('staff_id', staffId)
        .eq('store_id', storeId)
        .eq('scheduled_date', todayStr);

      if (schedulesError) throw schedulesError;
      setTodaySchedules(schedulesData || []);

      // Determine current shift
      const now = new Date();
      const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

      const activeShift = (schedulesData || []).find((schedule: any) => {
        const shift = schedule.shift_template;
        return shift && currentTime >= shift.start_time && currentTime <= shift.end_time;
      });

      setCurrentShift(activeShift || null);

    } catch (error) {
      console.error('Error loading today data:', error);
    } finally {
      setLoading(false);
    }
  }

  function handleCheckIn(shiftId: string) {
    // Navigate to check-in page
    router.push(`/checkin/submit?store=${storeId}`);
  }

  function handleCheckOut() {
    // Navigate to check-out page
    router.push(`/checkin/submit?store=${storeId}&action=check-out`);
  }

  // Calculate stats
  const activeCheckIn = todayCheckIns.find(ci => !ci.check_out_time);
  const completedCheckIns = todayCheckIns.filter(ci => ci.check_out_time);
  const onTimeCount = todayCheckIns.filter(ci => ci.status === 'success').length;
  const lateCount = todayCheckIns.filter(ci => ci.status === 'late').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 space-y-6">
      {/* Current Shift Status Card */}
      {currentShift ? (
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-lg p-6 text-white">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm opacity-90">🙋 CA HIỆN TẠI</span>
              </div>
              <h2 className="text-3xl font-bold">{currentShift.shift_template.name}</h2>
              <p className="text-lg opacity-90 mt-1">
                {currentShift.shift_template.start_time} - {currentShift.shift_template.end_time}
              </p>
            </div>
            <div className="text-right">
              <div className="text-4xl font-bold">{onTimeCount + lateCount}/{todaySchedules.length}</div>
              <div className="text-sm opacity-90">Đã điểm danh</div>
            </div>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white/20 backdrop-blur-sm rounded-lg p-3 text-center">
              <div className="text-2xl font-bold">{onTimeCount}</div>
              <div className="text-xs opacity-90 flex items-center justify-center gap-1">
                <span>✅</span>
                <span>Đúng giờ</span>
              </div>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-lg p-3 text-center">
              <div className="text-2xl font-bold">{lateCount}</div>
              <div className="text-xs opacity-90 flex items-center justify-center gap-1">
                <span>⚠️</span>
                <span>Muộn</span>
              </div>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-lg p-3 text-center">
              <div className="text-2xl font-bold">{todaySchedules.length - (onTimeCount + lateCount)}</div>
              <div className="text-xs opacity-90 flex items-center justify-center gap-1">
                <span>❌</span>
                <span>Vắng</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-gradient-to-br from-gray-500 to-gray-600 rounded-2xl shadow-lg p-6 text-white">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm opacity-90">📊 THỐNG KÊ HÔM NAY</span>
              </div>
              <h2 className="text-2xl font-bold">Tổng quan điểm danh</h2>
              <p className="text-sm opacity-90 mt-1">
                {todaySchedules.length === 0 ? 'Không có ca làm việc' : `${todaySchedules.length} ca hôm nay`}
              </p>
            </div>
            <div className="text-right">
              <div className="text-4xl font-bold">{onTimeCount + lateCount}/{todaySchedules.length || '-'}</div>
              <div className="text-sm opacity-90">Đã điểm danh</div>
            </div>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white/20 backdrop-blur-sm rounded-lg p-3 text-center">
              <div className="text-2xl font-bold">{onTimeCount}</div>
              <div className="text-xs opacity-90 flex items-center justify-center gap-1">
                <span>✅</span>
                <span>Đúng giờ</span>
              </div>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-lg p-3 text-center">
              <div className="text-2xl font-bold">{lateCount}</div>
              <div className="text-xs opacity-90 flex items-center justify-center gap-1">
                <span>⚠️</span>
                <span>Muộn</span>
              </div>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-lg p-3 text-center">
              <div className="text-2xl font-bold">{todaySchedules.length - (onTimeCount + lateCount)}</div>
              <div className="text-xs opacity-90 flex items-center justify-center gap-1">
                <span>❌</span>
                <span>Vắng</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Check-in Button */}
      {activeCheckIn ? (
        <button
          onClick={handleCheckOut}
          className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white px-6 py-4 rounded-xl font-bold text-lg transition-all shadow-lg flex items-center justify-center gap-2"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Check-out
        </button>
      ) : (
        <button
          onClick={() => handleCheckIn('')}
          className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-6 py-4 rounded-xl font-bold text-lg transition-all shadow-lg flex items-center justify-center gap-2"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
          </svg>
          Check-in
        </button>
      )}

      {/* Today's Shifts */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <h3 className="text-lg font-bold text-gray-800">Ca làm việc hôm nay</h3>
        </div>

        {todaySchedules.length === 0 ? (
          <div className="bg-white rounded-xl border-2 border-dashed border-gray-300 p-8 text-center">
            <div className="text-gray-400 text-3xl mb-2">📅</div>
            <p className="text-gray-600">Bạn không có ca làm việc nào hôm nay</p>
            <p className="text-sm text-gray-500 mt-1">Nghỉ ngơi và nạp năng lượng nhé! 😊</p>
          </div>
        ) : (
          <div className="space-y-3">
            {todaySchedules.map((schedule) => {
              const shift = schedule.shift_template;
              const checkIn = todayCheckIns.find(ci => ci.shift_template_id === shift.id);
              const isCheckedIn = checkIn && !checkIn.check_out_time;
              const isCompleted = checkIn && checkIn.check_out_time;

              return (
                <div
                  key={schedule.id}
                  className="bg-white rounded-xl border-2 border-blue-200 p-4"
                  style={{ borderColor: shift.color + '40' }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-4 h-4 rounded-full flex-shrink-0"
                        style={{ backgroundColor: shift.color }}
                      />
                      <div>
                        <h4 className="font-bold text-gray-800">{shift.name}</h4>
                        <p className="text-sm text-gray-600">
                          {shift.start_time} - {shift.end_time}
                        </p>
                      </div>
                    </div>

                    {isCompleted ? (
                      <div className="text-green-600 text-sm font-semibold flex items-center gap-1">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span>Hoàn thành</span>
                      </div>
                    ) : isCheckedIn ? (
                      <div className="text-blue-600 text-sm font-semibold flex items-center gap-1">
                        <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
                        <span>Đang làm</span>
                      </div>
                    ) : (
                      <div className="text-gray-400 text-sm font-semibold">Chưa vào</div>
                    )}
                  </div>

                  {/* Check-in info */}
                  {checkIn && (
                    <div className="bg-gray-50 rounded-lg p-3 mb-3 space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Vào ca:</span>
                        <span className="font-semibold text-gray-800">
                          {new Date(checkIn.check_in_time).toLocaleTimeString('vi-VN', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                          {checkIn.status === 'late' && <span className="text-orange-600 ml-2">⚠️ Muộn</span>}
                        </span>
                      </div>
                      {checkIn.check_out_time && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Ra ca:</span>
                          <span className="font-semibold text-gray-800">
                            {new Date(checkIn.check_out_time).toLocaleTimeString('vi-VN', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Action button */}
                  {isCheckedIn ? (
                    <button
                      onClick={handleCheckOut}
                      className="w-full bg-orange-600 hover:bg-orange-700 text-white px-4 py-3 rounded-lg font-semibold transition-all"
                    >
                      Check-out
                    </button>
                  ) : !isCompleted ? (
                    <button
                      onClick={() => handleCheckIn(shift.id)}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg font-semibold transition-all"
                    >
                      Check-in
                    </button>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
