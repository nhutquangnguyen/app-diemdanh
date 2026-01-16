import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { ShiftTemplate } from '@/types';
import { useToast } from '@/components/Toast';

interface StaffAvailabilityProps {
  storeId: string;
  staffId: string;
  staffName: string;
  shifts: ShiftTemplate[];
}

export default function StaffAvailability({ storeId, staffId, staffName, shifts }: StaffAvailabilityProps) {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [availability, setAvailability] = useState<{ [key: string]: boolean }>({});
  const [isOwnerOverride, setIsOwnerOverride] = useState(false);
  const [overrideReason, setOverrideReason] = useState<string | null>(null);
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() => {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(today.setDate(diff));
    // Always start from next week for availability submission
    monday.setDate(monday.getDate() + 7);
    return monday;
  });

  const dayNames = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

  useEffect(() => {
    loadAvailability();
  }, [currentWeekStart, storeId, staffId]);

  async function loadAvailability() {
    try {
      setLoading(true);

      const weekStartStr = currentWeekStart.toISOString().split('T')[0];

      // Load availability for this week
      const { data, error } = await supabase
        .from('staff_availability')
        .select('*')
        .eq('staff_id', staffId)
        .eq('store_id', storeId)
        .eq('week_start_date', weekStartStr);

      if (error) throw error;

      // Convert to lookup object
      const availMap: { [key: string]: boolean } = {};
      let hasOverride = false;
      let reason: string | null = null;

      (data || []).forEach(item => {
        const key = `${item.day_of_week}_${item.shift_template_id}`;
        availMap[key] = item.is_available;

        // Check if any record is owner-overridden
        if (item.is_owner_override) {
          hasOverride = true;
          reason = item.override_reason;
        }
      });

      setAvailability(availMap);
      setIsOwnerOverride(hasOverride);
      setOverrideReason(reason);

    } catch (error) {
      console.error('Error loading availability:', error);
    } finally {
      setLoading(false);
    }
  }

  function toggleAvailability(dayIndex: number, shiftId: string) {
    const key = `${dayIndex}_${shiftId}`;
    setAvailability(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  }

  function isAvailable(dayIndex: number, shiftId: string): boolean {
    const key = `${dayIndex}_${shiftId}`;
    return availability[key] || false;
  }

  function quickApply(pattern: 'all' | 'weekdays' | 'weekends' | 'clear') {
    const newAvail: { [key: string]: boolean } = {};

    for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
      let shouldApply = false;

      if (pattern === 'all') shouldApply = true;
      else if (pattern === 'weekdays' && dayIndex >= 0 && dayIndex <= 4) shouldApply = true;
      else if (pattern === 'weekends' && (dayIndex === 5 || dayIndex === 6)) shouldApply = true;

      for (const shift of shifts) {
        const key = `${dayIndex}_${shift.id}`;
        newAvail[key] = shouldApply;
      }
    }

    setAvailability(newAvail);
  }

  async function handleSave() {
    try {
      setSaving(true);

      const weekStartStr = currentWeekStart.toISOString().split('T')[0];

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Prepare records
      const records = Object.entries(availability)
        .filter(([_, isAvail]) => isAvail)
        .map(([key]) => {
          const [dayOfWeek, shiftTemplateId] = key.split('_');
          return {
            staff_id: staffId,
            store_id: storeId,
            week_start_date: weekStartStr,
            shift_template_id: shiftTemplateId,
            day_of_week: parseInt(dayOfWeek),
            is_available: true,
            created_by: user.id,
            modified_by: user.id,
            is_owner_override: false,
            override_reason: null,
          };
        });

      console.log('Saving availability records:', records);

      // Delete existing records for this week (only non-overridden ones)
      const { error: deleteError } = await supabase
        .from('staff_availability')
        .delete()
        .eq('staff_id', staffId)
        .eq('store_id', storeId)
        .eq('week_start_date', weekStartStr)
        .eq('is_owner_override', false);

      if (deleteError) {
        console.error('Delete error:', deleteError);
        throw deleteError;
      }

      // Insert new records
      if (records.length > 0) {
        const { error: insertError } = await supabase
          .from('staff_availability')
          .insert(records);

        if (insertError) {
          console.error('Insert error:', insertError);
          throw insertError;
        }
      }

      toast.success('Đã lưu lịch rảnh thành công');
    } catch (error: any) {
      console.error('Error saving availability:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      toast.error(`Lỗi khi lưu lịch rảnh: ${error?.message || 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  }

  function navigateWeek(direction: 'prev' | 'next') {
    const newDate = new Date(currentWeekStart);
    newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
    setCurrentWeekStart(newDate);
  }

  // Calculate week dates
  const weekDates: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(currentWeekStart);
    date.setDate(currentWeekStart.getDate() + i);
    weekDates.push(date);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 pb-32 space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-md p-4">
        <h2 className="text-lg font-bold text-gray-800 mb-2">Gửi Lịch Rảnh</h2>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-sm text-gray-700">
            <span className="font-semibold">💡 Hướng dẫn:</span> Đánh dấu các ca bạn có thể làm. Chủ cửa hàng sẽ dùng thông tin này để tạo lịch tự động công bằng.
          </p>
        </div>
      </div>

      {/* Owner Override Alert */}
      {isOwnerOverride && overrideReason && (
        <div className="bg-orange-50 border-2 border-orange-300 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <div className="text-2xl">⚠️</div>
            <div className="flex-1">
              <h3 className="font-bold text-orange-800 mb-1">Lịch được cập nhật bởi Chủ cửa hàng</h3>
              <p className="text-sm text-orange-700">
                <span className="font-semibold">Lý do:</span> {overrideReason}
              </p>
              <p className="text-xs text-orange-600 mt-2">
                Bạn không thể chỉnh sửa lịch này. Vui lòng liên hệ chủ cửa hàng nếu cần thay đổi.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Week Navigator */}
      <div className="bg-white rounded-xl shadow-md p-4">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigateWeek('prev')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-all"
          >
            <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
            <div className="text-xs text-gray-500 mt-1">Tuần {Math.ceil(currentWeekStart.getDate() / 7)}</div>
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

      {/* Quick Apply */}
      {!isOwnerOverride && (
        <div className="bg-white rounded-xl shadow-md p-4">
          <div className="text-sm font-semibold text-gray-700 mb-3">Áp dụng nhanh:</div>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => quickApply('all')}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-semibold text-sm transition-all"
            >
              Tất cả tuần
            </button>
            <button
              onClick={() => quickApply('weekdays')}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold text-sm transition-all"
            >
              T2-T6
            </button>
            <button
              onClick={() => quickApply('weekends')}
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-semibold text-sm transition-all"
            >
              T7-CN
            </button>
            <button
              onClick={() => quickApply('clear')}
              className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg font-semibold text-sm transition-all"
            >
              Bỏ chọn
            </button>
          </div>
        </div>
      )}

      {/* Availability Grid */}
      <div className="bg-white rounded-xl shadow-md p-4">
        <div className="overflow-x-auto -mx-4 px-4">
          <table className="w-full border-collapse min-w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left p-2 text-gray-700 font-bold text-sm sticky left-0 bg-white z-10">
                  Ca
                </th>
                {dayNames.map((day, idx) => (
                  <th key={idx} className="p-2 text-center text-gray-700 font-bold text-xs w-12">
                    {day}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {shifts.map((shift, shiftIdx) => (
                <tr key={shift.id} className={`border-b ${shiftIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                  <td className="p-2 sticky left-0 bg-inherit z-10">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: shift.color }} />
                      <span className="font-semibold text-xs text-gray-800">{shift.name}</span>
                    </div>
                  </td>
                  {Array.from({ length: 7 }).map((_, dayIndex) => {
                    const checked = isAvailable(dayIndex, shift.id);
                    return (
                      <td key={dayIndex} className="p-1 text-center">
                        <button
                          onClick={() => !isOwnerOverride && toggleAvailability(dayIndex, shift.id)}
                          disabled={isOwnerOverride}
                          className={`w-10 h-10 flex items-center justify-center mx-auto ${isOwnerOverride ? 'cursor-not-allowed opacity-50' : ''}`}
                        >
                          {checked ? (
                            <svg className="w-7 h-7 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                          ) : (
                            <svg className="w-7 h-7 text-gray-300" fill="currentColor" viewBox="0 0 20 20">
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

      {/* Save Button */}
      {!isOwnerOverride && (
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-4 rounded-xl font-semibold transition-all disabled:opacity-50 shadow-lg"
        >
          {saving ? 'Đang lưu...' : 'Lưu Lịch Rảnh'}
        </button>
      )}
    </div>
  );
}
