import { useState, useEffect } from 'react';
import {
  Store,
  Staff,
  StaffSalaryCalculation,
  SalaryConfirmation,
} from '@/types';
import {
  formatCurrency,
  formatAmount,
  getMonthDisplayName,
  getPreviousMonth,
  getNextMonth,
  getCurrentMonth,
} from '@/lib/salaryCalculations';

interface StoreSalaryProps {
  store: Store;
  salaryCalculations: StaffSalaryCalculation[];
  confirmations: SalaryConfirmation[];
  selectedMonth: string;
  onMonthChange: (month: string) => void;
  onViewStaffDetail: (staffId: string) => void;
  onTogglePaymentStatus: (staffId: string, currentStatus: 'paid' | 'unpaid') => void;
}

export default function StoreSalary({
  store,
  salaryCalculations,
  confirmations,
  selectedMonth,
  onMonthChange,
  onViewStaffDetail,
  onTogglePaymentStatus,
}: StoreSalaryProps) {
  const [filter, setFilter] = useState<'all' | 'paid' | 'unpaid' | 'has_adjustments'>('all');

  // Calculate summary statistics
  const totalPayroll = salaryCalculations.reduce((sum, calc) => sum + calc.final_amount, 0);
  const paidCount = confirmations.filter(c => c.status === 'paid').length;
  const totalStaff = salaryCalculations.length;

  // Filter calculations
  const filteredCalculations = salaryCalculations.filter(calc => {
    const confirmation = confirmations.find(c => c.staff_id === calc.staff.id);

    if (filter === 'paid') {
      return confirmation?.status === 'paid';
    } else if (filter === 'unpaid') {
      return !confirmation || confirmation.status !== 'paid';
    } else if (filter === 'has_adjustments') {
      return calc.adjustments.items.length > 0;
    }
    return true; // 'all'
  });

  return (
    <div className="px-4 sm:px-6 py-6">
      {/* Month selector */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => onMonthChange(getPreviousMonth(selectedMonth))}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <div className="text-center">
            <h2 className="text-xl font-bold text-gray-800">
              {getMonthDisplayName(selectedMonth)}
            </h2>
            {selectedMonth === getCurrentMonth() && (
              <span className="text-xs text-blue-600 font-medium">Tháng hiện tại</span>
            )}
          </div>

          <button
            type="button"
            onClick={() => onMonthChange(getNextMonth(selectedMonth))}
            disabled={selectedMonth >= getCurrentMonth()}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Summary statistics */}
      <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-sm p-6 mb-6 text-white">
        <h3 className="text-sm font-medium mb-4 opacity-90">📊 Tổng quan</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-2xl font-bold">{formatAmount(totalPayroll)}đ</div>
            <div className="text-sm opacity-90">Tổng lương</div>
          </div>
          <div>
            <div className="text-2xl font-bold">{totalStaff}</div>
            <div className="text-sm opacity-90">Nhân viên</div>
          </div>
          <div>
            <div className="text-2xl font-bold">{paidCount} / {totalStaff}</div>
            <div className="text-sm opacity-90">Đã trả</div>
          </div>
          <div>
            <div className="text-2xl font-bold">
              {salaryCalculations.filter(c => c.adjustments.items.length > 0).length}
            </div>
            <div className="text-sm opacity-90">Có điều chỉnh</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
        <button
          type="button"
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-full font-semibold text-sm whitespace-nowrap transition-all ${
            filter === 'all'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Tất cả ({salaryCalculations.length})
        </button>
        <button
          type="button"
          onClick={() => setFilter('unpaid')}
          className={`px-4 py-2 rounded-full font-semibold text-sm whitespace-nowrap transition-all ${
            filter === 'unpaid'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Chưa trả ({totalStaff - paidCount})
        </button>
        <button
          type="button"
          onClick={() => setFilter('paid')}
          className={`px-4 py-2 rounded-full font-semibold text-sm whitespace-nowrap transition-all ${
            filter === 'paid'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Đã trả ({paidCount})
        </button>
        <button
          type="button"
          onClick={() => setFilter('has_adjustments')}
          className={`px-4 py-2 rounded-full font-semibold text-sm whitespace-nowrap transition-all ${
            filter === 'has_adjustments'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Có điều chỉnh ({salaryCalculations.filter(c => c.adjustments.items.length > 0).length})
        </button>
      </div>

      {/* Staff salary list */}
      <div className="space-y-3">
        {filteredCalculations.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
            <div className="text-gray-400 mb-2">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
            </div>
            <p className="text-gray-600 font-medium">Không có dữ liệu</p>
            <p className="text-sm text-gray-500 mt-1">
              {filter === 'all' ? 'Chưa có nhân viên làm việc trong tháng này' : 'Không tìm thấy nhân viên phù hợp với bộ lọc'}
            </p>
          </div>
        ) : (
          filteredCalculations.map(calc => {
            const confirmation = confirmations.find(c => c.staff_id === calc.staff.id);
            const isPaid = confirmation?.status === 'paid';
            const hasAdjustments = calc.adjustments.items.length > 0;

            const displayName = calc.staff.name || calc.staff.full_name;
            const initials = displayName
              ?.split(' ')
              .slice(-2)
              .map((n: string) => n[0])
              .join('')
              .toUpperCase() || '??';

            return (
              <div
                key={calc.staff.id}
                className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow"
              >
                <div className="p-4">
                  {/* Header */}
                  <div className="flex items-start gap-3 mb-4">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0 bg-gradient-to-br from-blue-500 to-blue-600">
                      {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-gray-800 mb-1">{calc.staff.name || calc.staff.full_name}</div>
                      <div className="text-xs text-gray-500 break-all">{calc.staff.email}</div>
                    </div>
                  </div>

                  {/* Salary breakdown */}
                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Tạm tính:</span>
                      <span className="font-medium text-gray-900">{formatAmount(calc.provisional.total)}đ</span>
                    </div>
                    {hasAdjustments && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">
                          Điều chỉnh:
                          <span className="ml-1 inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-700">
                            {calc.adjustments.items.length}
                          </span>
                        </span>
                        <span className={`font-medium ${calc.adjustments.total >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {calc.adjustments.total >= 0 ? '+' : ''}{formatAmount(calc.adjustments.total)}đ
                        </span>
                      </div>
                    )}
                    <div className="border-t border-gray-200 pt-2 flex justify-between">
                      <span className="font-semibold text-gray-900">Thành tiền:</span>
                      <span className="font-bold text-lg text-blue-600">{formatAmount(calc.final_amount)}đ</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => onViewStaffDetail(calc.staff.id)}
                      className="flex-1 bg-blue-50 hover:bg-blue-100 text-blue-700 px-4 py-2 rounded-lg font-semibold text-sm transition-all"
                    >
                      Xem chi tiết
                    </button>
                    <button
                      type="button"
                      onClick={() => onTogglePaymentStatus(calc.staff.id, isPaid ? 'paid' : 'unpaid')}
                      className={`flex-1 px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                        isPaid
                          ? 'bg-green-100 text-green-700 hover:bg-green-200'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {isPaid ? '✓ Đã trả' : 'Đánh dấu đã trả'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
