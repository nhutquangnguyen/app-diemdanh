'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Store, Staff, CheckIn, ShiftTemplate } from '@/types';
import Header from '@/components/Header';

export default function StaffHistoryPage() {
  const params = useParams();
  const router = useRouter();
  const storeId = params.id as string;

  const [store, setStore] = useState<Store | null>(null);
  const [staffMember, setStaffMember] = useState<Staff | null>(null);
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [shifts, setShifts] = useState<ShiftTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  useEffect(() => {
    loadData();
  }, [storeId, selectedMonth]);

  async function loadData() {
    try {
      setLoading(true);

      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        router.push('/auth/login');
        return;
      }

      // Load store data
      const { data: storeData, error: storeError } = await supabase
        .from('stores')
        .select('*')
        .eq('id', storeId)
        .single();

      if (storeError) throw storeError;
      setStore(storeData);

      // Load staff member data
      const { data: staffData, error: staffError } = await supabase
        .from('staff')
        .select('*')
        .eq('store_id', storeId)
        .eq('email', user.email)
        .single();

      if (staffError) {
        router.push('/');
        return;
      }
      setStaffMember(staffData);

      // Load shift templates
      const { data: shiftsData, error: shiftsError } = await supabase
        .from('shift_templates')
        .select('*')
        .eq('store_id', storeId);

      if (shiftsError) throw shiftsError;
      setShifts(shiftsData || []);

      // Parse selected month
      const [year, month] = selectedMonth.split('-').map(Number);
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59);

      // Load check-ins for selected month
      const { data: checkInsData, error: checkInsError } = await supabase
        .from('check_ins')
        .select('*')
        .eq('staff_id', staffData.id)
        .eq('store_id', storeId)
        .gte('check_in_time', startDate.toISOString())
        .lte('check_in_time', endDate.toISOString())
        .order('check_in_time', { ascending: false });

      if (checkInsError) throw checkInsError;
      setCheckIns(checkInsData || []);

    } catch (error) {
      console.error('Error loading data:', error);
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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!store || !staffMember) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Không tìm thấy dữ liệu</p>
          <Link href="/" className="text-blue-600 hover:underline">
            Quay lại trang chủ
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col">
      <Header />

      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center gap-3">
          <Link href={`/stores/${storeId}/staff`} className="text-gray-600 hover:text-gray-800">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-gray-800">Lịch Sử Check-in</h1>
            <p className="text-xs text-gray-500">{store.name}</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
        <div className="max-w-2xl mx-auto">
          {/* Month Selector */}
          <div className="bg-white rounded-xl shadow-md p-4 mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Chọn tháng:
            </label>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Stats Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
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
      </main>
    </div>
  );
}
