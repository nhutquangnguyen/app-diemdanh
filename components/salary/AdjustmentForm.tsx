import { useState, useEffect } from 'react';
import { SalaryAdjustment } from '@/types';

interface AdjustmentFormProps {
  staffName: string;
  month: string; // YYYY-MM
  editingAdjustment?: SalaryAdjustment | null;
  onSave: (data: {
    type: string;
    amount: number;
    date: string;
    note: string;
  }) => void;
  onCancel: () => void;
}

export default function AdjustmentForm({
  staffName,
  month,
  editingAdjustment,
  onSave,
  onCancel,
}: AdjustmentFormProps) {
  // Determine initial type based on amount
  const initialType = editingAdjustment
    ? (editingAdjustment.amount >= 0 ? 'increase' : 'decrease')
    : 'increase';

  const [type, setType] = useState(initialType);
  const [amount, setAmount] = useState(
    editingAdjustment?.amount ? Math.abs(editingAdjustment.amount).toString() : ''
  );
  const [displayAmount, setDisplayAmount] = useState(
    editingAdjustment?.amount ? new Intl.NumberFormat('vi-VN').format(Math.abs(editingAdjustment.amount)) : ''
  );
  const [date, setDate] = useState(
    editingAdjustment?.adjustment_date ||
    `${month}-${String(new Date().getDate()).padStart(2, '0')}`
  );
  const [note, setNote] = useState(editingAdjustment?.note || '');

  // Get month boundaries for date picker
  const [yearStr, monthStr] = month.split('-');
  const year = parseInt(yearStr);
  const monthNum = parseInt(monthStr);
  const firstDay = `${year}-${String(monthNum).padStart(2, '0')}-01`;
  const lastDay = new Date(year, monthNum, 0);
  const lastDayStr = `${year}-${String(monthNum).padStart(2, '0')}-${String(lastDay.getDate()).padStart(2, '0')}`;

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Remove all non-digit characters (only allow positive numbers)
    const cleaned = value.replace(/[^\d]/g, '');

    // Store the raw value
    setAmount(cleaned);

    // Format for display
    if (cleaned === '') {
      setDisplayAmount('');
    } else {
      const numValue = parseInt(cleaned);
      if (!isNaN(numValue)) {
        setDisplayAmount(new Intl.NumberFormat('vi-VN').format(numValue));
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate amount is not empty
    if (!amount || amount === '0') {
      return;
    }

    const numAmount = parseFloat(amount);

    // Validate amount is a valid number
    if (isNaN(numAmount) || numAmount <= 0) {
      return;
    }

    // Apply sign based on type: positive for increase, negative for decrease
    const finalAmount = type === 'increase' ? Math.abs(numAmount) : -Math.abs(numAmount);

    onSave({
      type,
      amount: finalAmount,
      date,
      note,
    });
  };

  const typeOptions = [
    { value: 'increase', label: 'Tăng' },
    { value: 'decrease', label: 'Giảm' },
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center z-50">
      <div className="bg-white w-full sm:max-w-md sm:rounded-lg">
        {/* Header */}
        <div className="border-b border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-800">
              {editingAdjustment ? 'Sửa điều chỉnh' : 'Thêm điều chỉnh'}
            </h2>
            <button
              type="button"
              onClick={onCancel}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p className="text-sm text-gray-600 mt-1">{staffName}</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Type */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Loại điều chỉnh *
            </label>
            <div className="space-y-2">
              {typeOptions.map(option => (
                <label
                  key={option.value}
                  className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-all ${
                    type === option.value
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="type"
                    value={option.value}
                    checked={type === option.value}
                    onChange={(e) => setType(e.target.value)}
                  />
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{option.label}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Date */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Ngày *
            </label>
            <input
              type="date"
              required
              value={date}
              min={firstDay}
              max={lastDayStr}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-1">
              Chỉ có thể chọn ngày trong tháng đang xem
            </p>
          </div>

          {/* Amount */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Số tiền *
            </label>
            <div className="relative">
              <input
                type="text"
                required
                inputMode="numeric"
                value={displayAmount}
                onChange={handleAmountChange}
                placeholder="0"
                className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">đ</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {type === 'decrease'
                ? 'Số tiền sẽ được trừ vào lương (VD: 50.000)'
                : 'Số tiền sẽ được cộng vào lương (VD: 100.000)'}
            </p>
          </div>

          {/* Note */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Ghi chú
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="VD: Thưởng hoàn thành dự án X, Phạt vi phạm nội quy..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-3 rounded-lg font-semibold transition-all"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg font-semibold transition-all"
            >
              {editingAdjustment ? 'Cập nhật' : 'Thêm điều chỉnh'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
