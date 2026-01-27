'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface Props {
  classId: string;
  studentId: string;
}

interface AttendanceWithSession {
  id: string;
  attendance_date: string;
  status: 'present' | 'absent' | 'late' | 'excused';
  check_in_time?: string;
  note?: string;
  session?: {
    name: string;
    start_time: string;
    end_time: string;
  };
}

export default function StudentAttendance({ classId, studentId }: Props) {
  const [attendance, setAttendance] = useState<AttendanceWithSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    present: 0,
    late: 0,
    absent: 0,
    excused: 0,
    percentage: 0,
  });

  useEffect(() => {
    loadAttendance();
  }, [classId, studentId]);

  async function loadAttendance() {
    try {
      // Load attendance records
      const { data: attendanceData, error: attendanceError } = await supabase
        .from('attendance_records')
        .select(`
          id,
          attendance_date,
          status,
          check_in_time,
          note,
          session_id
        `)
        .eq('student_id', studentId)
        .order('attendance_date', { ascending: false })
        .limit(50);

      if (attendanceError) throw attendanceError;

      // Load session details for each attendance record
      const attendanceWithSessions = await Promise.all(
        (attendanceData || []).map(async (record) => {
          if (record.session_id) {
            const { data: sessionData } = await supabase
              .from('class_sessions')
              .select('name, start_time, end_time')
              .eq('id', record.session_id)
              .single();

            return {
              ...record,
              session: sessionData || undefined,
            };
          }
          return record;
        })
      );

      setAttendance(attendanceWithSessions);

      // Calculate stats
      const total = attendanceWithSessions.length;
      const present = attendanceWithSessions.filter(a => a.status === 'present').length;
      const late = attendanceWithSessions.filter(a => a.status === 'late').length;
      const absent = attendanceWithSessions.filter(a => a.status === 'absent').length;
      const excused = attendanceWithSessions.filter(a => a.status === 'excused').length;
      const percentage = total > 0 ? Math.round(((present + late) / total) * 100) : 0;

      setStats({
        total,
        present,
        late,
        absent,
        excused,
        percentage,
      });

    } catch (error) {
      console.error('Error loading attendance:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 py-6 space-y-4">
      <h3 className="text-lg font-bold text-gray-800 px-2">📊 Thống kê điểm danh</h3>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-white rounded-lg shadow p-4 text-center">
          <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
          <div className="text-xs text-gray-600 mt-1">Tổng số buổi</div>
        </div>
        <div className="bg-green-50 rounded-lg shadow p-4 text-center">
          <div className="text-2xl font-bold text-green-600">{stats.present}</div>
          <div className="text-xs text-green-700 mt-1">Có mặt</div>
        </div>
        <div className="bg-yellow-50 rounded-lg shadow p-4 text-center">
          <div className="text-2xl font-bold text-yellow-600">{stats.late}</div>
          <div className="text-xs text-yellow-700 mt-1">Muộn</div>
        </div>
        <div className="bg-red-50 rounded-lg shadow p-4 text-center">
          <div className="text-2xl font-bold text-red-600">{stats.absent}</div>
          <div className="text-xs text-red-700 mt-1">Vắng</div>
        </div>
        <div className="bg-blue-50 rounded-lg shadow p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">{stats.percentage}%</div>
          <div className="text-xs text-blue-700 mt-1">Tỷ lệ</div>
        </div>
      </div>

      {/* Attendance History */}
      <div className="space-y-3">
        <h3 className="text-lg font-bold text-gray-800 px-2">📅 Lịch sử điểm danh</h3>

        {attendance.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
            <p className="text-gray-500">Chưa có dữ liệu điểm danh</p>
          </div>
        ) : (
          <div className="space-y-2">
            {attendance.map((record) => (
              <div
                key={record.id}
                className="bg-white rounded-lg border border-gray-200 p-4"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold text-gray-800">
                        {new Date(record.attendance_date).toLocaleDateString('vi-VN', {
                          weekday: 'short',
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric'
                        })}
                      </span>
                      {record.session && (
                        <span className="text-xs text-gray-500">
                          • {record.session.name}
                        </span>
                      )}
                    </div>

                    {record.session && (
                      <div className="text-xs text-gray-500">
                        {record.session.start_time.substring(0, 5)} - {record.session.end_time.substring(0, 5)}
                      </div>
                    )}

                    {record.check_in_time && (
                      <div className="text-xs text-gray-500 mt-1">
                        Điểm danh lúc: {new Date(record.check_in_time).toLocaleTimeString('vi-VN', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    )}

                    {record.note && (
                      <div className="text-xs text-gray-600 mt-2 italic">
                        📝 {record.note}
                      </div>
                    )}
                  </div>

                  <div className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${
                    record.status === 'present' ? 'bg-green-100 text-green-700' :
                    record.status === 'late' ? 'bg-yellow-100 text-yellow-700' :
                    record.status === 'excused' ? 'bg-blue-100 text-blue-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {record.status === 'present' && '✅ Có mặt'}
                    {record.status === 'late' && '⚠️ Muộn'}
                    {record.status === 'absent' && '❌ Vắng'}
                    {record.status === 'excused' && '📝 Có phép'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
