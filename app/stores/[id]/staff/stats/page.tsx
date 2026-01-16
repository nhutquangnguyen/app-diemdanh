'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Store, Staff, CheckIn, ShiftTemplate } from '@/types';
import Header from '@/components/Header';

export default function StaffStatsPage() {
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
        .order('check_in_time', { ascending: true });

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
  const completedShifts = checkIns.filter(ci => ci.check_out_time).length;
  const incompleteShifts = checkIns.filter(ci => !ci.check_out_time).length;

  const totalHours = checkIns.reduce((sum, ci) => {
    if (!ci.check_out_time) return sum;
    const checkIn = new Date(ci.check_in_time);
    const checkOut = new Date(ci.check_out_time);
    const hours = (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60);
    return sum + hours;
  }, 0);

  const attendanceRate = totalShifts > 0 ? ((onTimeShifts / totalShifts) * 100) : 0;
  const completionRate = totalShifts > 0 ? ((completedShifts / totalShifts) * 100) : 0;

  // Calculate average hours per week
  const [year, month] = selectedMonth.split('-').map(Number);
  const daysInMonth = new Date(year, month, 0).getDate();
  const weeksInMonth = daysInMonth / 7;
  const avgHoursPerWeek = weeksInMonth > 0 ? totalHours / weeksInMonth : 0;

  // Calculate estimated salary if hour_rate exists
  const estimatedSalary = staffMember?.hour_rate ? totalHours * staffMember.hour_rate : null;

  // Group by shift type
  const shiftStats: { [shiftId: string]: { count: number; hours: number; onTime: number; late: number } } = {};
  checkIns.forEach(ci => {
    if (!shiftStats[ci.shift_template_id]) {
      shiftStats[ci.shift_template_id] = { count: 0, hours: 0, onTime: 0, late: 0 };
    }
    shiftStats[ci.shift_template_id].count += 1;
    if (ci.status === 'late') {
      shiftStats[ci.shift_template_id].late += 1;
    } else {
      shiftStats[ci.shift_template_id].onTime += 1;
    }
    if (ci.check_out_time) {
      const checkIn = new Date(ci.check_in_time);
      const checkOut = new Date(ci.check_out_time);
      const hours = (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60);
      shiftStats[ci.shift_template_id].hours += hours;
    }
  });

  // Weekly breakdown
  const weeklyStats: { [weekNum: number]: { shifts: number; hours: number } } = {};
  checkIns.forEach(ci => {
    const date = new Date(ci.check_in_time);
    const weekNum = Math.ceil(date.getDate() / 7);
    if (!weeklyStats[weekNum]) {
      weeklyStats[weekNum] = { shifts: 0, hours: 0 };
    }
    weeklyStats[weekNum].shifts += 1;
    if (ci.check_out_time) {
      const checkIn = new Date(ci.check_in_time);
      const checkOut = new Date(ci.check_out_time);
      const hours = (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60);
      weeklyStats[weekNum].hours += hours;
    }
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
            <h1 className="text-lg font-bold text-gray-800">Thống Kê</h1>
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

          {/* Main Stats Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <div className="bg-white rounded-xl shadow-md p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">{totalShifts}</div>
              <div className="text-xs text-gray-600 mt-1">Tổng ca</div>
            </div>
            <div className="bg-white rounded-xl shadow-md p-4 text-center">
              <div className="text-2xl font-bold text-purple-600">{totalHours.toFixed(1)}h</div>
              <div className="text-xs text-gray-600 mt-1">Tổng giờ</div>
            </div>
            <div className="bg-white rounded-xl shadow-md p-4 text-center">
              <div className="text-2xl font-bold text-green-600">{attendanceRate.toFixed(0)}%</div>
              <div className="text-xs text-gray-600 mt-1">Đúng giờ</div>
            </div>
            <div className="bg-white rounded-xl shadow-md p-4 text-center">
              <div className="text-2xl font-bold text-orange-600">{avgHoursPerWeek.toFixed(1)}h</div>
              <div className="text-xs text-gray-600 mt-1">TB/tuần</div>
            </div>
          </div>

          {/* Additional Stats */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="bg-white rounded-xl shadow-md p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Ca hoàn thành</span>
                <span className="text-lg font-bold text-green-600">{completedShifts}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-green-600 h-2 rounded-full transition-all"
                  style={{ width: `${completionRate}%` }}
                />
              </div>
              <div className="text-xs text-gray-500 mt-1">{completionRate.toFixed(0)}%</div>
            </div>

            <div className="bg-white rounded-xl shadow-md p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Ca chưa hoàn thành</span>
                <span className="text-lg font-bold text-orange-600">{incompleteShifts}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-orange-600 h-2 rounded-full transition-all"
                  style={{ width: `${100 - completionRate}%` }}
                />
              </div>
              <div className="text-xs text-gray-500 mt-1">{(100 - completionRate).toFixed(0)}%</div>
            </div>
          </div>

          {/* Estimated Salary */}
          {estimatedSalary !== null && (
            <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-6 mb-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm opacity-90 mb-1">Lương ước tính tháng này</div>
                  <div className="text-3xl font-bold">{estimatedSalary.toLocaleString()}đ</div>
                  <div className="text-xs opacity-75 mt-1">
                    {totalHours.toFixed(1)}h × {staffMember.hour_rate?.toLocaleString()}đ/giờ
                  </div>
                </div>
                <svg className="w-12 h-12 opacity-75" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
          )}

          {/* Attendance Breakdown */}
          <div className="bg-white rounded-xl shadow-md p-4 mb-6">
            <h3 className="font-bold text-gray-800 mb-4">Phân Tích Điểm Danh</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-24 text-sm text-gray-600">Đúng giờ</div>
                <div className="flex-1 bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-green-500 h-3 rounded-full transition-all"
                    style={{ width: `${(onTimeShifts / (totalShifts || 1)) * 100}%` }}
                  />
                </div>
                <div className="w-16 text-right text-sm font-semibold text-green-600">
                  {onTimeShifts} ca
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-24 text-sm text-gray-600">Muộn</div>
                <div className="flex-1 bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-orange-500 h-3 rounded-full transition-all"
                    style={{ width: `${(lateShifts / (totalShifts || 1)) * 100}%` }}
                  />
                </div>
                <div className="w-16 text-right text-sm font-semibold text-orange-600">
                  {lateShifts} ca
                </div>
              </div>
            </div>
          </div>

          {/* Weekly Breakdown */}
          {Object.keys(weeklyStats).length > 0 && (
            <div className="bg-white rounded-xl shadow-md p-4 mb-6">
              <h3 className="font-bold text-gray-800 mb-4">Theo Tuần</h3>
              <div className="space-y-3">
                {Object.entries(weeklyStats)
                  .sort(([a], [b]) => parseInt(a) - parseInt(b))
                  .map(([weekNum, stats]) => (
                    <div key={weekNum} className="border-b border-gray-100 pb-3 last:border-0">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold text-gray-700">Tuần {weekNum}</span>
                        <div className="text-xs text-gray-500">
                          {stats.shifts} ca • {stats.hours.toFixed(1)}h
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-500 h-2 rounded-full transition-all"
                            style={{ width: `${(stats.hours / (totalHours || 1)) * 100}%` }}
                          />
                        </div>
                        <span className="text-xs font-semibold text-blue-600">
                          {totalHours > 0 ? ((stats.hours / totalHours) * 100).toFixed(0) : 0}%
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* By Shift Type */}
          {Object.keys(shiftStats).length > 0 && (
            <div className="bg-white rounded-xl shadow-md p-4">
              <h3 className="font-bold text-gray-800 mb-4">Theo Loại Ca</h3>
              <div className="space-y-3">
                {Object.entries(shiftStats)
                  .sort(([, a], [, b]) => b.count - a.count)
                  .map(([shiftId, stats]) => (
                    <div key={shiftId} className="border-b border-gray-100 pb-3 last:border-0">
                      <div className="flex items-center gap-2 mb-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: getShiftColor(shiftId) }}
                        />
                        <span className="font-semibold text-gray-800 text-sm flex-1">
                          {getShiftName(shiftId)}
                        </span>
                        <span className="text-xs text-gray-500">
                          {stats.count} ca • {stats.hours.toFixed(1)}h
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="flex items-center justify-between bg-green-50 px-2 py-1 rounded">
                          <span className="text-gray-600">Đúng giờ:</span>
                          <span className="font-semibold text-green-600">{stats.onTime}</span>
                        </div>
                        <div className="flex items-center justify-between bg-orange-50 px-2 py-1 rounded">
                          <span className="text-gray-600">Muộn:</span>
                          <span className="font-semibold text-orange-600">{stats.late}</span>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {totalShifts === 0 && (
            <div className="bg-white rounded-xl shadow-md p-8 text-center">
              <div className="text-gray-400 text-3xl mb-2">📊</div>
              <p className="text-gray-600">Không có dữ liệu trong tháng này</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
