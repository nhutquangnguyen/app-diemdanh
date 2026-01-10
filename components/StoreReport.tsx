'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Store, CheckIn, Staff, StaffSchedule, ShiftTemplate } from '@/types';

export interface StaffReport {
  staff: Staff;
  totalDays: number;
  presentDays: number;
  absentDays: number;
  lateDays: number;
  lateMinutes: number;
  totalHours: number;
  totalSalary: number;
  attendanceRate: number;
  onTimeDays: number;
  avgCheckInTime: string;
  scheduledShifts: number;
  shiftsAttended: number;
  shiftsMissed: number;
  shiftsLate: number;
  shiftsOnTime: number;
}

interface StoreReportProps {
  storeId: string;
}

export default function StoreReport({ storeId }: StoreReportProps) {

  const [store, setStore] = useState<Store | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [reportData, setReportData] = useState<StaffReport[]>([]);

  // Time period state
  const [periodType, setPeriodType] = useState<'this_month' | 'last_month' | 'custom'>('this_month');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Search and sort state
  const [searchTerm, setSearchTerm] = useState('');
  const [sortColumn, setSortColumn] = useState<keyof StaffReport | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Details section state
  const [detailsExpanded, setDetailsExpanded] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [checkInsData, setCheckInsData] = useState<CheckIn[]>([]);
  const [staffData, setStaffData] = useState<Staff[]>([]);
  const [schedulesData, setSchedulesData] = useState<StaffSchedule[]>([]);
  const [shiftsData, setShiftsData] = useState<ShiftTemplate[]>([]);

  // Calculate date range based on period type
  function getDateRange(): { start: Date; end: Date } {
    const now = new Date();
    let start: Date;
    let end: Date;

    if (periodType === 'this_month') {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    } else if (periodType === 'last_month') {
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      end = new Date(now.getFullYear(), now.getMonth(), 0);
    } else {
      start = customStartDate ? new Date(customStartDate) : new Date(now.getFullYear(), now.getMonth(), 1);
      end = customEndDate ? new Date(customEndDate) : new Date();
    }

    return { start, end };
  }

  useEffect(() => {
    loadReportData();
  }, [storeId]);

  useEffect(() => {
    // Only refresh data when period changes (not initial load)
    if (store) {
      loadReportData(true);
    }
  }, [periodType, customStartDate, customEndDate]);

  async function loadReportData(isRefresh = false) {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    try {
      // Load store
      const { data: storeData, error: storeError } = await supabase
        .from('stores')
        .select('*')
        .eq('id', storeId)
        .single();

      if (storeError) throw storeError;
      setStore(storeData);

      // Load staff
      const { data: staffDataResult, error: staffError } = await supabase
        .from('staff')
        .select('*')
        .eq('store_id', storeId);

      if (staffError) throw staffError;
      setStaffData(staffDataResult || []);

      // Load check-ins for the period
      const { start, end } = getDateRange();
      const { data: checkInsDataResult, error: checkInsError } = await supabase
        .from('check_ins')
        .select('*')
        .eq('store_id', storeId)
        .gte('check_in_time', start.toISOString())
        .lte('check_in_time', end.toISOString())
        .order('check_in_time', { ascending: true });

      if (checkInsError) throw checkInsError;
      setCheckInsData(checkInsDataResult || []);

      // Load schedules for the period
      const { data: schedulesDataResult, error: schedulesError } = await supabase
        .from('staff_schedules')
        .select('*')
        .eq('store_id', storeId)
        .gte('scheduled_date', start.toISOString().split('T')[0])
        .lte('scheduled_date', end.toISOString().split('T')[0]);

      if (schedulesError) throw schedulesError;
      setSchedulesData(schedulesDataResult || []);

      // Load shift templates
      const { data: shiftsDataResult, error: shiftsError } = await supabase
        .from('shift_templates')
        .select('*')
        .eq('store_id', storeId);

      if (shiftsError) throw shiftsError;
      setShiftsData(shiftsDataResult || []);

      // Calculate report for each staff
      const reports: StaffReport[] = (staffDataResult || []).map((staff) => {
        const staffCheckIns = (checkInsDataResult || []).filter(c => c.staff_id === staff.id);
        const staffSchedules = (schedulesDataResult || []).filter(s => s.staff_id === staff.id);

        // Shift-based metrics
        const scheduledShifts = staffSchedules.length;
        let shiftsAttended = 0;
        let shiftsLate = 0;
        let shiftsOnTime = 0;
        let totalLateMinutes = 0;
        let totalHours = 0;

        // Map to track check-ins by date
        const checkInsByDate = new Map<string, CheckIn[]>();
        staffCheckIns.forEach(checkIn => {
          const date = new Date(checkIn.check_in_time).toISOString().split('T')[0];
          if (!checkInsByDate.has(date)) {
            checkInsByDate.set(date, []);
          }
          checkInsByDate.get(date)!.push(checkIn);
        });

        // For each scheduled shift, check if staff attended and if they were on time
        staffSchedules.forEach(schedule => {
          const shift = (shiftsDataResult || []).find(s => s.id === schedule.shift_template_id);
          if (!shift) return;

          const checkInsOnDate = checkInsByDate.get(schedule.scheduled_date) || [];

          if (checkInsOnDate.length > 0) {
            // Staff checked in on this date - find the check-in closest to shift start time
            const shiftDateTime = new Date(`${schedule.scheduled_date}T${shift.start_time}`);

            // Find check-in closest to shift start (could be multiple check-ins per day)
            let closestCheckIn = checkInsOnDate[0];
            let minTimeDiff = Math.abs(new Date(checkInsOnDate[0].check_in_time).getTime() - shiftDateTime.getTime());

            checkInsOnDate.forEach(checkIn => {
              const timeDiff = Math.abs(new Date(checkIn.check_in_time).getTime() - shiftDateTime.getTime());
              if (timeDiff < minTimeDiff) {
                minTimeDiff = timeDiff;
                closestCheckIn = checkIn;
              }
            });

            shiftsAttended++;

            // Check if they were late (beyond grace period)
            const checkInTime = new Date(closestCheckIn.check_in_time);
            const gracePeriodMs = shift.grace_period_minutes * 60 * 1000;
            const lateBy = checkInTime.getTime() - shiftDateTime.getTime();

            if (lateBy > gracePeriodMs) {
              shiftsLate++;
              totalLateMinutes += Math.floor(lateBy / 60000);
            } else {
              shiftsOnTime++;
            }

            // Calculate hours worked for this shift
            if (closestCheckIn.check_out_time) {
              const checkOutTime = new Date(closestCheckIn.check_out_time).getTime();
              const checkInTimeMs = checkInTime.getTime();
              const durationHours = (checkOutTime - checkInTimeMs) / (1000 * 60 * 60);
              totalHours += durationHours;
            } else {
              // If no check-out, assume they worked the scheduled shift hours
              const [startHour, startMin] = shift.start_time.split(':').map(Number);
              const [endHour, endMin] = shift.end_time.split(':').map(Number);
              const scheduledHours = (endHour * 60 + endMin - startHour * 60 - startMin) / 60;
              totalHours += scheduledHours;
            }
          }
        });

        const shiftsMissed = scheduledShifts - shiftsAttended;

        // Round to 1 decimal place
        totalHours = Math.round(totalHours * 10) / 10;

        // For non-shift based check-ins (if any), also count them
        // This handles cases where staff checked in but weren't scheduled
        const uniqueDays = new Set(
          staffCheckIns.map(c => new Date(c.check_in_time).toISOString().split('T')[0])
        );
        const presentDays = uniqueDays.size;

        // Calculate total days in period
        const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

        // Calculate attendance rate based on scheduled shifts
        const attendanceRate = scheduledShifts > 0 ? (shiftsAttended / scheduledShifts) * 100 : 0;

        // Calculate average check-in time
        let avgCheckInTime = '--:--';
        if (staffCheckIns.length > 0) {
          const totalMinutes = staffCheckIns.reduce((sum, c) => {
            const time = new Date(c.check_in_time);
            return sum + (time.getHours() * 60 + time.getMinutes());
          }, 0);
          const avgMinutes = Math.floor(totalMinutes / staffCheckIns.length);
          const hours = Math.floor(avgMinutes / 60);
          const mins = avgMinutes % 60;
          avgCheckInTime = `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
        }

        // Calculate total salary based on hours worked and hourly rate
        const totalSalary = totalHours * (staff.hour_rate || 0);

        // Legacy metrics (kept for backward compatibility)
        const lateCheckIns = staffCheckIns.filter(c => c.status === 'late');
        const lateDays = new Set(
          lateCheckIns.map(c => new Date(c.check_in_time).toDateString())
        ).size;
        const onTimeDays = presentDays - lateDays;

        return {
          staff,
          totalDays,
          presentDays,
          absentDays: totalDays - presentDays,
          lateDays,
          lateMinutes: totalLateMinutes,
          totalHours,
          totalSalary,
          attendanceRate,
          onTimeDays,
          avgCheckInTime,
          scheduledShifts,
          shiftsAttended,
          shiftsMissed,
          shiftsLate,
          shiftsOnTime,
        };
      });

      setReportData(reports);
    } catch (error) {
      console.error('Error loading report:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  function handleSort(column: keyof StaffReport) {
    if (sortColumn === column) {
      // Toggle direction if same column
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // New column, default to descending
      setSortColumn(column);
      setSortDirection('desc');
    }
  }

  // Filter and sort report data
  const filteredAndSortedData = reportData
    .filter((report) => {
      if (!searchTerm) return true;
      const search = searchTerm.toLowerCase();
      return (
        (report.staff.name && report.staff.name.toLowerCase().includes(search)) ||
        report.staff.full_name.toLowerCase().includes(search) ||
        report.staff.email.toLowerCase().includes(search)
      );
    })
    .sort((a, b) => {
      if (!sortColumn) return 0;

      let aValue = a[sortColumn];
      let bValue = b[sortColumn];

      // Handle nested staff object
      if (sortColumn === 'staff') {
        aValue = a.staff.name || a.staff.full_name;
        bValue = b.staff.name || b.staff.full_name;
      }

      // Compare values
      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

  function exportToCSV() {
    if (!store) return;

    const { start, end } = getDateRange();
    const periodLabel = `${start.toLocaleDateString('vi-VN')} - ${end.toLocaleDateString('vi-VN')}`;

    // Create CSV content
    const headers = [
      'Tên nhân viên',
      'Email',
      'Ca được xếp',
      'Ca đã làm',
      'Ca vắng',
      'Ca đi trễ',
      'Ca đúng giờ',
      'Tổng phút trễ',
      'Tổng giờ làm',
      'Lương giờ (VNĐ)',
      'Tổng lương (VNĐ)',
      'Giờ vào TB',
      'Tỷ lệ chuyên cần (%)',
    ];

    const rows = filteredAndSortedData.map(r => [
      r.staff.name || r.staff.full_name,
      r.staff.email,
      r.scheduledShifts,
      r.shiftsAttended,
      r.shiftsMissed,
      r.shiftsLate,
      r.shiftsOnTime,
      r.lateMinutes,
      `${r.totalHours}h`,
      new Intl.NumberFormat('vi-VN').format(r.staff.hour_rate || 0),
      new Intl.NumberFormat('vi-VN').format(r.totalSalary),
      r.avgCheckInTime,
      r.attendanceRate.toFixed(1),
    ]);

    const csvContent = [
      [`Báo cáo chuyên cần - ${store.name}`],
      [`Kỳ báo cáo: ${periodLabel}`],
      [],
      headers,
      ...rows,
    ]
      .map(row => row.join(','))
      .join('\n');

    // Add BOM for UTF-8 encoding (Excel compatibility)
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', `bao-cao-${store.name}-${start.toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Calculate summary statistics
  const totalStaff = reportData.length;
  const avgAttendanceRate = totalStaff > 0
    ? reportData.reduce((sum, r) => sum + r.attendanceRate, 0) / totalStaff
    : 0;
  const totalLateDays = reportData.reduce((sum, r) => sum + r.lateDays, 0);
  const bestStaff = reportData.length > 0
    ? reportData.reduce((best, current) =>
        current.attendanceRate > best.attendanceRate ? current : best
      )
    : null;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!store) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Không tìm thấy cửa hàng</h2>
          <Link href="/owner" className="text-blue-600 hover:underline">
            Quay lại trang chủ
          </Link>
        </div>
      </div>
    );
  }

  const { start, end } = getDateRange();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-800">Báo Cáo Chuyên Cần</h2>
        <p className="text-sm text-gray-600">{store.name}</p>
      </div>

      {/* Time Period Selector */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Chọn Kỳ Báo Cáo</h2>

        <div className="flex flex-wrap gap-3 mb-4">
            <button
              onClick={() => setPeriodType('this_month')}
              className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                periodType === 'this_month'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Tháng này
            </button>
            <button
              onClick={() => setPeriodType('last_month')}
              className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                periodType === 'last_month'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Tháng trước
            </button>
            <button
              onClick={() => setPeriodType('custom')}
              className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                periodType === 'custom'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Tùy chỉnh
            </button>
          </div>

          {periodType === 'custom' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Từ ngày</label>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Đến ngày</label>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                />
              </div>
            </div>
          )}

          <div className="mt-4 p-3 bg-purple-50 rounded-lg">
            <p className="text-sm text-gray-700">
              <span className="font-semibold">Kỳ báo cáo:</span>{' '}
              {start.toLocaleDateString('vi-VN')} - {end.toLocaleDateString('vi-VN')}
            </p>
          </div>
        </div>

      {/* Summary Statistics */}
      <div className="bg-white rounded-lg shadow-lg p-6 relative">
          {refreshing && (
            <div className="absolute inset-0 bg-white/75 z-10 rounded-lg"></div>
          )}
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Tổng Quan</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
              <div className="text-3xl font-bold text-blue-600 mb-1">{totalStaff}</div>
              <div className="text-sm text-gray-600">Tổng nhân viên</div>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
              <div className="text-3xl font-bold text-green-600 mb-1">{avgAttendanceRate.toFixed(1)}%</div>
              <div className="text-sm text-gray-600">TB chuyên cần</div>
            </div>
            <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4 border border-orange-200">
              <div className="text-3xl font-bold text-orange-600 mb-1">{totalLateDays}</div>
              <div className="text-sm text-gray-600">Tổng lần trễ</div>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
              <div className="text-xl font-bold text-purple-600 mb-1 truncate">
                {bestStaff ? ((bestStaff.staff.name || bestStaff.staff.full_name).split(' ').slice(-2).join(' ')) : 'N/A'}
              </div>
              <div className="text-sm text-gray-600">Xuất sắc nhất</div>
            </div>
          </div>
        </div>

      {/* Report Table */}
      <div className="bg-white rounded-lg shadow-lg overflow-hidden relative">
          {refreshing && (
            <div className="absolute inset-0 bg-white/75 z-10 flex items-center justify-center">
              <div className="flex items-center gap-3 bg-white px-6 py-3 rounded-lg shadow-lg">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600"></div>
                <span className="text-gray-700 font-semibold">Đang tải dữ liệu...</span>
              </div>
            </div>
          )}
          <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
              <h2 className="text-lg font-semibold text-gray-800">Chi Tiết Chuyên Cần</h2>
              <button
                onClick={exportToCSV}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>Xuất Excel</span>
              </button>
            </div>

            {/* Search Box */}
            <div>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Tìm kiếm theo tên hoặc email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                />
                <svg
                  className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
              {searchTerm && (
                <div className="mt-2 text-sm text-gray-600">
                  Hiển thị {filteredAndSortedData.length} / {reportData.length} nhân viên
                </div>
              )}
            </div>
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th
                    onClick={() => handleSort('staff')}
                    className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      Nhân viên
                      {sortColumn === 'staff' && (
                        <svg className={`w-4 h-4 ${sortDirection === 'asc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      )}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('scheduledShifts')}
                    className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center justify-center gap-2">
                      Ca xếp
                      {sortColumn === 'scheduledShifts' && (
                        <svg className={`w-4 h-4 ${sortDirection === 'asc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      )}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('shiftsAttended')}
                    className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center justify-center gap-2">
                      Ca làm
                      {sortColumn === 'shiftsAttended' && (
                        <svg className={`w-4 h-4 ${sortDirection === 'asc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      )}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('shiftsMissed')}
                    className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center justify-center gap-2">
                      Ca vắng
                      {sortColumn === 'shiftsMissed' && (
                        <svg className={`w-4 h-4 ${sortDirection === 'asc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      )}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('shiftsLate')}
                    className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center justify-center gap-2">
                      Ca trễ
                      {sortColumn === 'shiftsLate' && (
                        <svg className={`w-4 h-4 ${sortDirection === 'asc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      )}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('shiftsOnTime')}
                    className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center justify-center gap-2">
                      Ca đúng giờ
                      {sortColumn === 'shiftsOnTime' && (
                        <svg className={`w-4 h-4 ${sortDirection === 'asc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      )}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('lateMinutes')}
                    className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center justify-center gap-2">
                      Phút trễ
                      {sortColumn === 'lateMinutes' && (
                        <svg className={`w-4 h-4 ${sortDirection === 'asc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      )}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('totalHours')}
                    className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center justify-center gap-2">
                      Tổng giờ
                      {sortColumn === 'totalHours' && (
                        <svg className={`w-4 h-4 ${sortDirection === 'asc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      )}
                    </div>
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Lương/giờ
                  </th>
                  <th
                    onClick={() => handleSort('totalSalary')}
                    className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center justify-center gap-2">
                      Tổng lương
                      {sortColumn === 'totalSalary' && (
                        <svg className={`w-4 h-4 ${sortDirection === 'asc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      )}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('attendanceRate')}
                    className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center justify-center gap-2">
                      Chuyên cần
                      {sortColumn === 'attendanceRate' && (
                        <svg className={`w-4 h-4 ${sortDirection === 'asc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      )}
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredAndSortedData.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="px-4 py-8 text-center text-gray-500">
                      {searchTerm ? 'Không tìm thấy kết quả phù hợp' : 'Không có dữ liệu trong kỳ báo cáo này'}
                    </td>
                  </tr>
                ) : (
                  filteredAndSortedData.map((report) => {
                    const displayName = report.staff.name || report.staff.full_name;
                    const initials = displayName
                      ?.split(' ')
                      .slice(-2)
                      .map((n: string) => n[0])
                      .join('')
                      .toUpperCase() || '??';

                    const attendanceColor =
                      report.attendanceRate >= 95 ? 'text-green-600 bg-green-100' :
                      report.attendanceRate >= 85 ? 'text-yellow-600 bg-yellow-100' :
                      'text-red-600 bg-red-100';

                    return (
                      <tr key={report.staff.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                              {initials}
                            </div>
                            <div>
                              <div className="font-semibold text-gray-800">{report.staff.name || report.staff.full_name}</div>
                              <div className="text-xs text-gray-500">{report.staff.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center text-sm font-semibold text-gray-700">
                          {report.scheduledShifts}
                        </td>
                        <td className="px-4 py-3 text-center text-sm text-green-600 font-semibold">
                          {report.shiftsAttended}
                        </td>
                        <td className="px-4 py-3 text-center text-sm text-red-600 font-semibold">
                          {report.shiftsMissed}
                        </td>
                        <td className="px-4 py-3 text-center text-sm text-orange-600 font-semibold">
                          {report.shiftsLate}
                        </td>
                        <td className="px-4 py-3 text-center text-sm text-blue-600 font-semibold">
                          {report.shiftsOnTime}
                        </td>
                        <td className="px-4 py-3 text-center text-sm text-gray-700">
                          {report.lateMinutes}
                        </td>
                        <td className="px-4 py-3 text-center text-sm font-semibold text-gray-700">
                          {report.totalHours}h
                        </td>
                        <td className="px-4 py-3 text-center text-sm text-green-600">
                          {new Intl.NumberFormat('vi-VN').format(report.staff.hour_rate || 0)}
                        </td>
                        <td className="px-4 py-3 text-center text-sm font-bold text-green-600">
                          {new Intl.NumberFormat('vi-VN').format(report.totalSalary)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-block px-3 py-1 rounded-full text-sm font-bold ${attendanceColor}`}>
                            {report.attendanceRate.toFixed(1)}%
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden px-4 py-4 space-y-3">
            {filteredAndSortedData.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                {searchTerm ? 'Không tìm thấy kết quả phù hợp' : 'Không có dữ liệu trong kỳ báo cáo này'}
              </div>
            ) : (
              filteredAndSortedData.map((report) => {
                const displayName = report.staff.name || report.staff.full_name;
                const initials = displayName
                  ?.split(' ')
                  .slice(-2)
                  .map((n: string) => n[0])
                  .join('')
                  .toUpperCase() || '??';

                const attendanceColor =
                  report.attendanceRate >= 95 ? 'text-green-600 bg-green-100' :
                  report.attendanceRate >= 85 ? 'text-yellow-600 bg-yellow-100' :
                  'text-red-600 bg-red-100';

                return (
                  <div key={report.staff.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                    {/* Header */}
                    <div className="flex items-center gap-3 mb-4 pb-3 border-b border-gray-100">
                      <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
                        {initials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-gray-800 truncate mb-1">{report.staff.name || report.staff.full_name}</div>
                        <div className="text-xs text-gray-500 truncate">{report.staff.email}</div>
                      </div>
                      <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold flex-shrink-0 ${attendanceColor}`}>
                        {report.attendanceRate.toFixed(1)}%
                      </span>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-gray-50 rounded-lg p-3">
                        <div className="text-xs text-gray-600 mb-1">Ca xếp</div>
                        <div className="text-lg font-bold text-gray-800">{report.scheduledShifts}</div>
                      </div>
                      <div className="bg-green-50 rounded-lg p-3">
                        <div className="text-xs text-gray-600 mb-1">Ca làm</div>
                        <div className="text-lg font-bold text-green-600">{report.shiftsAttended}</div>
                      </div>
                      <div className="bg-red-50 rounded-lg p-3">
                        <div className="text-xs text-gray-600 mb-1">Ca vắng</div>
                        <div className="text-lg font-bold text-red-600">{report.shiftsMissed}</div>
                      </div>
                      <div className="bg-orange-50 rounded-lg p-3">
                        <div className="text-xs text-gray-600 mb-1">Ca trễ</div>
                        <div className="text-lg font-bold text-orange-600">{report.shiftsLate}</div>
                      </div>
                      <div className="bg-blue-50 rounded-lg p-3">
                        <div className="text-xs text-gray-600 mb-1">Ca đúng giờ</div>
                        <div className="text-lg font-bold text-blue-600">{report.shiftsOnTime}</div>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3">
                        <div className="text-xs text-gray-600 mb-1">Phút trễ</div>
                        <div className="text-lg font-bold text-gray-800">{report.lateMinutes}</div>
                      </div>
                    </div>

                    {/* Summary */}
                    <div className="mt-4 pt-3 border-t border-gray-100 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Tổng giờ:</span>
                        <span className="text-base font-bold text-gray-800">{report.totalHours}h</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Lương/giờ:</span>
                        <span className="text-base font-semibold text-green-600">
                          {new Intl.NumberFormat('vi-VN').format(report.staff.hour_rate || 0)}đ
                        </span>
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                        <span className="text-sm font-semibold text-gray-700">Tổng lương:</span>
                        <span className="text-lg font-bold text-green-600">
                          {new Intl.NumberFormat('vi-VN').format(report.totalSalary)}đ
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      {/* Check-in Details Section */}
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div
            className="px-6 py-4 border-b border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors"
            onClick={() => setDetailsExpanded(!detailsExpanded)}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-800">Chi Tiết Điểm Danh</h2>
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-600">
                  {checkInsData.length} lượt điểm danh
                </span>
                <svg
                  className={`w-5 h-5 text-gray-600 transition-transform ${detailsExpanded ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>

          {detailsExpanded && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Ngày
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Nhân viên
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Ca
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Giờ vào
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Ảnh vào
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Giờ ra
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Ảnh ra
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Thời gian làm
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {checkInsData.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                        Không có dữ liệu trong kỳ báo cáo này
                      </td>
                    </tr>
                  ) : (
                    (() => {
                      // Group check-ins by staff and date to determine shift numbers
                      const checkInsWithShift = checkInsData.map((checkIn) => {
                        const checkInDate = new Date(checkIn.check_in_time).toDateString();
                        const sameDay = checkInsData.filter(
                          (c) => c.staff_id === checkIn.staff_id && new Date(c.check_in_time).toDateString() === checkInDate
                        );
                        const sortedSameDay = sameDay.sort(
                          (a, b) => new Date(a.check_in_time).getTime() - new Date(b.check_in_time).getTime()
                        );
                        const shiftNumber = sortedSameDay.findIndex((c) => c.id === checkIn.id) + 1;
                        return { ...checkIn, shiftNumber };
                      });

                      // Sort the final array by check_in_time to ensure correct display order
                      const sortedCheckIns = checkInsWithShift.sort(
                        (a, b) => new Date(a.check_in_time).getTime() - new Date(b.check_in_time).getTime()
                      );

                      return sortedCheckIns.map((checkIn) => {
                        const staff = staffData.find((s) => s.id === checkIn.staff_id);
                        const checkInDate = new Date(checkIn.check_in_time);
                        const checkOutTime = checkIn.check_out_time ? new Date(checkIn.check_out_time) : null;

                        return (
                          <tr key={checkIn.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-3 text-sm text-gray-700">
                              {checkInDate.toLocaleDateString('vi-VN', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                              })}
                            </td>
                            <td className="px-4 py-3">
                              <div className="text-sm font-semibold text-gray-800">
                                {staff?.name || staff?.full_name || 'N/A'}
                              </div>
                              <div className="text-xs text-gray-500">{staff?.email || ''}</div>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-700">
                                Ca {checkIn.shiftNumber}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center text-sm text-gray-700">
                              {checkInDate.toLocaleTimeString('vi-VN', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </td>
                            <td className="px-4 py-3 text-center">
                              {checkIn.selfie_url ? (
                                <button
                                  onClick={() => setSelectedImage(checkIn.selfie_url)}
                                  className="inline-block hover:opacity-80 transition-opacity"
                                >
                                  <img
                                    src={checkIn.selfie_url}
                                    alt="Check-in selfie"
                                    className="w-20 h-20 object-cover rounded-lg border-2 border-gray-200 hover:border-purple-400 transition-colors"
                                  />
                                </button>
                              ) : (
                                <span className="text-xs text-gray-400">-</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-center text-sm text-gray-700">
                              {checkOutTime ? (
                                checkOutTime.toLocaleTimeString('vi-VN', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })
                              ) : (
                                <span className="text-xs text-gray-400">Chưa checkout</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-center">
                              {checkIn.checkout_selfie_url ? (
                                <button
                                  onClick={() => setSelectedImage(checkIn.checkout_selfie_url!)}
                                  className="inline-block hover:opacity-80 transition-opacity"
                                >
                                  <img
                                    src={checkIn.checkout_selfie_url}
                                    alt="Check-out selfie"
                                    className="w-20 h-20 object-cover rounded-lg border-2 border-gray-200 hover:border-purple-400 transition-colors"
                                  />
                                </button>
                              ) : (
                                <span className="text-xs text-gray-400">-</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-center text-sm font-semibold text-gray-700">
                              {checkOutTime ? (
                                (() => {
                                  const minutes = Math.floor((checkOutTime.getTime() - checkInDate.getTime()) / 1000 / 60);
                                  const hours = Math.floor(minutes / 60);
                                  const mins = minutes % 60;
                                  return `${hours}h ${mins}m`;
                                })()
                              ) : (
                                <span className="text-xs text-blue-600">Đang làm</span>
                              )}
                            </td>
                          </tr>
                        );
                      });
                    })()
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Image Modal */}
        {selectedImage && (
          <div
            className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedImage(null)}
          >
            <div className="relative max-w-4xl max-h-full">
              <button
                onClick={() => setSelectedImage(null)}
                className="absolute -top-10 right-0 text-white hover:text-gray-300 transition-colors"
              >
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <img
                src={selectedImage}
                alt="Full size selfie"
                className="max-w-full max-h-[90vh] object-contain rounded-lg"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>
        )}

        {/* Notes */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex gap-3">
            <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="text-sm text-gray-700">
              <p className="font-semibold mb-1">Hệ thống tính lương theo ca:</p>
              <ul className="list-disc list-inside space-y-1">
                <li><span className="font-semibold">Ca xếp:</span> Tổng số ca làm việc được xếp cho nhân viên trong kỳ báo cáo</li>
                <li><span className="font-semibold">Ca làm:</span> Số ca nhân viên đã check-in (có mặt)</li>
                <li><span className="font-semibold">Ca vắng:</span> Số ca được xếp nhưng nhân viên không check-in</li>
                <li><span className="font-semibold">Ca trễ:</span> Số ca check-in muộn hơn thời gian cho phép (quá grace period)</li>
                <li><span className="font-semibold">Tổng giờ:</span> Tính từ check-in đến check-out thực tế. Nếu chưa check-out, tính theo giờ ca</li>
                <li><span className="font-semibold">Tỷ lệ chuyên cần:</span> % ca đã làm / ca được xếp</li>
                <li><span className="font-semibold">Lương:</span> Tổng giờ làm × Lương/giờ</li>
              </ul>
            </div>
          </div>
        </div>
    </div>
  );
}
