'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Store } from '@/types';
import QRCode from 'react-qr-code';

interface Props {
  classId: string;
  classroom: Store;
  onUpdate: () => void;
}

export default function ClassSettings({ classId, classroom, onUpdate }: Props) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: classroom.name,
    subject: classroom.subject || '',
    grade_level: classroom.grade_level || '',
    room_number: classroom.room_number || '',
    academic_year: classroom.academic_year || '',
    late_threshold_minutes: classroom.late_threshold_minutes || 15,
    selfie_required: classroom.selfie_required || false, // Using as allow_self_checkin
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
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

          <div className="border-t pt-3 sm:pt-4 mt-3 sm:mt-4">
            <h4 className="text-xs sm:text-sm font-semibold text-gray-700 mb-3">Cài Đặt Điểm Danh</h4>

            <div className="space-y-3 sm:space-y-4">
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

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="allow_self_checkin"
                  checked={formData.selfie_required}
                  onChange={(e) => setFormData({ ...formData, selfie_required: e.target.checked })}
                  className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                />
                <label htmlFor="allow_self_checkin" className="text-xs sm:text-sm font-medium text-gray-700">
                  Cho phép học sinh tự điểm danh
                </label>
              </div>
            </div>
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

      {/* QR Code */}
      <div className="bg-white rounded-lg shadow p-4 sm:p-6">
        <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-4">Mã QR Điểm Danh</h3>
        <div className="flex flex-col md:flex-row gap-4 sm:gap-6 items-start">
          <div className="bg-white p-3 sm:p-4 rounded-lg border-2 border-gray-200 mx-auto md:mx-0">
            <QRCode
              id="class-qr-code"
              value={classroom.qr_code}
              size={160}
              className="sm:w-[200px] sm:h-[200px]"
            />
          </div>
          <div className="flex-1">
            <p className="text-xs sm:text-sm text-gray-600 mb-4">
              Học sinh có thể quét mã QR này để điểm danh (nếu bạn bật tính năng tự điểm danh).
              In mã QR và dán trong lớp học.
            </p>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <button
                onClick={downloadQR}
                className="w-full sm:w-auto px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold flex items-center justify-center gap-2 text-sm sm:text-base"
              >
                <span>📥</span>
                Tải Xuống
              </button>
              <button
                onClick={regenerateQR}
                className="w-full sm:w-auto px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg font-semibold flex items-center justify-center gap-2 text-sm sm:text-base"
              >
                <span>🔄</span>
                Tạo Lại Mã QR
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 sm:p-6">
        <h3 className="text-base sm:text-lg font-bold text-red-900 mb-2">Vùng Nguy Hiểm</h3>
        <p className="text-xs sm:text-sm text-red-700 mb-4">
          Xóa lớp học sẽ xóa tất cả học sinh, điểm danh và dữ liệu liên quan. Hành động này không thể hoàn tác.
        </p>
        <button
          onClick={async () => {
            if (!confirm('Bạn có CHẮC CHẮN muốn xóa lớp học này? Tất cả dữ liệu sẽ bị mất vĩnh viễn!')) return;
            if (!confirm('Lần xác nhận cuối cùng! Xóa lớp học?')) return;

            try {
              const { error } = await supabase
                .from('stores')
                .update({ deleted_at: new Date().toISOString() })
                .eq('id', classId);

              if (error) throw error;

              alert('Đã xóa lớp học');
              window.location.href = '/owner';
            } catch (error) {
              console.error('Error deleting class:', error);
              alert('Lỗi khi xóa lớp học');
            }
          }}
          className="w-full sm:w-auto px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold text-sm sm:text-base"
        >
          🗑️ Xóa Lớp Học
        </button>
      </div>
    </div>
  );
}
