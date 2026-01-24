import { useState } from 'react';
import { StaffSalaryCalculation, SalaryAdjustment } from '@/types';
import { formatAmount } from '@/lib/salaryCalculations';
import { shareSalaryPDF, downloadSalaryPDF } from '@/lib/salaryPDF';
import CheckInEditModal from './CheckInEditModal';
import { supabase } from '@/lib/supabase';

interface StaffSalaryDetailProps {
  calculation: StaffSalaryCalculation;
  storeName: string;
  onClose: () => void;
  onAddAdjustment: () => void;
  onEditAdjustment: (adjustment: SalaryAdjustment) => void;
  onDeleteAdjustment: (adjustmentId: string) => void;
  onTogglePaymentStatus: () => void;
  isPaid: boolean;
  onRefresh: () => void;
}

export default function StaffSalaryDetail({
  calculation,
  storeName,
  onClose,
  onAddAdjustment,
  onEditAdjustment,
  onDeleteAdjustment,
  onTogglePaymentStatus,
  isPaid,
  onRefresh,
}: StaffSalaryDetailProps) {
  const [editingCheckIn, setEditingCheckIn] = useState<{
    checkInId: string | null;
    scheduleId?: string;
    shiftTemplateId?: string;
    currentCheckInTime: string | null;
    currentCheckOutTime: string | null;
    expectedCheckInTime?: string;
    expectedCheckOutTime?: string;
    date: string;
    isAbsent?: boolean;
  } | null>(null);

  // Filter state for daily breakdown - allow multiple selections
  const [statusFilters, setStatusFilters] = useState<Array<'on_time' | 'late' | 'early_checkout' | 'overtime' | 'absent' | 'upcoming'>>([]);
  const [editedFilters, setEditedFilters] = useState<Array<'edited' | 'not_edited'>>([]);
  const [showFilters, setShowFilters] = useState(false);

  // Helper functions for multi-select
  const toggleStatusFilter = (status: typeof statusFilters[number]) => {
    if (statusFilters.includes(status)) {
      setStatusFilters(statusFilters.filter(s => s !== status));
    } else {
      setStatusFilters([...statusFilters, status]);
    }
  };

  const toggleEditedFilter = (edited: typeof editedFilters[number]) => {
    if (editedFilters.includes(edited)) {
      setEditedFilters(editedFilters.filter(e => e !== edited));
    } else {
      setEditedFilters([...editedFilters, edited]);
    }
  };

  const hasActiveFilters = statusFilters.length > 0 || editedFilters.length > 0;

  const displayName = calculation.staff.name || calculation.staff.full_name;
  const initials = displayName
    ?.split(' ')
    .slice(-2)
    .map((n: string) => n[0])
    .join('')
    .toUpperCase() || '??';

  const handleSharePDF = async () => {
    await shareSalaryPDF(calculation, storeName);
  };

  const handleDownloadPDF = async () => {
    await downloadSalaryPDF(calculation, storeName);
  };

  const handleSaveCheckInEdit = async (data: {
    checkInTime: string | null;
    checkOutTime: string | null;
    reason: string;
  }) => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError || !user) {
        alert('Phiên đăng nhập đã hết hạn');
        return;
      }

      const requestBody: any = {
        checkInId: editingCheckIn?.checkInId,
        checkInTime: data.checkInTime,
        checkOutTime: data.checkOutTime,
        reason: data.reason,
        userId: user.id,
      };

      // For absent days, include additional fields needed to create check-in
      if (!editingCheckIn?.checkInId && editingCheckIn?.scheduleId) {
        requestBody.scheduleId = editingCheckIn.scheduleId;
        requestBody.shiftTemplateId = editingCheckIn.shiftTemplateId;
        requestBody.staffId = calculation.staff.id;
        requestBody.storeId = calculation.staff.store_id;
      }

      const response = await fetch('/api/check-ins/edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error('Failed to save edit');
      }

      // Close the edit modal
      setEditingCheckIn(null);

      // Refresh salary calculations - this will update the parent state
      // and trigger a re-render with fresh calculation data
      await onRefresh();

      // Small delay to ensure React state has propagated
      // before the component re-renders with new calculation
      await new Promise(resolve => setTimeout(resolve, 300));

      console.log('✅ Check-in time updated successfully');
    } catch (error) {
      console.error('Error saving check-in edit:', error);
      throw error;
    }
  };

  // Helper function to parse time string to minutes
  const parseTimeToMinutes = (timeStr: string): number => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  };

  // Helper function to calculate hours difference
  const calculateHours = (startTime: string | Date, endTime: string | Date): number => {
    const start = new Date(startTime).getTime();
    const end = new Date(endTime).getTime();
    return (end - start) / (1000 * 60 * 60); // Convert to hours
  };

  // Helper function to parse shift time range (e.g., "18:30 - 22:30")
  const parseShiftTime = (shiftTime: string): { start: string; end: string; hours: number } | null => {
    const match = shiftTime.match(/(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/);
    if (!match) return null;

    const [_, start, end] = match;
    const startMinutes = parseTimeToMinutes(start);
    const endMinutes = parseTimeToMinutes(end);
    let totalMinutes = endMinutes - startMinutes;

    // Handle shifts that cross midnight
    if (totalMinutes < 0) {
      totalMinutes += 24 * 60;
    }

    const hours = totalMinutes / 60;
    return { start, end, hours };
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center z-50">
      <div className="bg-white w-full sm:max-w-2xl sm:rounded-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-sm bg-gradient-to-br from-blue-500 to-blue-600">
              {initials}
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-800">{calculation.staff.name || calculation.staff.full_name}</h2>
              <p className="text-sm text-gray-500">{calculation.staff.email}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Statistics */}
        <div className="bg-gray-50 p-3 sm:p-4 border-b border-gray-200">
          <h3 className="text-xs sm:text-sm font-bold text-gray-700 mb-2">📊 Thống kê chấm công</h3>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 sm:gap-2">
            {/* On Time */}
            <div className="bg-white rounded-lg p-2 sm:p-3 border border-green-200">
              <div className="text-center">
                <div className="text-lg sm:text-2xl font-bold text-green-600">
                  {calculation.daily_breakdown.filter(d => d.status === 'on_time').length}
                </div>
                <div className="text-[10px] sm:text-xs text-gray-600 mt-0.5 sm:mt-1">Đúng giờ</div>
              </div>
            </div>

            {/* Overtime */}
            <div className="bg-white rounded-lg p-2 sm:p-3 border border-purple-200">
              <div className="text-center">
                <div className="text-lg sm:text-2xl font-bold text-purple-600">
                  {calculation.daily_breakdown.filter(d => d.status === 'overtime').length}
                </div>
                <div className="text-[10px] sm:text-xs text-gray-600 mt-0.5 sm:mt-1">Tăng ca</div>
              </div>
            </div>

            {/* Late */}
            <div className="bg-white rounded-lg p-2 sm:p-3 border border-yellow-200">
              <div className="text-center">
                <div className="text-lg sm:text-2xl font-bold text-yellow-600">
                  {calculation.daily_breakdown.filter(d => d.status === 'late').length}
                </div>
                <div className="text-[10px] sm:text-xs text-gray-600 mt-0.5 sm:mt-1">Muộn</div>
              </div>
            </div>

            {/* Early Checkout */}
            <div className="bg-white rounded-lg p-2 sm:p-3 border border-orange-200">
              <div className="text-center">
                <div className="text-lg sm:text-2xl font-bold text-orange-600">
                  {calculation.daily_breakdown.filter(d => d.status === 'early_checkout').length}
                </div>
                <div className="text-[10px] sm:text-xs text-gray-600 mt-0.5 sm:mt-1">Về sớm</div>
              </div>
            </div>

            {/* Absent */}
            <div className="bg-white rounded-lg p-2 sm:p-3 border border-gray-200">
              <div className="text-center">
                <div className="text-lg sm:text-2xl font-bold text-gray-600">
                  {calculation.daily_breakdown.filter(d => d.status === 'absent').length}
                </div>
                <div className="text-[10px] sm:text-xs text-gray-600 mt-0.5 sm:mt-1">Vắng mặt</div>
              </div>
            </div>

            {/* Upcoming */}
            <div className="bg-white rounded-lg p-2 sm:p-3 border border-blue-200">
              <div className="text-center">
                <div className="text-lg sm:text-2xl font-bold text-blue-600">
                  {calculation.daily_breakdown.filter(d => d.status === 'upcoming').length}
                </div>
                <div className="text-[10px] sm:text-xs text-gray-600 mt-0.5 sm:mt-1">Chưa đến</div>
              </div>
            </div>
          </div>
        </div>

        {/* Total Amount */}
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-6">
          <div className="text-sm opacity-90 mb-1">Tổng lương</div>
          <div className="text-3xl font-bold mb-4">{formatAmount(calculation.final_amount)}đ</div>
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              onClick={handleDownloadPDF}
              className="flex-1 bg-white bg-opacity-20 hover:bg-opacity-30 text-white px-4 py-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Tải PDF
            </button>
            <button
              type="button"
              onClick={handleSharePDF}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
              Chia sẻ PDF
            </button>
            <button
              type="button"
              onClick={onTogglePaymentStatus}
              className={`flex-1 px-4 py-3 rounded-lg font-semibold transition-all ${
                isPaid
                  ? 'bg-white bg-opacity-20 hover:bg-opacity-30'
                  : 'bg-white text-blue-600 hover:bg-opacity-90'
              }`}
            >
              {isPaid ? '✓ Đã trả lương' : 'Đánh dấu đã trả'}
            </button>
          </div>
        </div>

        {/* Provisional Calculation */}
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-md font-bold text-gray-800 mb-3">📋 Tính toán tự động</h3>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Ca làm việc:</span>
              <span className="font-medium text-gray-900">
                {calculation.daily_breakdown.filter(d => d.status !== 'absent').length} ca
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Lương cơ bản:</span>
              <span className="font-medium text-gray-900">{formatAmount(calculation.provisional.base)}đ</span>
            </div>
            {calculation.provisional.late_deductions > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Phạt trễ:</span>
                <span className="font-medium text-red-600">-{formatAmount(calculation.provisional.late_deductions)}đ</span>
              </div>
            )}
            {calculation.provisional.early_deductions > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Phạt về sớm:</span>
                <span className="font-medium text-red-600">-{formatAmount(calculation.provisional.early_deductions)}đ</span>
              </div>
            )}
            {calculation.provisional.overtime > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Tăng ca:</span>
                <span className="font-medium text-green-600">+{formatAmount(calculation.provisional.overtime)}đ</span>
              </div>
            )}
            <div className="border-t border-gray-200 pt-2 flex justify-between">
              <span className="font-semibold text-gray-900">Tạm tính:</span>
              <span className="font-bold text-gray-900">{formatAmount(calculation.provisional.total)}đ</span>
            </div>
          </div>
        </div>

        {/* Adjustments */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-md font-bold text-gray-800">📝 Điều chỉnh</h3>
            <button
              type="button"
              onClick={onAddAdjustment}
              className="text-blue-600 hover:text-blue-700 font-semibold text-sm flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Thêm
            </button>
          </div>

          {calculation.adjustments.items.length === 0 ? (
            <div className="text-center py-6 text-gray-500">
              <p className="text-sm">Chưa có điều chỉnh nào</p>
            </div>
          ) : (
            <div className="space-y-2">
              {calculation.adjustments.items.map(adj => (
                <div key={adj.id} className="bg-gray-50 rounded-lg p-3">
                  <div className="flex justify-between items-start mb-1">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-semibold ${
                          adj.amount >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {adj.amount >= 0 ? '+' : ''}{formatAmount(adj.amount)}đ
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          adj.type === 'increase' || adj.amount >= 0
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {adj.type === 'increase' || adj.amount >= 0 ? 'Tăng' : 'Giảm'}
                        </span>
                      </div>
                      {adj.note && (
                        <p className="text-xs text-gray-600 mt-1">{adj.note}</p>
                      )}
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(adj.adjustment_date).toLocaleDateString('vi-VN')}
                      </p>
                    </div>
                    <div className="flex gap-1 ml-2">
                      <button
                        type="button"
                        onClick={() => onEditAdjustment(adj)}
                        className="p-1 hover:bg-gray-200 rounded text-blue-600"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteAdjustment(adj.id)}
                        className="p-1 hover:bg-gray-200 rounded text-red-600"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              <div className="border-t border-gray-200 pt-2 flex justify-between">
                <span className="font-semibold text-gray-900">Tổng điều chỉnh:</span>
                <span className={`font-bold ${
                  calculation.adjustments.total >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {calculation.adjustments.total >= 0 ? '+' : ''}{formatAmount(calculation.adjustments.total)}đ
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Daily Breakdown */}
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-md font-bold text-gray-800">📅 Chi tiết từng ngày</h3>

            {/* Filter Buttons */}
            <div className="flex items-center gap-2">
              {/* Clear Filter Button (X) - shows when filters are active */}
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={() => {
                    setStatusFilters([]);
                    setEditedFilters([]);
                  }}
                  className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
                  title="Xóa bộ lọc"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}

              {/* Filter Toggle Button */}
              <button
                type="button"
                onClick={() => setShowFilters(true)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold transition-all ${
                  hasActiveFilters
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
                <span>Lọc</span>
                {hasActiveFilters && (
                  <span className="flex items-center justify-center w-5 h-5 text-xs bg-white text-blue-600 rounded-full font-bold">
                    {statusFilters.length + editedFilters.length}
                  </span>
                )}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            {calculation.daily_breakdown
              .filter(day => {
                // Apply status filters (if any selected, match ANY of them)
                const statusMatch = statusFilters.length === 0 || statusFilters.includes(day.status as any);

                // Apply edited filters (if any selected, match ANY of them)
                let editedMatch = true;
                if (editedFilters.length > 0) {
                  editedMatch = editedFilters.some(filter => {
                    if (filter === 'edited') return day.is_edited === true;
                    if (filter === 'not_edited') return !day.is_edited;
                    return false;
                  });
                }

                return statusMatch && editedMatch;
              })
              .map((day, index) => (
              <div key={`${day.date}-${day.shift_name || 'shift'}-${index}`} className="bg-gray-50 rounded-lg p-3">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="font-semibold text-gray-800">
                      {new Date(day.date).toLocaleDateString('vi-VN', {
                        weekday: 'short',
                        day: '2-digit',
                        month: '2-digit'
                      })}
                    </div>
                    {day.shift_name && (
                      <div className="text-xs text-gray-600">{day.shift_name} ({day.shift_time})</div>
                    )}
                  </div>
                  <div className="text-right">
                    {day.status === 'absent' && (
                      <span className="text-xs px-2 py-1 rounded-full bg-gray-200 text-gray-600">Vắng mặt</span>
                    )}
                    {day.status === 'upcoming' && (
                      <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700">Chưa đến</span>
                    )}
                    {day.status === 'late' && (
                      <span className="text-xs px-2 py-1 rounded-full bg-yellow-100 text-yellow-700 mr-1">Muộn</span>
                    )}
                    {day.status === 'early_checkout' && (
                      <span className="text-xs px-2 py-1 rounded-full bg-orange-100 text-orange-700 mr-1">Về sớm</span>
                    )}
                    {day.status === 'overtime' && (
                      <span className="text-xs px-2 py-1 rounded-full bg-purple-100 text-purple-700 mr-1">Tăng ca</span>
                    )}
                    {day.status === 'on_time' && (
                      <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700 mr-1">Đúng giờ</span>
                    )}
                  </div>
                </div>

                {(() => {
                  const shiftInfo = day.shift_time ? parseShiftTime(day.shift_time) : null;
                  const actualHours = day.check_in_time && day.check_out_time
                    ? calculateHours(day.check_in_time, day.check_out_time)
                    : 0;
                  const hoursShort = shiftInfo && actualHours < shiftInfo.hours;

                  return (
                    <>
                      {/* Time Comparison Section */}
                      <div className="bg-white rounded-lg p-3 mb-2 border border-gray-200 relative">
                        {/* Edit Button - Top Right */}
                        <button
                          type="button"
                          onClick={() => {
                            setEditingCheckIn({
                              checkInId: day.check_in_id || null,
                              scheduleId: day.schedule_id,
                              shiftTemplateId: day.shift_template_id,
                              currentCheckInTime: day.check_in_time || null,
                              currentCheckOutTime: day.check_out_time || null,
                              expectedCheckInTime: shiftInfo?.start,
                              expectedCheckOutTime: shiftInfo?.end,
                              date: day.date,
                              isAbsent: !day.check_in_id,
                            });
                          }}
                          className="absolute top-2 right-2 p-1.5 hover:bg-gray-100 rounded-lg transition-colors group"
                          title="Chỉnh sửa giờ vào/ra"
                        >
                          <svg className="w-4 h-4 text-gray-400 group-hover:text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>

                        {/* Header Row */}
                        <div className="grid grid-cols-3 gap-2 mb-2 pb-2 border-b border-gray-200">
                          <div className="text-xs font-semibold text-gray-700"></div>
                          <div className="text-xs font-semibold text-gray-700 text-center">Ca làm việc</div>
                          <div className="text-xs font-semibold text-gray-700 text-center">Thực tế</div>
                        </div>

                        {/* Check-in Time Row */}
                        <div className="grid grid-cols-3 gap-2 mb-1.5">
                          <div className="text-xs text-gray-600 flex items-center">
                            <svg className="w-3 h-3 mr-1 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                            </svg>
                            Vào
                          </div>
                          <div className="text-center">
                            <span className="text-sm font-medium text-gray-900">
                              {shiftInfo?.start || '--:--'}
                            </span>
                          </div>
                          <div className={`text-center ${
                            day.status === 'late' ? 'bg-yellow-50 rounded px-1' : ''
                          }`}>
                            <div>
                              <span className={`text-sm font-bold ${
                                day.status === 'late' ? 'text-yellow-700' : 'text-gray-900'
                              }`}>
                                {day.check_in_time ? new Date(day.check_in_time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                              </span>
                              {day.status === 'late' && (
                                <svg className="w-3 h-3 text-yellow-600 inline-block ml-1" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                              )}
                            </div>
                            {day.is_edited && (
                              <span className="inline-block mt-0.5 text-[10px] px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-700 font-semibold">
                                Đã sửa
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Check-out Time Row */}
                        <div className="grid grid-cols-3 gap-2 mb-2">
                          <div className="text-xs text-gray-600 flex items-center">
                            <svg className="w-3 h-3 mr-1 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                            Ra
                          </div>
                          <div className="text-center">
                            <span className="text-sm font-medium text-gray-900">
                              {shiftInfo?.end || '--:--'}
                            </span>
                          </div>
                          <div className={`text-center ${
                            day.status === 'early_checkout' ? 'bg-orange-50 rounded px-1' : ''
                          }`}>
                            <div>
                              <span className={`text-sm font-bold ${
                                day.status === 'early_checkout' ? 'text-orange-700' : 'text-gray-900'
                              }`}>
                                {day.check_out_time ? new Date(day.check_out_time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                              </span>
                              {day.status === 'early_checkout' && (
                                <svg className="w-3 h-3 text-orange-600 inline-block ml-1" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                              )}
                            </div>
                            {day.is_edited && (
                              <span className="inline-block mt-0.5 text-[10px] px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-700 font-semibold">
                                Đã sửa
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Total Hours Row */}
                        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-gray-200">
                          <div className="text-xs font-semibold text-gray-700 flex items-center">
                            <svg className="w-3 h-3 mr-1 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Tổng
                          </div>
                          <div className="text-center">
                            <span className="text-sm font-semibold text-gray-900">
                              {shiftInfo ? `${shiftInfo.hours.toFixed(1)}h` : '--'}
                            </span>
                          </div>
                          <div className={`text-center ${
                            hoursShort ? 'bg-red-50 rounded px-1' : ''
                          }`}>
                            <span className={`text-sm font-bold ${
                              hoursShort ? 'text-red-700' : day.status === 'overtime' ? 'text-purple-700' : 'text-gray-900'
                            }`}>
                              {actualHours > 0 ? `${actualHours.toFixed(1)}h` : '--'}
                            </span>
                            {hoursShort && (
                              <svg className="w-3 h-3 text-red-600 inline-block ml-1" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                              </svg>
                            )}
                            {day.status === 'overtime' && !hoursShort && (
                              <svg className="w-3 h-3 text-purple-600 inline-block ml-1" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13a1 1 0 102 0V9.414l1.293 1.293a1 1 0 001.414-1.414z" clipRule="evenodd" />
                              </svg>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Salary Details */}
                      <div className="text-xs space-y-1">
                        <div className="flex justify-between">
                          <span className="text-gray-500">Lương ca:</span>
                          <span className="font-medium text-gray-900">{formatAmount(day.base_pay)}đ</span>
                        </div>
                        {day.late_penalty < 0 && (
                          <div className="flex justify-between">
                            <span className="text-gray-500">Phạt trễ:</span>
                            <span className="font-medium text-red-600">{formatAmount(day.late_penalty)}đ</span>
                          </div>
                        )}
                        {day.early_penalty < 0 && (
                          <div className="flex justify-between">
                            <span className="text-gray-500">Phạt về sớm:</span>
                            <span className="font-medium text-red-600">{formatAmount(day.early_penalty)}đ</span>
                          </div>
                        )}
                        {day.overtime_pay > 0 && (
                          <div className="flex justify-between">
                            <span className="text-gray-500">Tăng ca:</span>
                            <span className="font-medium text-green-600">+{formatAmount(day.overtime_pay)}đ</span>
                          </div>
                        )}
                        <div className="flex justify-between pt-1 border-t border-gray-200">
                          <span className="font-semibold text-gray-900">Thực nhận:</span>
                          <span className="font-bold text-gray-900">{formatAmount(day.subtotal)}đ</span>
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Filter Modal */}
      {showFilters && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center z-[70] p-4">
          <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-xl max-h-[80vh] overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between rounded-t-2xl">
              <h3 className="text-lg font-bold text-gray-800">Bộ lọc</h3>
              <button
                type="button"
                onClick={() => setShowFilters(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Filter Content */}
            <div className="p-4 space-y-4">
              {/* Status Filter */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Trạng thái</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { value: 'on_time' as const, label: 'Đúng giờ', color: 'green', icon: '✓' },
                    { value: 'late' as const, label: 'Muộn', color: 'yellow', icon: '⚠' },
                    { value: 'early_checkout' as const, label: 'Về sớm', color: 'orange', icon: '→' },
                    { value: 'overtime' as const, label: 'Tăng ca', color: 'purple', icon: '↑' },
                    { value: 'absent' as const, label: 'Vắng', color: 'gray', icon: '✕' },
                    { value: 'upcoming' as const, label: 'Chưa đến', color: 'blue', icon: '⏱' },
                  ].map(({ value, label, color, icon }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => toggleStatusFilter(value)}
                      className={`relative flex items-center gap-1.5 px-2 py-2 rounded-lg border transition-all text-left ${
                        statusFilters.includes(value)
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}
                    >
                      <span className="text-sm">{icon}</span>
                      <span className={`text-xs font-semibold flex-1 ${
                        statusFilters.includes(value) ? 'text-blue-700' : 'text-gray-700'
                      }`}>
                        {label}
                      </span>
                      <span className="text-xs text-gray-500">
                        ({calculation.daily_breakdown.filter(d => d.status === value).length})
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Edited Filter */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Chỉnh sửa</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { value: 'edited' as const, label: 'Đã sửa', color: 'orange', icon: '✎', count: calculation.daily_breakdown.filter(d => d.is_edited).length },
                    { value: 'not_edited' as const, label: 'Chưa sửa', color: 'gray', icon: '○', count: calculation.daily_breakdown.filter(d => !d.is_edited).length },
                  ].map(({ value, label, color, icon, count }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => toggleEditedFilter(value)}
                      className={`relative flex items-center gap-1.5 px-2 py-2 rounded-lg border transition-all text-left ${
                        editedFilters.includes(value)
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}
                    >
                      <span className="text-sm">{icon}</span>
                      <span className={`text-xs font-semibold flex-1 ${
                        editedFilters.includes(value) ? 'text-blue-700' : 'text-gray-700'
                      }`}>
                        {label}
                      </span>
                      <span className="text-xs text-gray-500">({count})</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4 flex gap-2">
              <button
                type="button"
                onClick={() => setShowFilters(false)}
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={() => setShowFilters(false)}
                className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors"
              >
                Xem kết quả
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Check-in Modal */}
      {editingCheckIn && (
        <CheckInEditModal
          checkInId={editingCheckIn.checkInId}
          currentCheckInTime={editingCheckIn.currentCheckInTime}
          currentCheckOutTime={editingCheckIn.currentCheckOutTime}
          expectedCheckInTime={editingCheckIn.expectedCheckInTime}
          expectedCheckOutTime={editingCheckIn.expectedCheckOutTime}
          date={editingCheckIn.date}
          onClose={() => setEditingCheckIn(null)}
          onSave={handleSaveCheckInEdit}
          isAbsent={editingCheckIn.isAbsent}
        />
      )}
    </div>
  );
}
