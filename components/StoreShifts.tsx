import { ShiftTemplate } from '@/types';
import { useState } from 'react';

interface StoreShiftsProps {
  shifts: ShiftTemplate[];
  showShiftForm: boolean;
  editingShift: ShiftTemplate | null;
  shiftFormData: {
    name: string;
    start_time: string;
    end_time: string;
    grace_period_minutes: number;
    color: string;
  };
  setShowShiftForm: (show: boolean) => void;
  setEditingShift: (shift: ShiftTemplate | null) => void;
  setShiftFormData: (data: any) => void;
  handleShiftSubmit: (e: React.FormEvent) => void;
  calculateShiftDuration: (startTime: string, endTime: string) => string;
  resetShiftForm: () => void;
  startEditShift: (shift: ShiftTemplate) => void;
  deleteShift: (shiftId: string) => void;
}

export default function StoreShifts({
  shifts,
  showShiftForm,
  editingShift,
  shiftFormData,
  setShowShiftForm,
  setEditingShift,
  setShiftFormData,
  handleShiftSubmit,
  calculateShiftDuration,
  resetShiftForm,
  startEditShift,
  deleteShift,
}: StoreShiftsProps) {
  const [showColorPicker, setShowColorPicker] = useState(false);

  // Get available color (not used by existing shifts)
  const getAvailableColor = () => {
    const availableColors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];
    const usedColors = shifts.map(s => s.color);
    const availableColor = availableColors.find(c => !usedColors.includes(c));
    return availableColor || availableColors[0];
  };

  return (
    <div className="px-4 sm:px-6 py-6">
      {/* SHIFT MANAGEMENT SECTION */}
      <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg sm:text-xl font-bold text-gray-800">Quản Lý Ca Làm Việc</h2>
          <button
            type="button"
            onClick={() => {
              setShowShiftForm(!showShiftForm);
              if (showShiftForm) {
                setEditingShift(null);
                setShiftFormData({
                  name: '',
                  start_time: '08:00',
                  end_time: '17:00',
                  grace_period_minutes: 15,
                  color: '#3B82F6',
                });
              } else {
                // Opening form - select available color
                setShiftFormData({
                  name: '',
                  start_time: '08:00',
                  end_time: '17:00',
                  grace_period_minutes: 15,
                  color: getAvailableColor(),
                });
              }
            }}
            className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 min-h-[48px]"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            {showShiftForm ? 'Đóng Form' : 'Tạo Ca Mới'}
          </button>
        </div>

        {/* Create/Edit Form */}
        {showShiftForm && (
          <div className="bg-gray-50 rounded-lg p-4 sm:p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              {editingShift ? 'Sửa Ca Làm Việc' : 'Tạo Ca Làm Việc Mới'}
            </h3>
            <form onSubmit={handleShiftSubmit} className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Tên Ca *
                  </label>
                  <input
                    type="text"
                    required
                    value={shiftFormData.name}
                    onChange={(e) => setShiftFormData({ ...shiftFormData, name: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="VD: Ca Sáng, Ca Chiều"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Thời Gian Cho Phép Trễ (phút)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="60"
                    value={shiftFormData.grace_period_minutes}
                    onChange={(e) => setShiftFormData({ ...shiftFormData, grace_period_minutes: parseInt(e.target.value) })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Giờ Bắt Đầu *
                  </label>
                  <div className="flex gap-2">
                    <select
                      required
                      value={shiftFormData.start_time.split(':')[0]}
                      onChange={(e) => {
                        const minute = shiftFormData.start_time.split(':')[1] || '00';
                        setShiftFormData({ ...shiftFormData, start_time: `${e.target.value}:${minute}` });
                      }}
                      className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      {Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0')).map(h => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                    <span className="flex items-center text-2xl font-bold text-gray-400">:</span>
                    <select
                      required
                      value={shiftFormData.start_time.split(':')[1]}
                      onChange={(e) => {
                        const hour = shiftFormData.start_time.split(':')[0];
                        setShiftFormData({ ...shiftFormData, start_time: `${hour}:${e.target.value}` });
                      }}
                      className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      {Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0')).map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Giờ Kết Thúc *
                  </label>
                  <div className="flex gap-2">
                    <select
                      required
                      value={shiftFormData.end_time.split(':')[0]}
                      onChange={(e) => {
                        const minute = shiftFormData.end_time.split(':')[1] || '00';
                        setShiftFormData({ ...shiftFormData, end_time: `${e.target.value}:${minute}` });
                      }}
                      className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      {Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0')).map(h => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                    <span className="flex items-center text-2xl font-bold text-gray-400">:</span>
                    <select
                      required
                      value={shiftFormData.end_time.split(':')[1]}
                      onChange={(e) => {
                        const hour = shiftFormData.end_time.split(':')[0];
                        setShiftFormData({ ...shiftFormData, end_time: `${hour}:${e.target.value}` });
                      }}
                      className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      {Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0')).map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Màu Sắc
                  </label>
                  <div className="space-y-2">
                    {/* Selected color button - click to expand */}
                    <button
                      type="button"
                      onClick={() => setShowColorPicker(!showColorPicker)}
                      className="w-12 h-12 rounded-lg transition-all ring-2 ring-offset-2 ring-gray-800 hover:scale-105"
                      style={{ backgroundColor: shiftFormData.color }}
                      title="Click để đổi màu"
                    />

                    {/* Color picker - shown when expanded */}
                    {showColorPicker && (
                      <div className="flex gap-2 flex-wrap pt-2">
                        {['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899']
                          .filter(c => c !== shiftFormData.color)
                          .map((color) => (
                            <button
                              key={color}
                              type="button"
                              onClick={() => {
                                setShiftFormData({ ...shiftFormData, color });
                                setShowColorPicker(false);
                              }}
                              className="w-12 h-12 rounded-lg transition-all hover:scale-105"
                              style={{ backgroundColor: color }}
                              title={color}
                            />
                          ))}
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Thời Lượng
                  </label>
                  <div className="px-4 py-3 bg-gray-100 border border-gray-300 rounded-lg text-gray-700 font-semibold">
                    {calculateShiftDuration(shiftFormData.start_time, shiftFormData.end_time)}
                  </div>
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={resetShiftForm}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 px-6 py-3 rounded-lg font-semibold transition-all"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-all"
                >
                  {editingShift ? 'Cập Nhật' : 'Tạo Ca'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Shifts List */}
        <div className="bg-gray-50 rounded-lg overflow-hidden shadow-sm">
          <div className="px-4 py-3 bg-gray-100 border-b border-gray-200">
            <h3 className="text-md font-bold text-gray-800">
              Danh Sách Ca ({shifts.length})
            </h3>
          </div>

          {shifts.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p className="text-md mb-1">Chưa có ca làm việc nào</p>
              <p className="text-sm">Tạo ca làm việc đầu tiên để bắt đầu lên lịch</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {shifts.map((shift) => (
                <div key={shift.id} className="p-5 hover:bg-gray-100 transition-all">
                  <div className="flex gap-3">
                    <div
                      className="w-1 rounded-full flex-shrink-0"
                      style={{ backgroundColor: shift.color }}
                    />
                    <div className="flex-1 min-w-0">
                      <h4 className="text-lg font-bold text-gray-800 mb-2">{shift.name}</h4>
                      <div className="text-base text-gray-700 font-medium mb-2">
                        {shift.start_time.substring(0, 5)} - {shift.end_time.substring(0, 5)}
                      </div>
                      <div className="flex flex-wrap gap-2 mb-3">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-blue-100 text-blue-700 text-sm font-medium">
                          {calculateShiftDuration(shift.start_time, shift.end_time)}
                        </span>
                        <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-gray-100 text-gray-700 text-sm font-medium">
                          Cho phép trễ: {shift.grace_period_minutes}p
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => startEditShift(shift)}
                          className="flex-1 sm:flex-none text-blue-600 hover:text-blue-800 px-4 py-2 rounded-lg hover:bg-blue-50 font-semibold transition-all text-sm border border-blue-200"
                        >
                          Sửa
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteShift(shift.id)}
                          className="flex-1 sm:flex-none text-red-600 hover:text-red-800 px-4 py-2 rounded-lg hover:bg-red-50 font-semibold transition-all text-sm border border-red-200"
                        >
                          Xóa
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
