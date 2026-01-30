'use client';

import { useState, useEffect, useRef } from 'react';
import Webcam from 'react-webcam';
import { supabase } from '@/lib/supabase';
import { Store, Student, ClassSession } from '@/types';
import { getCurrentLocation, calculateDistance } from '@/utils/location';
import { compressImage } from '@/utils/imageCompression';
import PermissionGuidance from '@/components/common/PermissionGuidance';

interface Props {
  classId: string;
  student: Student;
  classroom: Store;
}

export default function StudentCheckin({ classId, student, classroom }: Props) {
  const webcamRef = useRef<Webcam>(null);

  const [sessions, setSessions] = useState<ClassSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [todayAttendance, setTodayAttendance] = useState<Record<string, any>>({});

  // GPS and Selfie states
  const [step, setStep] = useState<'list' | 'selfie' | 'processing'>('list');
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [selfieImage, setSelfieImage] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [cameraError, setCameraError] = useState(false);
  const [locationError, setLocationError] = useState(false);

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
    // Check if self check-in is enabled (either GPS or Selfie required)
    if (!classroom.selfie_required && !classroom.gps_required) {
      alert('Giáo viên chưa bật tính năng tự điểm danh cho lớp này');
      return;
    }

    setActiveSessionId(sessionId);

    // Check GPS first if required
    if (classroom.gps_required) {
      const location = await getCurrentLocation();
      if (!location) {
        setLocationError(true);
        return;
      }

      // Check if classroom has GPS coordinates set
      if (!classroom.latitude || !classroom.longitude) {
        alert('Giáo viên chưa thiết lập tọa độ GPS cho lớp học');
        return;
      }

      const distance = calculateDistance(
        location.latitude,
        location.longitude,
        classroom.latitude,
        classroom.longitude
      );

      const radiusMeters = classroom.radius_meters || 100;
      if (distance > radiusMeters) {
        alert(`Bạn đang ở cách lớp học ${distance.toFixed(0)}m. Vui lòng đến gần hơn (trong bán kính ${radiusMeters}m).`);
        return;
      }
    }

    // Show selfie capture if required
    if (classroom.selfie_required) {
      setStep('selfie');
      return;
    }

    // Otherwise, proceed with direct check-in (GPS only, no photo)
    await submitCheckin(sessionId, null, null, null, null);
  }

  function capturePhoto() {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (imageSrc) {
      setSelfieImage(imageSrc);
    }
  }

  function retakePhoto() {
    setSelfieImage(null);
  }

  function cancelSelfie() {
    setStep('list');
    setActiveSessionId(null);
    setSelfieImage(null);
  }

  async function handleSubmitSelfie() {
    if (!activeSessionId) return;
    if (classroom.selfie_required && !selfieImage) {
      alert('Vui lòng chụp ảnh selfie');
      return;
    }

    await submitCheckin(activeSessionId, selfieImage, null, null, null);
  }

  async function submitCheckin(
    sessionId: string,
    selfie: string | null,
    latitude: number | null,
    longitude: number | null,
    distance: number | null
  ) {
    setStep('processing');
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

      // Get GPS location again (for security - always get fresh location)
      let finalLatitude = latitude;
      let finalLongitude = longitude;
      let finalDistance = distance;

      if (classroom.gps_required) {
        const location = await getCurrentLocation();
        if (!location) {
          throw new Error('Không thể lấy vị trí GPS');
        }

        finalLatitude = location.latitude;
        finalLongitude = location.longitude;

        if (classroom.latitude && classroom.longitude) {
          finalDistance = calculateDistance(
            location.latitude,
            location.longitude,
            classroom.latitude,
            classroom.longitude
          );

          const radiusMeters = classroom.radius_meters || 100;
          if (finalDistance > radiusMeters) {
            throw new Error(`Bạn đang ở cách lớp học ${finalDistance.toFixed(0)}m. Vui lòng đến gần hơn.`);
          }
        }
      }

      // Upload selfie if required
      let selfieUrl = null;
      if (classroom.selfie_required && selfie) {
        const compressedImage = await compressImage(selfie, 1024, 1024, 0.85);
        const fileName = `student-${student.id}-${Date.now()}.jpg`;
        const base64Data = compressedImage.split(',')[1];
        const blob = await fetch(`data:image/jpeg;base64,${base64Data}`).then(r => r.blob());

        const { error: uploadError } = await supabase.storage
          .from('selfies')
          .upload(fileName, blob, {
            contentType: 'image/jpeg',
          });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('selfies')
          .getPublicUrl(fileName);

        selfieUrl = publicUrl;
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
          latitude: finalLatitude,
          longitude: finalLongitude,
          distance_meters: finalDistance,
          selfie_url: selfieUrl,
        });

      if (error) throw error;

      alert(status === 'present' ? '✅ Điểm danh thành công!' : '⚠️ Điểm danh muộn!');

      // Reset state and reload data
      setStep('list');
      setActiveSessionId(null);
      setSelfieImage(null);
      loadData();

    } catch (error: any) {
      console.error('Error checking in:', error);
      alert('Lỗi khi điểm danh: ' + error.message);
      setStep('list');
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

  // Selfie capture step
  if (step === 'selfie') {
    return (
      <div className="px-4 sm:px-6 py-6">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4 text-center">
            Chụp Ảnh Selfie
          </h2>
          <p className="text-sm text-gray-600 mb-4 text-center">
            Chụp ảnh khuôn mặt để xác nhận điểm danh
          </p>

          {!selfieImage ? (
            <div>
              <div className="mb-4 rounded-lg overflow-hidden relative">
                <Webcam
                  ref={webcamRef}
                  audio={false}
                  screenshotFormat="image/jpeg"
                  className="w-full rounded-lg"
                  videoConstraints={{
                    facingMode: facingMode,
                  }}
                  onUserMediaError={(error) => {
                    console.error('Camera error:', error);
                    setCameraError(true);
                  }}
                />
                {/* Camera Switch Button */}
                <button
                  onClick={() => setFacingMode(prev => prev === 'user' ? 'environment' : 'user')}
                  className="absolute top-4 right-4 bg-black bg-opacity-50 hover:bg-opacity-70 text-white p-3 rounded-full transition-all"
                  title="Chuyển camera"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={cancelSelfie}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-3 rounded-lg font-semibold transition-all"
                >
                  Hủy
                </button>
                <button
                  onClick={capturePhoto}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Chụp Ảnh
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div className="mb-4 rounded-lg overflow-hidden">
                <img src={selfieImage} alt="Selfie" className="w-full rounded-lg" />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={retakePhoto}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-3 rounded-lg font-semibold transition-all"
                >
                  Chụp Lại
                </button>
                <button
                  onClick={handleSubmitSelfie}
                  disabled={checking}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-lg font-semibold transition-all disabled:opacity-50"
                >
                  {checking ? 'Đang xử lý...' : 'Xác Nhận'}
                </button>
              </div>
            </div>
          )}

          {/* Camera Error Dialog */}
          {cameraError && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <PermissionGuidance
                  type="camera"
                  workspaceType="class"
                  onRetry={() => setCameraError(false)}
                  showHeader={false}
                />
              </div>
            </div>
          )}

          {/* Location Error Dialog */}
          {locationError && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <PermissionGuidance
                  type="location"
                  workspaceType="class"
                  onRetry={() => {
                    setLocationError(false);
                    setActiveSessionId(null);
                  }}
                  showHeader={false}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Processing step
  if (step === 'processing') {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Đang xử lý điểm danh...</p>
        </div>
      </div>
    );
  }

  // Sessions list (default step)
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
      {!classroom.selfie_required && !classroom.gps_required && (
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

                    {(classroom.selfie_required || classroom.gps_required) && !hasCheckedIn && !isPast && (
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
