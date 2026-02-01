'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface EducationSchedulingViewProps {
  workspaceId: string;
  config: Record<string, any>;
}

interface ClassSession {
  id: string;
  class_id: string;
  name: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  color: string;
}

const DAYS = [
  { id: 1, name: 'Thứ 2' },
  { id: 2, name: 'Thứ 3' },
  { id: 3, name: 'Thứ 4' },
  { id: 4, name: 'Thứ 5' },
  { id: 5, name: 'Thứ 6' },
  { id: 6, name: 'Thứ 7' },
  { id: 0, name: 'Chủ Nhật' },
];

const COLORS = [
  { value: '#3b82f6', label: 'Xanh dương' },
  { value: '#10b981', label: 'Xanh lá' },
  { value: '#f59e0b', label: 'Vàng' },
  { value: '#ef4444', label: 'Đỏ' },
  { value: '#8b5cf6', label: 'Tím' },
  { value: '#ec4899', label: 'Hồng' },
];

export function EducationSchedulingView({ workspaceId, config }: EducationSchedulingViewProps) {
  const [sessions, setSessions] = useState<ClassSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingSession, setEditingSession] = useState<ClassSession | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    day_of_week: [] as number[],
    start_time: '09:00',
    end_time: '10:30',
    color: '#3b82f6',
  });

  useEffect(() => {
    loadSessions();
  }, [workspaceId]);

  async function loadSessions() {
    try {
      const { data, error } = await supabase
        .from('class_sessions')
        .select('*')
        .eq('class_id', workspaceId)
        .order('day_of_week')
        .order('start_time');

      if (error) throw error;
      setSessions(data || []);
    } catch (error) {
      console.error('Error loading sessions:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (formData.day_of_week.length === 0) {
      alert('Vui lòng chọn ít nhất một ngày');
      return;
    }

    try {
      if (editingSession) {
        // Update existing session
        const { error } = await supabase
          .from('class_sessions')
          .update({
            name: formData.name,
            start_time: formData.start_time,
            end_time: formData.end_time,
            color: formData.color,
          })
          .eq('id', editingSession.id);

        if (error) throw error;
      } else {
        // Create new sessions for selected days
        const newSessions = formData.day_of_week.map(day => ({
          class_id: workspaceId,
          name: formData.name,
          day_of_week: day,
          start_time: formData.start_time,
          end_time: formData.end_time,
          color: formData.color,
        }));

        const { error } = await supabase
          .from('class_sessions')
          .insert(newSessions);

        if (error) throw error;
      }

      setShowForm(false);
      setEditingSession(null);
      resetForm();
      loadSessions();
    } catch (error) {
      console.error('Error saving session:', error);
      alert('Lỗi khi lưu tiết học');
    }
  }

  async function deleteSession(id: string) {
    if (!confirm('Bạn có chắc muốn xóa tiết học này?')) return;

    try {
      const { error} = await supabase
        .from('class_sessions')
        .delete()
        .eq('id', id);

      if (error) throw error;
      loadSessions();
    } catch (error) {
      console.error('Error deleting session:', error);
      alert('Lỗi khi xóa tiết học');
    }
  }

  function resetForm() {
    setFormData({
      name: '',
      day_of_week: [],
      start_time: '09:00',
      end_time: '10:30',
      color: '#3b82f6',
    });
  }

  function editSession(session: ClassSession) {
    setEditingSession(session);
    setFormData({
      name: session.name,
      day_of_week: [session.day_of_week],
      start_time: session.start_time,
      end_time: session.end_time,
      color: session.color,
    });
    setShowForm(true);
  }

  // Group sessions by day
  const sessionsByDay = DAYS.reduce((acc, day) => {
    acc[day.id] = sessions.filter(s => s.day_of_week === day.id);
    return acc;
  }, {} as Record<number, ClassSession[]>);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 py-6 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <h2 className="text-lg sm:text-xl font-bold text-gray-900">Thời Khóa Biểu</h2>
        <button
          onClick={() => {
            resetForm();
            setEditingSession(null);
            setShowForm(true);
          }}
          className="w-full sm:w-auto px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold flex items-center justify-center gap-2 text-sm sm:text-base"
        >
          <span>+</span>
          Thêm Tiết Học
        </button>
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <div className="bg-white rounded-lg shadow p-4 sm:p-6">
          <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-4">
            {editingSession ? 'Sửa Tiết Học' : 'Thêm Tiết Học'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2">
                Tên Tiết Học
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 text-sm sm:text-base"
                placeholder="VD: Tiết 1, Buổi Sáng"
              />
            </div>

            {!editingSession && (
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2">
                  Chọn Ngày (có thể chọn nhiều)
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {DAYS.map(day => (
                    <label key={day.id} className="flex items-center gap-2 p-2 border rounded-lg cursor-pointer hover:bg-gray-50">
                      <input
                        type="checkbox"
                        checked={formData.day_of_week.includes(day.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData({
                              ...formData,
                              day_of_week: [...formData.day_of_week, day.id]
                            });
                          } else {
                            setFormData({
                              ...formData,
                              day_of_week: formData.day_of_week.filter(d => d !== day.id)
                            });
                          }
                        }}
                        className="rounded"
                      />
                      <span className="text-xs sm:text-sm">{day.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2">
                  Giờ Bắt Đầu
                </label>
                <input
                  type="time"
                  required
                  value={formData.start_time}
                  onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                  className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 text-sm sm:text-base"
                />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2">
                  Giờ Kết Thúc
                </label>
                <input
                  type="time"
                  required
                  value={formData.end_time}
                  onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                  className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 text-sm sm:text-base"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2">
                Màu Sắc
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                {COLORS.map(color => (
                  <button
                    key={color.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, color: color.value })}
                    className={`
                      p-2 sm:p-3 rounded-lg border-2 transition-all
                      ${formData.color === color.value ? 'border-gray-900 scale-110' : 'border-gray-300'}
                    `}
                    style={{ backgroundColor: color.value }}
                  >
                    <span className="sr-only">{color.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingSession(null);
                  resetForm();
                }}
                className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-semibold text-sm sm:text-base"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold text-sm sm:text-base"
              >
                {editingSession ? 'Cập Nhật' : 'Thêm'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Timetable Grid */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-semibold text-gray-700">Ngày</th>
                <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-semibold text-gray-700">Tiết Học</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {DAYS.map(day => (
                <tr key={day.id}>
                  <td className="px-3 sm:px-4 py-3 sm:py-4 text-xs sm:text-sm font-medium text-gray-900 align-top">
                    {day.name}
                  </td>
                  <td className="px-3 sm:px-4 py-3 sm:py-4">
                    {sessionsByDay[day.id].length === 0 ? (
                      <span className="text-xs sm:text-sm text-gray-500">Chưa có tiết học</span>
                    ) : (
                      <div className="space-y-2">
                        {sessionsByDay[day.id].map(session => (
                          <div
                            key={session.id}
                            className="flex items-center justify-between p-2 sm:p-3 rounded-lg border-l-4"
                            style={{ borderColor: session.color, backgroundColor: session.color + '10' }}
                          >
                            <div className="min-w-0 flex-1">
                              <div className="text-xs sm:text-sm font-semibold text-gray-900 truncate">{session.name}</div>
                              <div className="text-xs text-gray-600">
                                {session.start_time} - {session.end_time}
                              </div>
                            </div>
                            <div className="flex gap-1 sm:gap-2 ml-2">
                              <button
                                onClick={() => editSession(session)}
                                className="p-1 sm:p-2 text-blue-600 hover:bg-blue-50 rounded text-sm"
                              >
                                ✏️
                              </button>
                              <button
                                onClick={() => deleteSession(session.id)}
                                className="p-1 sm:p-2 text-red-600 hover:bg-red-50 rounded text-sm"
                              >
                                🗑️
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
