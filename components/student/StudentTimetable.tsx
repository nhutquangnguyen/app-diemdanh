'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Store, ClassSession } from '@/types';

interface Props {
  classId: string;
  classroom: Store;
}

const DAYS = [
  { id: 1, name: 'Thứ 2', short: 'T2' },
  { id: 2, name: 'Thứ 3', short: 'T3' },
  { id: 3, name: 'Thứ 4', short: 'T4' },
  { id: 4, name: 'Thứ 5', short: 'T5' },
  { id: 5, name: 'Thứ 6', short: 'T6' },
  { id: 6, name: 'Thứ 7', short: 'T7' },
  { id: 0, name: 'Chủ Nhật', short: 'CN' },
];

export default function StudentTimetable({ classId, classroom }: Props) {
  const [sessions, setSessions] = useState<ClassSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSessions();
  }, [classId]);

  async function loadSessions() {
    try {
      const { data, error } = await supabase
        .from('class_sessions')
        .select('*')
        .eq('class_id', classId)
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
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-gray-800">📅 Thời khóa biểu</h3>
        <div className="text-sm text-gray-600">
          {classroom.subject && <span>{classroom.subject}</span>}
          {classroom.grade_level && <span> • {classroom.grade_level}</span>}
        </div>
      </div>

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
                  <td className="px-3 sm:px-4 py-3 sm:py-4 text-xs sm:text-sm font-medium text-gray-900 align-top whitespace-nowrap">
                    <span className="hidden sm:inline">{day.name}</span>
                    <span className="sm:hidden">{day.short}</span>
                  </td>
                  <td className="px-3 sm:px-4 py-3 sm:py-4">
                    {sessionsByDay[day.id].length === 0 ? (
                      <span className="text-xs sm:text-sm text-gray-500">Không có tiết</span>
                    ) : (
                      <div className="space-y-2">
                        {sessionsByDay[day.id].map(session => (
                          <div
                            key={session.id}
                            className="p-2 sm:p-3 rounded-lg border-l-4"
                            style={{ borderColor: session.color, backgroundColor: session.color + '10' }}
                          >
                            <div className="font-semibold text-gray-900 text-xs sm:text-sm">
                              {session.name}
                            </div>
                            <div className="text-xs text-gray-600 mt-1">
                              {session.start_time.substring(0, 5)} - {session.end_time.substring(0, 5)}
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

      {/* Class Info */}
      {(classroom.room_number || classroom.academic_year) && (
        <div className="bg-white rounded-lg shadow p-4">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">Thông tin lớp học</h4>
          <div className="space-y-2 text-sm">
            {classroom.room_number && (
              <div className="flex items-center gap-2">
                <span className="text-gray-600">Phòng học:</span>
                <span className="font-semibold text-gray-900">{classroom.room_number}</span>
              </div>
            )}
            {classroom.academic_year && (
              <div className="flex items-center gap-2">
                <span className="text-gray-600">Năm học:</span>
                <span className="font-semibold text-gray-900">{classroom.academic_year}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
