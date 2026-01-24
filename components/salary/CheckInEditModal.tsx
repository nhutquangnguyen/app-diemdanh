'use client';

import { useState } from 'react';

interface CheckInEditModalProps {
  checkInId: string | null; // Can be null for absent days
  currentCheckInTime: string | null;
  currentCheckOutTime: string | null;
  expectedCheckInTime?: string; // From shift (e.g., "18:30")
  expectedCheckOutTime?: string; // From shift (e.g., "22:30")
  date: string; // Date for combining with time
  onClose: () => void;
  onSave: (data: {
    checkInTime: string | null;
    checkOutTime: string | null;
    reason: string;
  }) => Promise<void>;
  isAbsent?: boolean; // True if adding times for absent day
}

export default function CheckInEditModal({
  checkInId,
  currentCheckInTime,
  currentCheckOutTime,
  expectedCheckInTime,
  expectedCheckOutTime,
  date,
  onClose,
  onSave,
  isAbsent = false,
}: CheckInEditModalProps) {
  // Store current values as display format
  const currentCheckInDisplay = currentCheckInTime
    ? new Date(currentCheckInTime).toLocaleTimeString('en-US', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';

  const currentCheckOutDisplay = currentCheckOutTime
    ? new Date(currentCheckOutTime).toLocaleTimeString('en-US', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';

  const [checkInTime, setCheckInTime] = useState(currentCheckInDisplay);
  const [checkOutTime, setCheckOutTime] = useState(currentCheckOutDisplay);
  const [reason, setReason] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Helper to combine date and time into ISO string (Vietnam timezone)
  const combineDateTime = (dateStr: string, timeStr: string): string | null => {
    if (!timeStr) return null;
    const [hours, minutes] = timeStr.split(':');

    // Parse date as YYYY-MM-DD
    const [year, month, day] = dateStr.split('-').map(Number);

    // Create a date string in Vietnam timezone format
    const vietnamDateTimeStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00+07:00`;

    // Parse and return as ISO string
    return new Date(vietnamDateTimeStr).toISOString();
  };

  // Fast edit: Use expected shift times
  const handleUseFastEdit = () => {
    if (expectedCheckInTime) setCheckInTime(expectedCheckInTime);
    if (expectedCheckOutTime) setCheckOutTime(expectedCheckOutTime);
    setReason('Sử dụng giờ ca làm việc (quên chấm công)');
  };

  const handleSave = async () => {
    if (!reason.trim()) {
      alert('Vui lòng nhập lý do chỉnh sửa');
      return;
    }

    if (!checkInTime) {
      alert('Vui lòng nhập giờ vào');
      return;
    }

    setIsSaving(true);
    try {
      await onSave({
        checkInTime: combineDateTime(date, checkInTime),
        checkOutTime: combineDateTime(date, checkOutTime),
        reason: reason.trim(),
      });
      onClose();
    } catch (error) {
      console.error('Error saving edit:', error);
      alert('Lỗi khi lưu chỉnh sửa');
    } finally {
      setIsSaving(false);
    }
  };

  const hasChanges =
    (checkInTime && currentCheckInDisplay !== checkInTime) ||
    (checkOutTime && currentCheckOutDisplay !== checkOutTime);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-800">
            {isAbsent ? 'Thêm giờ vào/ra' : 'Chỉnh sửa giờ vào/ra'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Fast Edit Button */}
          {expectedCheckInTime && expectedCheckOutTime && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-start gap-2 mb-2">
                <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-blue-900 mb-1">Sửa nhanh</p>
                  <p className="text-xs text-blue-700 mb-2">
                    Sử dụng giờ ca làm việc: {expectedCheckInTime} - {expectedCheckOutTime}
                  </p>
                  <button
                    type="button"
                    onClick={handleUseFastEdit}
                    className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg font-semibold transition-colors"
                  >
                    ⚡ Áp dụng giờ ca
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Check-in Time */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Giờ vào <span className="text-red-600">*</span>
              <span className="ml-2 text-xs font-normal text-gray-500">(Hiện tại: {currentCheckInDisplay})</span>
            </label>
            <div className="space-y-2">
              <input
                type="time"
                value={checkInTime}
                onChange={(e) => setCheckInTime(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
              <div className="flex gap-2">
                {expectedCheckInTime && (
                  <button
                    type="button"
                    onClick={() => {
                      setCheckInTime(expectedCheckInTime);
                      if (!reason) setReason('Sử dụng giờ ca làm việc');
                    }}
                    className="flex-1 px-3 py-1.5 text-xs bg-green-50 hover:bg-green-100 text-green-700 border border-green-300 rounded-lg font-semibold transition-colors"
                  >
                    ⚡ Dùng giờ ca ({expectedCheckInTime})
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setCheckInTime(currentCheckInDisplay)}
                  className="flex-1 px-3 py-1.5 text-xs bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-300 rounded-lg font-semibold transition-colors"
                >
                  🔄 Reset
                </button>
              </div>
            </div>
          </div>

          {/* Check-out Time */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Giờ ra <span className="text-xs font-normal text-gray-500">(Tùy chọn)</span>
              <span className="ml-2 text-xs font-normal text-gray-500">(Hiện tại: {currentCheckOutDisplay})</span>
            </label>
            <div className="space-y-2">
              <input
                type="time"
                value={checkOutTime}
                onChange={(e) => setCheckOutTime(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <div className="flex gap-2">
                {expectedCheckOutTime && (
                  <button
                    type="button"
                    onClick={() => {
                      setCheckOutTime(expectedCheckOutTime);
                      if (!reason) setReason('Sử dụng giờ ca làm việc');
                    }}
                    className="flex-1 px-3 py-1.5 text-xs bg-green-50 hover:bg-green-100 text-green-700 border border-green-300 rounded-lg font-semibold transition-colors"
                  >
                    ⚡ Dùng giờ ca ({expectedCheckOutTime})
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setCheckOutTime(currentCheckOutDisplay)}
                  className="flex-1 px-3 py-1.5 text-xs bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-300 rounded-lg font-semibold transition-colors"
                >
                  🔄 Reset
                </button>
              </div>
            </div>
          </div>

          {/* Reason */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Lý do <span className="text-red-600">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="VD: Quên chấm công, xác nhận qua camera"
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Preview Changes */}
          {hasChanges && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-sm font-semibold text-yellow-900 mb-2">⚠️ Thay đổi sẽ được áp dụng:</p>
              <div className="space-y-1 text-xs text-yellow-800">
                {checkInTime && currentCheckInDisplay !== checkInTime && (
                  <div>• Giờ vào: {currentCheckInDisplay} → {checkInTime}</div>
                )}
                {checkOutTime && currentCheckOutDisplay !== checkOutTime && (
                  <div>• Giờ ra: {currentCheckOutDisplay} → {checkOutTime}</div>
                )}
              </div>
              <p className="text-xs text-yellow-700 mt-2">
                Lương sẽ được tính lại tự động
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 p-4 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-50"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || !reason.trim()}
            className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? 'Đang lưu...' : 'Xác nhận'}
          </button>
        </div>
      </div>
    </div>
  );
}
