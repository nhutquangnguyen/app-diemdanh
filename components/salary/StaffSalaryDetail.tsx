import { StaffSalaryCalculation, SalaryAdjustment } from '@/types';
import { formatAmount } from '@/lib/salaryCalculations';
import { shareSalaryPDF } from '@/lib/salaryPDF';

interface StaffSalaryDetailProps {
  calculation: StaffSalaryCalculation;
  storeName: string;
  onClose: () => void;
  onAddAdjustment: () => void;
  onEditAdjustment: (adjustment: SalaryAdjustment) => void;
  onDeleteAdjustment: (adjustmentId: string) => void;
  onTogglePaymentStatus: () => void;
  isPaid: boolean;
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
}: StaffSalaryDetailProps) {
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center z-50">
      <div className="bg-white w-full sm:max-w-2xl sm:rounded-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between">
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

        {/* Total Amount */}
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-6">
          <div className="text-sm opacity-90 mb-1">Tổng lương</div>
          <div className="text-3xl font-bold mb-4">{formatAmount(calculation.final_amount)}đ</div>
          <div className="flex gap-2">
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
          <h3 className="text-md font-bold text-gray-800 mb-3">📅 Chi tiết từng ngày</h3>
          <div className="space-y-2">
            {calculation.daily_breakdown.map(day => (
              <div key={day.date} className="bg-gray-50 rounded-lg p-3">
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
                    {day.status === 'absent' ? (
                      <span className="text-xs px-2 py-1 rounded-full bg-gray-200 text-gray-600">Vắng mặt</span>
                    ) : (
                      <>
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
                      </>
                    )}
                  </div>
                </div>

                {day.status !== 'absent' && (
                  <>
                    <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                      <div>
                        <span className="text-gray-500">Vào:</span>
                        <span className="ml-1 font-medium text-gray-900">
                          {day.check_in_time ? new Date(day.check_in_time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">Ra:</span>
                        <span className="ml-1 font-medium text-gray-900">
                          {day.check_out_time ? new Date(day.check_out_time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                        </span>
                      </div>
                    </div>

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
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
