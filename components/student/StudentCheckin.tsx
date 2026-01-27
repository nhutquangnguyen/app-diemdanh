'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Store, Student, ClassSession } from '@/types';

interface Props {
  classId: string;
  student: Student;
  classroom: Store;
}

export default function StudentCheckin({ classId, student, classroom }: Props) {
  const [sessions, setSessions] = useState<ClassSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [todayAttendance, setTodayAttendance] = useState<Record<string, any>>({});

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
  }, [classId, student.id]);

  async function loadData() {
    try {
      // Load today's sessions
      const { data: sessionsData, error: sessionsError } = await supabase
        .from('class_sessions')
        .select('*')
        .eq('class_id', classId)
        .eq('day_of_week', dayOfWeek)
        .order('start_time');

      if (sessionsError) throw sessionsError;
      setSessions(sessionsData || []);

      // Load today's attendance for this student
      const { data: attendanceData, error: attendanceError } = await supabase
        .from('attendance_records')
        .select('*')
        .eq('student_id', student.id)
        .eq('attendance_date', today);

      if (attendanceError) throw attendanceError;

      // Create a map of session_id -> attendance record
      const attendanceMap: Record<string, any> = {};
      (attendanceData || []).forEach(record => {
        if (record.session_id) {
          attendanceMap[record.session_id] = record;
        }
      });
      setTodayAttendance(attendanceMap);

    } catch (error) {
      console.error('Error loading sessions:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleCheckin(sessionId: string) {
    if (!classroom.selfie_required) {
      alert('Giáo viên chưa bật tính năng tự điểm danh cho lớp này');
      return;
    }

    setChecking(true);
    try {
      const now = new Date();
      const checkInTime = now.toISOString();

      // Determine status based on time
      const session = sessions.find(s => s.id === sessionId);
      if (!session) return;

      const [hours, minutes] = session.start_time.split(':').map(Number);
      const sessionStart = new Date(now);
      sessionStart.setHours(hours, minutes, 0, 0);

      const diffMinutes = Math.floor((now.getTime() - sessionStart.getTime()) / (1000 * 60));
      const lateThreshold = classroom.late_threshold_minutes || 15;

      let status: 'present' | 'late' = 'present';
      if (diffMinutes > lateThreshold) {
        status = 'late';
      }

      // Insert attendance record
      const { error } = await supabase
        .from('attendance_records')
        .insert({
          student_id: student.id,
          class_id: classId,
          session_id: sessionId,
          attendance_date: today,
          status,
          marked_by: 'student',
          check_in_time: checkInTime,
        });

      if (error) throw error;

      alert(status === 'present' ? '✅ Điểm danh thành công!' : '⚠️ Điểm danh muộn!');
      loadData();

    } catch (error: any) {
      console.error('Error checking in:', error);
      alert('Lỗi khi điểm danh: ' + error.message);
    } finally {
      setChecking(false);
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

      {/* Self check-in status */}
      {!classroom.selfie_required && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-yellow-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div className="flex-1">
              <p className="text-sm font-semibold text-yellow-800">Tự điểm danh chưa được bật</p>
              <p className="text-xs text-yellow-700 mt-1">Giáo viên sẽ điểm danh cho bạn trong giờ học</p>
            </div>
          </div>
        </div>
      )}

      {/* Sessions list */}
      <div className="space-y-3">
        <h3 className="text-lg font-bold text-gray-800 px-2">📚 Tiết học hôm nay</h3>

        {sessions.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
            <p className="text-gray-500">Không có tiết học nào hôm nay</p>
          </div>
        ) : (
          sessions.map(session => {
            const attendance = todayAttendance[session.id];
            const hasCheckedIn = !!attendance;

            const [hours, minutes] = session.start_time.split(':').map(Number);
            const sessionStart = new Date(currentTime);
            sessionStart.setHours(hours, minutes, 0, 0);

            const [endHours, endMinutes] = session.end_time.split(':').map(Number);
            const sessionEnd = new Date(currentTime);
            sessionEnd.setHours(endHours, endMinutes, 0, 0);

            const isNow = currentTime >= sessionStart && currentTime <= sessionEnd;
            const isPast = currentTime > sessionEnd;
            const isFuture = currentTime < sessionStart;

            return (
              <div
                key={session.id}
                className={`bg-white rounded-lg border-2 shadow-sm overflow-hidden ${
                  isNow ? 'border-green-500' : 'border-gray-200'
                }`}
              >
                <div className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-gray-800">{session.name}</h4>
                        {isNow && (
                          <span className="inline-block px-2 py-0.5 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
                            ĐANG HỌC
                          </span>
                        )}
                        {isPast && (
                          <span className="inline-block px-2 py-0.5 bg-gray-100 text-gray-600 text-xs font-semibold rounded-full">
                            ĐÃ KẾT THÚC
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        {session.start_time.substring(0, 5)} - {session.end_time.substring(0, 5)}
                      </div>

                      {hasCheckedIn && (
                        <div className={`mt-2 inline-flex items-center gap-2 text-sm font-semibold ${
                          attendance.status === 'present' ? 'text-green-600' :
                          attendance.status === 'late' ? 'text-yellow-600' :
                          attendance.status === 'excused' ? 'text-blue-600' :
                          'text-red-600'
                        }`}>
                          {attendance.status === 'present' && '✅ Có mặt'}
                          {attendance.status === 'late' && '⚠️ Muộn'}
                          {attendance.status === 'absent' && '❌ Vắng'}
                          {attendance.status === 'excused' && '📝 Có phép'}
                          {attendance.check_in_time && (
                            <span className="text-xs text-gray-500">
                              • {new Date(attendance.check_in_time).toLocaleTimeString('vi-VN', {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {classroom.selfie_required && !hasCheckedIn && !isPast && (
                      <button
                        onClick={() => handleCheckin(session.id)}
                        disabled={checking || isFuture}
                        className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                          isFuture
                            ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                            : 'bg-green-600 hover:bg-green-700 text-white'
                        }`}
                      >
                        {checking ? 'Đang xử lý...' : 'Điểm danh'}
                      </button>
                    )}
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
