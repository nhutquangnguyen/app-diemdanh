import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { CheckIn, ShiftTemplate } from '@/types';

interface StaffHistoryProps {
  storeId: string;
  staffId: string;
  shifts: ShiftTemplate[];
}

export default function StaffHistory({ storeId, staffId, shifts }: StaffHistoryProps) {
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  useEffect(() => {
    loadCheckIns();
  }, [staffId, storeId, selectedMonth]);

  async function loadCheckIns() {
    try {
      setLoading(true);

      // Parse selected month
      const [year, month] = selectedMonth.split('-').map(Number);
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59);

      // Load check-ins for selected month
      const { data: checkInsData, error: checkInsError } = await supabase
        .from('check_ins')
        .select('*')
        .eq('staff_id', staffId)
        .eq('store_id', storeId)
        .gte('check_in_time', startDate.toISOString())
        .lte('check_in_time', endDate.toISOString())
        .order('check_in_time', { ascending: false });

      if (checkInsError) throw checkInsError;
      setCheckIns(checkInsData || []);

    } catch (error) {
      console.error('Error loading check-ins:', error);
    } finally {
      setLoading(false);
    }
  }

  function getShiftName(shiftId: string): string {
    const shift = shifts.find(s => s.id === shiftId);
    return shift?.name || 'N/A';
  }

  function getShiftColor(shiftId: string): string {
    const shift = shifts.find(s => s.id === shiftId);
    return shift?.color || '#6B7280';
  }

  // Calculate stats
  const totalShifts = checkIns.length;
  const onTimeShifts = checkIns.filter(ci => ci.status === 'success').length;
  const lateShifts = checkIns.filter(ci => ci.status === 'late').length;
  const totalHours = checkIns.reduce((sum, ci) => {
    if (!ci.check_out_time) return sum;
    const checkIn = new Date(ci.check_in_time);
    const checkOut = new Date(ci.check_out_time);
    const hours = (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60);
    return sum + hours;
  }, 0);

  // Group by date
  const checkInsByDate: { [date: string]: CheckIn[] } = {};
  checkIns.forEach(ci => {
    const date = new Date(ci.check_in_time).toLocaleDateString('vi-VN');
    if (!checkInsByDate[date]) {
      checkInsByDate[date] = [];
    }
    checkInsByDate[date].push(ci);
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Format month in Vietnamese
  const getVietnameseMonth = (monthStr: string) => {
    const [year, month] = monthStr.split('-');
    const monthNames = [
      'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
      'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'
    ];
    return `${monthNames[parseInt(month) - 1]} ${year}`;
  };

  return (
    <div className="px-4 py-6 space-y-6">
      {/* Month Selector */}
      <div className="bg-white rounded-xl shadow-md p-4">
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Chọn tháng:
        </label>
        <div className="relative">
          <div className="text-lg font-bold text-gray-800 mb-2">
            {getVietnameseMonth(selectedMonth)}
          </div>
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl shadow-md p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">{totalShifts}</div>
          <div className="text-xs text-gray-600 mt-1">Tổng ca</div>
        </div>
        <div className="bg-white rounded-xl shadow-md p-4 text-center">
          <div className="text-2xl font-bold text-green-600">{onTimeShifts}</div>
          <div className="text-xs text-gray-600 mt-1">Đúng giờ</div>
        </div>
        <div className="bg-white rounded-xl shadow-md p-4 text-center">
          <div className="text-2xl font-bold text-orange-600">{lateShifts}</div>
          <div className="text-xs text-gray-600 mt-1">Muộn</div>
        </div>
        <div className="bg-white rounded-xl shadow-md p-4 text-center">
          <div className="text-2xl font-bold text-purple-600">{totalHours.toFixed(1)}h</div>
          <div className="text-xs text-gray-600 mt-1">Tổng giờ</div>
        </div>
      </div>

      {/* Check-ins List */}
      {checkIns.length === 0 ? (
        <div className="bg-white rounded-xl shadow-md p-8 text-center">
          <div className="text-gray-400 text-3xl mb-2">📋</div>
          <p className="text-gray-600">Không có lịch sử check-in trong tháng này</p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(checkInsByDate).map(([date, dateCheckIns]) => (
            <div key={date} className="bg-white rounded-xl shadow-md overflow-hidden">
              <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                <h3 className="font-semibold text-gray-800 text-sm">{date}</h3>
              </div>
              <div className="divide-y divide-gray-100">
                {dateCheckIns.map((checkIn) => {
                  const checkInTime = new Date(checkIn.check_in_time);
                  const checkOutTime = checkIn.check_out_time ? new Date(checkIn.check_out_time) : null;
                  const duration = checkOutTime
                    ? ((checkOutTime.getTime() - checkInTime.getTime()) / (1000 * 60 * 60)).toFixed(1)
                    : null;

                  return (
                    <div key={checkIn.id} className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: getShiftColor(checkIn.shift_template_id) }}
                          />
                          <span className="font-semibold text-gray-800 text-sm">
                            {getShiftName(checkIn.shift_template_id)}
                          </span>
                        </div>
                        {checkIn.status === 'late' && (
                          <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full font-semibold">
                            Muộn
                          </span>
                        )}
                      </div>

                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Vào ca:</span>
                          <span className="font-semibold text-gray-800">
                            {checkInTime.toLocaleTimeString('vi-VN', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                        {checkOutTime && (
                          <>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Ra ca:</span>
                              <span className="font-semibold text-gray-800">
                                {checkOutTime.toLocaleTimeString('vi-VN', {
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Thời gian:</span>
                              <span className="font-semibold text-blue-600">{duration}h</span>
                            </div>
                          </>
                        )}
                        {!checkOutTime && (
                          <div className="text-orange-600 text-xs font-semibold mt-1">
                            Chưa check-out
                          </div>
                        )}
                      </div>

                      {checkIn.notes && (
                        <div className="mt-2 text-xs text-gray-600 bg-gray-50 p-2 rounded">
                          <span className="font-semibold">Ghi chú:</span> {checkIn.notes}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
