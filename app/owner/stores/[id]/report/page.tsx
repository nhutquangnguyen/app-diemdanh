'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Store, CheckIn, Staff } from '@/types';
import Header from '@/components/Header';

interface StaffReport {
  staff: Staff;
  totalDays: number; // Total working days in period
  presentDays: number; // Days checked in
  absentDays: number; // Days scheduled but didn't show up
  lateDays: number; // Days checked in late
  lateMinutes: number; // Total minutes late
  totalHours: number; // Total hours worked
  attendanceRate: number; // Percentage
  onTimeDays: number; // Days checked in on time
  avgCheckInTime: string; // Average check-in time
}

export default function StoreReport() {
  const params = useParams();
  const storeId = params.id as string;

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
      const { data: staffData, error: staffError } = await supabase
        .from('staff')
        .select('*')
        .eq('store_id', storeId);

      if (staffError) throw staffError;

      // Load check-ins for the period
      const { start, end } = getDateRange();
      const { data: checkInsData, error: checkInsError } = await supabase
        .from('check_ins')
        .select('*')
        .eq('store_id', storeId)
        .gte('check_in_time', start.toISOString())
        .lte('check_in_time', end.toISOString())
        .order('check_in_time', { ascending: true });

      if (checkInsError) throw checkInsError;

      // Calculate report for each staff
      const reports: StaffReport[] = (staffData || []).map((staff) => {
        const staffCheckIns = (checkInsData || []).filter(c => c.staff_id === staff.id);

        // Count unique days (in case of multiple check-ins per day)
        const uniqueDays = new Set(
          staffCheckIns.map(c => new Date(c.check_in_time).toDateString())
        );
        const presentDays = uniqueDays.size;

        // Calculate total days in period (for now, simplified to days between dates)
        const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

        // Count late check-ins (status === 'late')
        const lateCheckIns = staffCheckIns.filter(c => c.status === 'late');
        const lateDays = new Set(
          lateCheckIns.map(c => new Date(c.check_in_time).toDateString())
        ).size;

        // Calculate total late minutes (mock for now - would need shift start times)
        const lateMinutes = lateDays * 15; // Assume 15 min average late

        // Calculate total hours worked
        let totalHours = 0;
        staffCheckIns.forEach(checkIn => {
          // Mock: assume 8 hours per check-in (would need check-out times)
          totalHours += 8;
        });

        // Calculate on-time days
        const onTimeDays = presentDays - lateDays;

        // Calculate attendance rate
        const attendanceRate = totalDays > 0 ? (presentDays / totalDays) * 100 : 0;

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

        return {
          staff,
          totalDays,
          presentDays,
          absentDays: totalDays - presentDays,
          lateDays,
          lateMinutes,
          totalHours,
          attendanceRate,
          onTimeDays,
          avgCheckInTime,
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
        aValue = a.staff.full_name;
        bValue = b.staff.full_name;
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
      'Số ngày công',
      'Số ngày vắng',
      'Số lần đi trễ',
      'Tổng phút trễ',
      'Số ngày đúng giờ',
      'Tổng giờ làm',
      'Giờ vào TB',
      'Tỷ lệ chuyên cần (%)',
    ];

    const rows = filteredAndSortedData.map(r => [
      r.staff.full_name,
      r.staff.email,
      r.presentDays,
      r.absentDays,
      r.lateDays,
      r.lateMinutes,
      r.onTimeDays,
      `${r.totalHours}h`,
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <Link href={`/owner/stores/${storeId}`}>
              <button className="text-gray-600 hover:text-gray-800">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            </Link>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Báo Cáo Chuyên Cần</h1>
              <p className="text-sm text-gray-600">{store.name}</p>
            </div>
          </div>
        </div>

        {/* Time Period Selector */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
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
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6 relative">
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
                {bestStaff?.staff.full_name.split(' ').slice(-2).join(' ') || 'N/A'}
              </div>
              <div className="text-sm text-gray-600">Xuất sắc nhất</div>
            </div>
          </div>
        </div>

        {/* Report Table */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden mb-6 relative">
          {refreshing && (
            <div className="absolute inset-0 bg-white/75 z-10 flex items-center justify-center">
              <div className="flex items-center gap-3 bg-white px-6 py-3 rounded-lg shadow-lg">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600"></div>
                <span className="text-gray-700 font-semibold">Đang tải dữ liệu...</span>
              </div>
            </div>
          )}
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-800">Chi Tiết Chuyên Cần</h2>
              <button
                onClick={exportToCSV}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-semibold flex items-center gap-2 transition-all"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Xuất Excel
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

          <div className="overflow-x-auto">
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
                    onClick={() => handleSort('presentDays')}
                    className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center justify-center gap-2">
                      Ngày công
                      {sortColumn === 'presentDays' && (
                        <svg className={`w-4 h-4 ${sortDirection === 'asc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      )}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('absentDays')}
                    className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center justify-center gap-2">
                      Vắng
                      {sortColumn === 'absentDays' && (
                        <svg className={`w-4 h-4 ${sortDirection === 'asc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      )}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('lateDays')}
                    className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center justify-center gap-2">
                      Đi trễ
                      {sortColumn === 'lateDays' && (
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
                    onClick={() => handleSort('onTimeDays')}
                    className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center justify-center gap-2">
                      Đúng giờ
                      {sortColumn === 'onTimeDays' && (
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
                    Giờ vào TB
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
                    <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                      {searchTerm ? 'Không tìm thấy kết quả phù hợp' : 'Không có dữ liệu trong kỳ báo cáo này'}
                    </td>
                  </tr>
                ) : (
                  filteredAndSortedData.map((report) => {
                    const initials = report.staff.full_name
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
                              <div className="font-semibold text-gray-800">{report.staff.full_name}</div>
                              <div className="text-xs text-gray-500">{report.staff.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center text-sm font-semibold text-gray-700">
                          {report.presentDays}/{report.totalDays}
                        </td>
                        <td className="px-4 py-3 text-center text-sm text-gray-700">
                          {report.absentDays}
                        </td>
                        <td className="px-4 py-3 text-center text-sm text-gray-700">
                          {report.lateDays}
                        </td>
                        <td className="px-4 py-3 text-center text-sm text-gray-700">
                          {report.lateMinutes}
                        </td>
                        <td className="px-4 py-3 text-center text-sm text-gray-700">
                          {report.onTimeDays}
                        </td>
                        <td className="px-4 py-3 text-center text-sm font-semibold text-gray-700">
                          {report.totalHours}h
                        </td>
                        <td className="px-4 py-3 text-center text-sm text-gray-700">
                          {report.avgCheckInTime}
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
        </div>

        {/* Notes */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex gap-3">
            <svg className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="text-sm text-gray-700">
              <p className="font-semibold mb-1">Lưu ý:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Tổng giờ làm được tính dựa trên check-in (8h/ngày). Cần thêm check-out để chính xác hơn.</li>
                <li>Phút trễ tính gần đúng. Cần thiết lập ca làm việc để tính chính xác.</li>
                <li>Số ngày công = số ngày có check-in thành công trong kỳ.</li>
              </ul>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
