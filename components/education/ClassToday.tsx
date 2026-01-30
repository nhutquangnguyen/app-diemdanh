'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Store, Student, ClassSession, AttendanceRecord, AttendanceStatus } from '@/types';

interface Props {
  classId: string;
  classroom: Store;
}

interface StudentWithAttendance extends Student {
  attendance_status?: AttendanceStatus;
  check_in_time?: string;
  attendance_record_id?: string;
  note?: string;
  selfie_url?: string;
  latitude?: number;
  longitude?: number;
  distance_meters?: number;
}

export default function ClassToday({ classId, classroom }: Props) {
  const [students, setStudents] = useState<StudentWithAttendance[]>([]);
  const [sessions, setSessions] = useState<ClassSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [viewingSelfie, setViewingSelfie] = useState<{ url: string; studentName: string } | null>(null);

  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const dayOfWeek = new Date().getDay(); // 0 = Sunday

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    loadData();
  }, [classId]);

  async function loadData() {
    try {
      // Load students
      const { data: studentsData, error: studentsError } = await supabase
        .from('students')
        .select('*')
        .eq('class_id', classId)
        .eq('status', 'active')
        .order('full_name');

      if (studentsError) throw studentsError;

      // Load today's sessions
      const { data: sessionsData, error: sessionsError } = await supabase
        .from('class_sessions')
        .select('*')
        .eq('class_id', classId)
        .eq('day_of_week', dayOfWeek)
        .order('start_time');

      if (sessionsError) throw sessionsError;

      setSessions(sessionsData || []);

      // Auto-select first session
      if (sessionsData && sessionsData.length > 0 && !selectedSession) {
        setSelectedSession(sessionsData[0].id);
      }

      // Load attendance records for today
      const { data: attendanceData, error: attendanceError } = await supabase
        .from('attendance_records')
        .select('*')
        .eq('class_id', classId)
        .eq('attendance_date', today);

      if (attendanceError) throw attendanceError;

      // Merge students with attendance data
      const studentsWithAttendance = (studentsData || []).map(student => {
        const attendance = (attendanceData || []).find(
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

      setStudents(studentsWithAttendance);
    } catch (error) {
      console.error('Error loading class data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function updateAttendance(studentId: string, status: AttendanceStatus) {
    try {
      const student = students.find(s => s.id === studentId);
      if (!student) return;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      if (student.attendance_record_id) {
        // Update existing record
        const { error } = await supabase
          .from('attendance_records')
          .update({
            status,
            marked_at: new Date().toISOString(),
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
            class_id: classId,
            session_id: selectedSession,
            attendance_date: today,
            status,
            marked_by: 'teacher',
            marked_by_user_id: user.id,
          });

        if (error) throw error;
      }

      // Reload data
      await loadData();
    } catch (error) {
      console.error('Error updating attendance:', error);
      alert('Lỗi khi cập nhật điểm danh');
    }
  }

  async function markAllPresent() {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const promises = students.map(student =>
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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const promises = students.map(student =>
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

  const filteredStudents = students.filter(student =>
    student.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (student.student_id && student.student_id.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const stats = {
    present: students.filter(s => s.attendance_status === 'present').length,
    absent: students.filter(s => s.attendance_status === 'absent').length,
    late: students.filter(s => s.attendance_status === 'late').length,
    total: students.length,
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-8 text-center">
        <p className="text-gray-600">Không có tiết học nào hôm nay. Vui lòng thêm thời khóa biểu.</p>
      </div>
    );
  }

  const currentSession = sessions.find(s => s.id === selectedSession);

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
          onChange={(e) => {
            setSelectedSession(e.target.value);
            loadData();
          }}
          className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm sm:text-base"
        >
          {sessions.map(session => (
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

      {/* Student List */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-3 sm:p-4 border-b border-gray-200">
          <input
            type="text"
            placeholder="Tìm kiếm học sinh..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm sm:text-base"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-semibold text-gray-700">Học Sinh</th>
                <th className="hidden sm:table-cell px-4 py-3 text-left text-sm font-semibold text-gray-700">MSSV</th>
                <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-semibold text-gray-700">Trạng Thái</th>
                <th className="hidden md:table-cell px-4 py-3 text-left text-sm font-semibold text-gray-700">Thời Gian</th>
                {classroom.selfie_required && (
                  <th className="hidden lg:table-cell px-4 py-3 text-center text-sm font-semibold text-gray-700">Ảnh</th>
                )}
                {classroom.gps_required && (
                  <th className="hidden xl:table-cell px-4 py-3 text-left text-sm font-semibold text-gray-700">Vị trí</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredStudents.map(student => (
                <tr key={student.id} className="hover:bg-gray-50">
                  <td className="px-3 sm:px-4 py-2 sm:py-3">
                    <div className="text-xs sm:text-sm font-medium text-gray-900">
                      {student.full_name}
                    </div>
                    <div className="sm:hidden text-xs text-gray-500">
                      {student.student_id || '-'}
                    </div>
                  </td>
                  <td className="hidden sm:table-cell px-4 py-3 text-sm text-gray-600">
                    {student.student_id || '-'}
                  </td>
                  <td className="px-3 sm:px-4 py-2 sm:py-3">
                    <select
                      value={student.attendance_status || ''}
                      onChange={(e) => updateAttendance(student.id, e.target.value as AttendanceStatus)}
                      className={`
                        w-full sm:w-auto px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-semibold border-2
                        ${!student.attendance_status ? 'border-gray-300 text-gray-600' : ''}
                        ${student.attendance_status === 'present' ? 'border-green-500 bg-green-50 text-green-700' : ''}
                        ${student.attendance_status === 'absent' ? 'border-red-500 bg-red-50 text-red-700' : ''}
                        ${student.attendance_status === 'late' ? 'border-yellow-500 bg-yellow-50 text-yellow-700' : ''}
                        ${student.attendance_status === 'excused' ? 'border-blue-500 bg-blue-50 text-blue-700' : ''}
                      `}
                    >
                      <option value="">Chọn...</option>
                      <option value="present">✅ Có mặt</option>
                      <option value="absent">❌ Vắng</option>
                      <option value="late">⏰ Muộn</option>
                      <option value="excused">📝 Có phép</option>
                    </select>
                  </td>
                  <td className="hidden md:table-cell px-4 py-3 text-sm text-gray-600">
                    {student.check_in_time ? new Date(student.check_in_time).toLocaleTimeString('vi-VN', {
                      hour: '2-digit',
                      minute: '2-digit'
                    }) : '-'}
                  </td>
                  {classroom.selfie_required && (
                    <td className="hidden lg:table-cell px-4 py-3">
                      {student.selfie_url ? (
                        <button
                          onClick={() => setViewingSelfie({ url: student.selfie_url!, studentName: student.full_name })}
                          className="block w-12 h-12 rounded-lg overflow-hidden border-2 border-gray-300 hover:border-green-500 transition-all"
                          title="Xem ảnh selfie"
                        >
                          <img src={student.selfie_url} alt={student.full_name} className="w-full h-full object-cover" />
                        </button>
                      ) : (
                        <span className="text-xs text-gray-400">-</span>
                      )}
                    </td>
                  )}
                  {classroom.gps_required && (
                    <td className="hidden xl:table-cell px-4 py-3">
                      {student.distance_meters !== null && student.distance_meters !== undefined ? (
                        <div className="text-xs">
                          <div className={`font-semibold ${student.distance_meters <= (classroom.radius_meters || 100) ? 'text-green-600' : 'text-red-600'}`}>
                            {student.distance_meters.toFixed(0)}m
                          </div>
                          <div className="text-gray-500">
                            {student.latitude?.toFixed(6)}, {student.longitude?.toFixed(6)}
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">-</span>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>

          {filteredStudents.length === 0 && (
            <div className="p-6 sm:p-8 text-center text-gray-500 text-sm sm:text-base">
              Không tìm thấy học sinh nào
            </div>
          )}
        </div>
      </div>

      {/* Selfie Modal */}
      {viewingSelfie && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
          onClick={() => setViewingSelfie(null)}
        >
          <div className="max-w-2xl w-full bg-white rounded-lg overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-800">{viewingSelfie.studentName}</h3>
              <button
                onClick={() => setViewingSelfie(null)}
                className="p-2 hover:bg-gray-200 rounded-full transition-all"
              >
                <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4">
              <img
                src={viewingSelfie.url}
                alt={viewingSelfie.studentName}
                className="w-full h-auto rounded-lg"
              />
            </div>
            <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => setViewingSelfie(null)}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-semibold transition-all"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
