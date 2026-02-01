'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface EducationTodayViewProps {
  people: any[];  // students
  checkIns: any[];  // attendance_records
  shifts: any[];  // class_sessions
  schedules: any[];  // session_schedules
  config: Record<string, any>;
  onViewPhoto?: (checkIn: any) => void;
}

interface StudentWithAttendance {
  id: string;
  full_name: string;
  student_id?: string;
  attendance_status?: 'present' | 'absent' | 'late';
  check_in_time?: string;
  attendance_record_id?: string;
  note?: string;
  selfie_url?: string;
  latitude?: number;
  longitude?: number;
  distance_meters?: number;
}

export function EducationTodayView({
  people: students,
  checkIns: attendanceRecords,
  shifts: sessions,
  config,
  onViewPhoto
}: EducationTodayViewProps) {
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [studentsWithAttendance, setStudentsWithAttendance] = useState<StudentWithAttendance[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [saving, setSaving] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  const peopleLabel = config.peopleLabel || 'Học Sinh';
  const today = new Date().toISOString().split('T')[0];
  const dayOfWeek = new Date().getDay(); // 0 = Sunday

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Filter sessions for today (by day_of_week)
  const todaySessions = sessions.filter(s => s.day_of_week === dayOfWeek);

  // Auto-select first session
  useEffect(() => {
    if (todaySessions.length > 0 && !selectedSession) {
      setSelectedSession(todaySessions[0].id);
    }
  }, [todaySessions, selectedSession]);

  // Merge students with attendance data when session changes
  useEffect(() => {
    if (!selectedSession) {
      setStudentsWithAttendance([]);
      return;
    }

    const merged = students.map(student => {
      const attendance = attendanceRecords.find(
        a => a.student_id === student.id && a.session_id === selectedSession
      );
      return {
        ...student,
        attendance_status: attendance?.status,
        check_in_time: attendance?.check_in_time,
        attendance_record_id: attendance?.id,
        note: attendance?.note,
        selfie_url: attendance?.selfie_url,
        latitude: attendance?.latitude,
        longitude: attendance?.longitude,
        distance_meters: attendance?.distance_meters,
      };
    });

    setStudentsWithAttendance(merged);
  }, [students, attendanceRecords, selectedSession]);

  async function updateAttendance(studentId: string, status: 'present' | 'absent' | 'late') {
    try {
      const student = studentsWithAttendance.find(s => s.id === studentId);
      if (!student) return;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const now = new Date();
      const currentTime = now.toTimeString().split(' ')[0]; // HH:MM:SS format

      if (student.attendance_record_id) {
        // Update existing record
        const { error } = await supabase
          .from('attendance_records')
          .update({
            status,
            check_in_time: currentTime,
            marked_at: now.toISOString(),
            marked_by_user_id: user.id,
          })
          .eq('id', student.attendance_record_id);

        if (error) throw error;
      } else {
        // Create new record
        const { error } = await supabase
          .from('attendance_records')
          .insert({
            student_id: studentId,
            class_id: config.workspaceId,
            session_id: selectedSession,
            attendance_date: today,
            status,
            check_in_time: currentTime,
            marked_by: 'teacher',
            marked_by_user_id: user.id,
            marked_at: now.toISOString(),
          });

        if (error) throw error;
      }

      // Reload attendance records
      window.location.reload();
    } catch (error) {
      console.error('Error updating attendance:', error);
      alert('Lỗi khi cập nhật điểm danh');
    }
  }

  async function markAllPresent() {
    setSaving(true);
    try {
      const promises = studentsWithAttendance.map(student =>
        updateAttendance(student.id, 'present')
      );
      await Promise.all(promises);
      alert('Đã điểm danh tất cả học sinh có mặt');
    } catch (error) {
      console.error('Error marking all present:', error);
      alert('Lỗi khi điểm danh');
    } finally {
      setSaving(false);
    }
  }

  async function markAllAbsent() {
    setSaving(true);
    try {
      const promises = studentsWithAttendance.map(student =>
        updateAttendance(student.id, 'absent')
      );
      await Promise.all(promises);
      alert('Đã điểm danh tất cả học sinh vắng mặt');
    } catch (error) {
      console.error('Error marking all absent:', error);
      alert('Lỗi khi điểm danh');
    } finally {
      setSaving(false);
    }
  }

  const filteredStudents = studentsWithAttendance.filter(student =>
    student.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (student.student_id && student.student_id.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const stats = {
    present: studentsWithAttendance.filter(s => s.attendance_status === 'present').length,
    absent: studentsWithAttendance.filter(s => s.attendance_status === 'absent').length,
    late: studentsWithAttendance.filter(s => s.attendance_status === 'late').length,
    total: studentsWithAttendance.length,
  };

  if (todaySessions.length === 0) {
    return (
      <div className="px-4 sm:px-6 py-6">
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-600">Không có tiết học nào hôm nay. Vui lòng thêm thời khóa biểu.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 py-6 space-y-4">
      {/* Current Date and Time Info */}
      <div className="flex items-center justify-between text-sm text-gray-600 px-2">
        <div>
          📅 {currentTime.toLocaleDateString('vi-VN', {
            weekday: 'short',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
          })}
        </div>
        <div className="tabular-nums">
          🕐 {currentTime.toLocaleTimeString('vi-VN', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
          })}
        </div>
      </div>

      {/* Session Selector */}
      <div className="bg-white rounded-lg shadow p-4 sm:p-6">
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Chọn Tiết Học:
        </label>
        <select
          value={selectedSession || ''}
          onChange={(e) => setSelectedSession(e.target.value)}
          className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm sm:text-base"
        >
          {todaySessions.map(session => (
            <option key={session.id} value={session.id}>
              {session.name} ({session.start_time} - {session.end_time})
            </option>
          ))}
        </select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white rounded-lg shadow p-3 sm:p-4">
          <div className="text-xl sm:text-2xl font-bold text-gray-900">{stats.total}</div>
          <div className="text-xs sm:text-sm text-gray-600">Tổng số</div>
        </div>
        <div className="bg-green-50 rounded-lg shadow p-3 sm:p-4">
          <div className="text-xl sm:text-2xl font-bold text-green-600">{stats.present}</div>
          <div className="text-xs sm:text-sm text-green-700">Có mặt</div>
        </div>
        <div className="bg-red-50 rounded-lg shadow p-3 sm:p-4">
          <div className="text-xl sm:text-2xl font-bold text-red-600">{stats.absent}</div>
          <div className="text-xs sm:text-sm text-red-700">Vắng</div>
        </div>
        <div className="bg-yellow-50 rounded-lg shadow p-3 sm:p-4">
          <div className="text-xl sm:text-2xl font-bold text-yellow-600">{stats.late}</div>
          <div className="text-xs sm:text-sm text-yellow-700">Muộn</div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow p-3 sm:p-4 flex flex-col sm:flex-row gap-2 sm:gap-3">
        <button
          onClick={markAllPresent}
          disabled={saving}
          className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold disabled:opacity-50 text-sm sm:text-base"
        >
          Điểm Danh Tất Cả Có Mặt
        </button>
        <button
          onClick={markAllAbsent}
          disabled={saving}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold disabled:opacity-50 text-sm sm:text-base"
        >
          Điểm Danh Tất Cả Vắng
        </button>
      </div>

      {/* Search */}
      <div className="bg-white rounded-lg shadow p-3 sm:p-4">
        <input
          type="text"
          placeholder={`Tìm ${peopleLabel.toLowerCase()}...`}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm sm:text-base"
        />
      </div>

      {/* Student List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="divide-y divide-gray-200">
          {filteredStudents.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              {searchTerm ? 'Không tìm thấy học sinh' : 'Chưa có học sinh nào'}
            </div>
          ) : (
            filteredStudents.map(student => (
              <div key={student.id} className="p-3 sm:p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between gap-3">
                  {/* Student Info */}
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-gray-900 truncate">{student.full_name}</div>
                    {student.student_id && (
                      <div className="text-sm text-gray-600">MSSV: {student.student_id}</div>
                    )}
                    {student.check_in_time && (
                      <div className="text-sm text-gray-600">
                        Điểm danh: {new Date(student.check_in_time).toLocaleTimeString('vi-VN', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    )}
                  </div>

                  {/* Attendance Buttons */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => updateAttendance(student.id, 'present')}
                      className={`px-3 py-1.5 rounded-lg font-medium text-sm transition-all ${
                        student.attendance_status === 'present'
                          ? 'bg-green-600 text-white'
                          : 'bg-gray-200 text-gray-700 hover:bg-green-100'
                      }`}
                    >
                      ✓ Có mặt
                    </button>
                    <button
                      onClick={() => updateAttendance(student.id, 'late')}
                      className={`px-3 py-1.5 rounded-lg font-medium text-sm transition-all ${
                        student.attendance_status === 'late'
                          ? 'bg-yellow-600 text-white'
                          : 'bg-gray-200 text-gray-700 hover:bg-yellow-100'
                      }`}
                    >
                      ⚠ Muộn
                    </button>
                    <button
                      onClick={() => updateAttendance(student.id, 'absent')}
                      className={`px-3 py-1.5 rounded-lg font-medium text-sm transition-all ${
                        student.attendance_status === 'absent'
                          ? 'bg-red-600 text-white'
                          : 'bg-gray-200 text-gray-700 hover:bg-red-100'
                      }`}
                    >
                      ✗ Vắng
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
