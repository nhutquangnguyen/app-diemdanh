'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Store } from '@/types';
import QRCode from 'react-qr-code';
import DeleteWorkspace from '@/components/common/DeleteWorkspace';

interface Props {
  classId: string;
  classroom: Store;
  onUpdate: () => void;
}

export default function ClassSettings({ classId, classroom, onUpdate }: Props) {
  const [loading, setLoading] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [copied, setCopied] = useState(false);
  const [formData, setFormData] = useState({
    name: classroom.name,
    subject: classroom.subject || '',
    grade_level: classroom.grade_level || '',
    room_number: classroom.room_number || '',
    academic_year: classroom.academic_year || '',
    late_threshold_minutes: classroom.late_threshold_minutes || 15,
    selfie_required: classroom.selfie_required || false, // Require selfie/photo for self check-in
    gps_required: classroom.gps_required || false, // Require location check
    latitude: classroom.latitude || null,
    longitude: classroom.longitude || null,
    radius_meters: classroom.radius_meters || 100,
    access_mode: classroom.access_mode || 'roster_only',
    enrollment_capacity: classroom.enrollment_capacity || null,
    auto_close_when_full: classroom.auto_close_when_full || false,
  });

  // Generate check-in URL
  const checkinUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/student/checkin?class=${classId}`
    : '';

  async function getCurrentLocation() {
    if (!navigator.geolocation) {
      alert('Trình duyệt của bạn không hỗ trợ định vị GPS');
      return;
    }

    setGettingLocation(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setFormData(prev => ({
          ...prev,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        }));
        setGettingLocation(false);
      },
      (error) => {
        console.error('Error getting location:', error);
        let errorMessage = 'Không thể lấy vị trí hiện tại';

        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Bạn đã từ chối quyền truy cập vị trí';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Thông tin vị trí không khả dụng';
            break;
          case error.TIMEOUT:
            errorMessage = 'Yêu cầu lấy vị trí đã hết thời gian';
            break;
        }

        alert(errorMessage);
        setGettingLocation(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate GPS requirement
      if (formData.gps_required && (!formData.latitude || !formData.longitude)) {
        alert('Vui lòng nhập tọa độ GPS trước khi bật yêu cầu GPS');
        setLoading(false);
        return;
      }

      const { error } = await supabase
        .from('stores')
        .update({
          name: formData.name,
          subject: formData.subject,
          grade_level: formData.grade_level,
          room_number: formData.room_number,
          academic_year: formData.academic_year,
          late_threshold_minutes: formData.late_threshold_minutes,
          selfie_required: formData.selfie_required,
          gps_required: formData.gps_required,
          latitude: formData.latitude,
          longitude: formData.longitude,
          radius_meters: formData.radius_meters,
          access_mode: formData.access_mode,
          enrollment_capacity: formData.enrollment_capacity,
          auto_close_when_full: formData.auto_close_when_full,
        })
        .eq('id', classId);

      if (error) throw error;

      alert('Cập nhật thành công!');
      onUpdate();
    } catch (error) {
      console.error('Error updating settings:', error);
      alert('Lỗi khi cập nhật cài đặt');
    } finally {
      setLoading(false);
    }
  }

  async function regenerateQR() {
    if (!confirm('Bạn có chắc muốn tạo lại mã QR? Mã QR cũ sẽ không còn hoạt động.')) return;

    try {
      const newQRCode = `CHECKIN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const { error } = await supabase
        .from('stores')
        .update({ qr_code: newQRCode })
        .eq('id', classId);

      if (error) throw error;

      alert('Đã tạo lại mã QR thành công!');
      onUpdate();
    } catch (error) {
      console.error('Error regenerating QR:', error);
      alert('Lỗi khi tạo lại mã QR');
    }
  }

  async function copyUrl() {
    try {
      await navigator.clipboard.writeText(checkinUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
      alert('Không thể sao chép. Vui lòng thử lại.');
    }
  }

  function downloadQR() {
    const svg = document.getElementById('class-qr-code');
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);
      const pngFile = canvas.toDataURL('image/png');

      const downloadLink = document.createElement('a');
      downloadLink.download = `${classroom.name}-QR.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  }

  return (
    <div className="px-4 sm:px-6 py-6 space-y-4">
      <h2 className="text-lg sm:text-xl font-bold text-gray-900">Cài Đặt Lớp Học</h2>

      {/* Basic Settings */}
      <div className="bg-white rounded-lg shadow p-4 sm:p-6">
        <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-4">Thông Tin Cơ Bản</h3>
        <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
          <div>
            <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2">
              Tên Lớp Học *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm sm:text-base"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2">
                Môn Học
              </label>
              <input
                type="text"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm sm:text-base"
              />
            </div>
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2">
                Khối Lớp
              </label>
              <input
                type="text"
                value={formData.grade_level}
                onChange={(e) => setFormData({ ...formData, grade_level: e.target.value })}
                className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm sm:text-base"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2">
                Phòng Học
              </label>
              <input
                type="text"
                value={formData.room_number}
                onChange={(e) => setFormData({ ...formData, room_number: e.target.value })}
                className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm sm:text-base"
              />
            </div>
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2">
                Năm Học
              </label>
              <input
                type="text"
                value={formData.academic_year}
                onChange={(e) => setFormData({ ...formData, academic_year: e.target.value })}
                className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm sm:text-base"
                placeholder="2024-2025"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2">
              Ngưỡng Muộn (phút)
            </label>
            <input
              type="number"
              min="0"
              value={formData.late_threshold_minutes}
              onChange={(e) => setFormData({ ...formData, late_threshold_minutes: parseInt(e.target.value) })}
              className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm sm:text-base"
            />
            <p className="text-xs sm:text-sm text-gray-500 mt-1">
              Học sinh check-in sau thời gian này sẽ bị đánh dấu là muộn
            </p>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto px-4 sm:px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold disabled:opacity-50 text-sm sm:text-base"
            >
              {loading ? 'Đang lưu...' : 'Lưu Thay Đổi'}
            </button>
          </div>
        </form>
      </div>

      {/* Access Mode Settings */}
      <div className="bg-white rounded-lg shadow p-4 sm:p-6">
        <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-4">Chế Độ Truy Cập</h3>
        <p className="text-sm text-gray-600 mb-4">
          Kiểm soát cách học sinh có thể tham gia lớp học của bạn
        </p>

        <div className="space-y-4">
          {/* Roster Only Option */}
          <label className={`flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
            formData.access_mode === 'roster_only'
              ? 'border-green-500 bg-green-50'
              : 'border-gray-200 hover:border-gray-300'
          }`}>
            <input
              type="radio"
              name="access_mode"
              value="roster_only"
              checked={formData.access_mode === 'roster_only'}
              onChange={(e) => setFormData({ ...formData, access_mode: e.target.value as any })}
              className="mt-1 w-5 h-5 text-green-600"
            />
            <div className="flex-1">
              <div className="font-semibold text-gray-900">Chỉ học sinh trong danh sách</div>
              <div className="text-sm text-gray-600 mt-1">
                Chỉ học sinh đã được thêm vào danh sách mới có thể điểm danh
              </div>
            </div>
          </label>

          {/* Open Enrollment Option */}
          <label className={`flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
            formData.access_mode === 'open_enrollment'
              ? 'border-green-500 bg-green-50'
              : 'border-gray-200 hover:border-gray-300'
          }`}>
            <input
              type="radio"
              name="access_mode"
              value="open_enrollment"
              checked={formData.access_mode === 'open_enrollment'}
              onChange={(e) => setFormData({ ...formData, access_mode: e.target.value as any })}
              className="mt-1 w-5 h-5 text-green-600"
            />
            <div className="flex-1">
              <div className="font-semibold text-gray-900">Cho phép ghi danh</div>
              <div className="text-sm text-gray-600 mt-1">
                Học sinh có thể tự đăng ký qua QR code, cần duyệt
              </div>
            </div>
          </label>

          {/* Enrollment Capacity (only shown when open_enrollment) */}
          {formData.access_mode === 'open_enrollment' && (
            <div className="ml-8 space-y-4 bg-green-50 p-4 rounded-lg border border-green-200">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Sĩ số tối đa (để trống = không giới hạn)
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.enrollment_capacity || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    enrollment_capacity: e.target.value ? parseInt(e.target.value) : null
                  })}
                  placeholder="Ví dụ: 40"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm sm:text-base"
                />
                <p className="text-xs text-gray-600 mt-1">
                  Số lượng học sinh tối đa được phép trong lớp
                </p>
              </div>

              <div className="flex items-center justify-between bg-white p-3 rounded-lg border border-gray-200">
                <div className="flex-1">
                  <div className="text-sm font-semibold text-gray-900">Tự động đóng khi đủ sĩ số</div>
                  <div className="text-xs text-gray-600 mt-1">
                    Tự động chuyển sang "Chỉ học sinh trong danh sách" khi đạt sĩ số tối đa
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer ml-3">
                  <input
                    type="checkbox"
                    checked={formData.auto_close_when_full}
                    onChange={(e) => setFormData({ ...formData, auto_close_when_full: e.target.checked })}
                    disabled={!formData.enrollment_capacity}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600 peer-disabled:opacity-50 peer-disabled:cursor-not-allowed"></div>
                </label>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end pt-4">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="w-full sm:w-auto px-4 sm:px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold disabled:opacity-50 text-sm sm:text-base"
          >
            {loading ? 'Đang lưu...' : 'Lưu Thay Đổi'}
          </button>
        </div>
      </div>

      {/* Self Check-in Settings */}
      <div className="bg-white rounded-lg shadow p-4 sm:p-6">
        <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-4">Tự Điểm Danh</h3>
        <p className="text-sm text-gray-600 mb-4">
          Cho phép học sinh tự điểm danh qua điện thoại. Bật GPS và/hoặc Selfie để kích hoạt tính năng này.
        </p>

        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700">Tọa độ GPS Lớp Học</label>
            <button
              type="button"
              onClick={getCurrentLocation}
              disabled={gettingLocation}
              className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {gettingLocation ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Đang lấy...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Lấy vị trí hiện tại
                </>
              )}
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-600 mb-1">Vĩ độ (Latitude)</label>
              <input
                type="number"
                step="any"
                value={formData.latitude || ''}
                onChange={(e) => setFormData({ ...formData, latitude: parseFloat(e.target.value) || null })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white text-gray-900"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Kinh độ (Longitude)</label>
              <input
                type="number"
                step="any"
                value={formData.longitude || ''}
                onChange={(e) => setFormData({ ...formData, longitude: parseFloat(e.target.value) || null })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white text-gray-900"
              />
            </div>
          </div>
        </div>

        {/* GPS Required Toggle */}
        <div className="bg-gray-50 rounded-lg p-4 mb-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base sm:text-lg font-semibold text-gray-800">Yêu cầu GPS</h3>
              <p className="text-xs sm:text-sm text-gray-600 mt-1">
                Học sinh phải ở trong bán kính cho phép khi điểm danh
              </p>
              {!formData.latitude || !formData.longitude ? (
                <p className="text-xs text-orange-600 font-semibold mt-1">
                  ⚠️ Vui lòng nhập tọa độ GPS trước
                </p>
              ) : null}
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={formData.gps_required}
                onChange={(e) => {
                  if (e.target.checked && (!formData.latitude || !formData.longitude)) {
                    alert('Vui lòng nhập tọa độ GPS trước khi bật yêu cầu GPS');
                    return;
                  }
                  setFormData({ ...formData, gps_required: e.target.checked });
                }}
                className="sr-only peer"
              />
              <div className="w-14 h-7 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-green-600"></div>
            </label>
          </div>
          {formData.gps_required && (
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Bán kính (mét)
              </label>
              <input
                type="number"
                min="10"
                max="1000"
                step="10"
                value={formData.radius_meters}
                onChange={(e) => setFormData({ ...formData, radius_meters: parseInt(e.target.value) })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            </div>
          )}
        </div>

        {/* Selfie Required Toggle */}
        <div className="bg-gray-50 rounded-lg p-4 mb-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base sm:text-lg font-semibold text-gray-800">Yêu cầu Selfie</h3>
              <p className="text-xs sm:text-sm text-gray-600 mt-1">
                Học sinh phải chụp ảnh khi điểm danh
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={formData.selfie_required}
                onChange={(e) => setFormData({ ...formData, selfie_required: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-14 h-7 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-green-600"></div>
            </label>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="w-full sm:w-auto px-4 sm:px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold disabled:opacity-50 text-sm sm:text-base"
          >
            {loading ? 'Đang lưu...' : 'Lưu Thay Đổi'}
          </button>
        </div>
      </div>

      {/* QR Code */}
      <div className="bg-white rounded-lg shadow p-4 sm:p-6">
        <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-4">Mã QR Điểm Danh</h3>
        <div className="flex flex-col md:flex-row gap-4 sm:gap-6 items-start">
          <div className="bg-white p-3 sm:p-4 rounded-lg border-2 border-gray-200 mx-auto md:mx-0">
            <QRCode
              id="class-qr-code"
              value={checkinUrl}
              size={160}
              className="sm:w-[200px] sm:h-[200px]"
            />
          </div>
          <div className="flex-1 w-full">
            <p className="text-xs sm:text-sm text-gray-600 mb-4">
              Học sinh có thể quét mã QR này để điểm danh (nếu bạn bật tính năng tự điểm danh).
              In mã QR và dán trong lớp học.
            </p>

            {/* URL Display with Copy Button */}
            <div className="mb-4">
              <label className="block text-xs font-semibold text-gray-700 mb-2">Link Điểm Danh:</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={checkinUrl}
                  readOnly
                  className="flex-1 px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs sm:text-sm text-gray-700 font-mono"
                />
                <button
                  onClick={copyUrl}
                  className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all flex items-center gap-2 ${
                    copied
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                  }`}
                >
                  {copied ? (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Đã sao chép
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      <span className="hidden sm:inline">Sao chép</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <button
                onClick={downloadQR}
                className="w-full sm:w-auto px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold flex items-center justify-center gap-2 text-sm sm:text-base"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Tải Xuống
              </button>
              <button
                onClick={regenerateQR}
                className="w-full sm:w-auto px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg font-semibold flex items-center justify-center gap-2 text-sm sm:text-base"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Tạo Lại Mã QR
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <DeleteWorkspace
        workspaceId={classId}
        workspaceName={classroom.name}
      />
    </div>
  );
}
