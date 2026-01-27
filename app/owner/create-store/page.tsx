'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { getCurrentUser } from '@/lib/auth';
import Header from '@/components/Header';
import { WorkspaceType } from '@/types';

export default function CreateWorkspace() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [step, setStep] = useState<1 | 2>(1); // Step 1: Choose type, Step 2: Fill details
  const [workspaceType, setWorkspaceType] = useState<WorkspaceType>('business');

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      router.push('/auth/login');
      return;
    }
    setUser(currentUser);
  }
  const [loading, setLoading] = useState(false);

  // Business workspace form data
  const [businessData, setBusinessData] = useState({
    name: '',
    address: '',
    latitude: 0,
    longitude: 0,
    radius_meters: 50,
    gps_required: false,
  });

  // Education workspace form data
  const [educationData, setEducationData] = useState({
    name: '',
    subject: '',
    grade_level: '',
    room_number: '',
    academic_year: new Date().getFullYear() + '-' + (new Date().getFullYear() + 1), // e.g., "2026-2027"
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    if (!user) {
      alert('Vui lòng đăng nhập');
      router.push('/auth/login');
      return;
    }

    try {
      // Generate unique QR code data
      const qrCode = `CHECKIN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Prepare insert data based on workspace type
      const insertData = workspaceType === 'business'
        ? {
            ...businessData,
            owner_id: user.id,
            qr_code: qrCode,
            workspace_type: 'business' as const,
          }
        : {
            name: educationData.name,
            subject: educationData.subject,
            grade_level: educationData.grade_level,
            room_number: educationData.room_number,
            academic_year: educationData.academic_year,
            owner_id: user.id,
            qr_code: qrCode,
            workspace_type: 'education' as const,
            // Set defaults for non-required fields
            address: '',
            radius_meters: 50,
            gps_required: false,
            selfie_required: false, // For education, this means allow_self_checkin
            late_threshold_minutes: 15,
          };

      const { data, error } = await supabase
        .from('stores')
        .insert([insertData])
        .select()
        .single();

      if (error) throw error;

      const successMessage = workspaceType === 'business'
        ? 'Tạo cửa hàng thành công!'
        : 'Tạo lớp học thành công!';

      alert(successMessage);
      router.push(`/owner/workspaces/${data.id}`);
    } catch (error: any) {
      console.error('Error creating workspace:', error);
      alert('Lỗi: ' + error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <Header />

      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        <div className="bg-white rounded-lg shadow-lg p-4 sm:p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">
            {step === 1 ? 'Tạo Workspace Mới' : (workspaceType === 'business' ? 'Tạo Cửa Hàng' : 'Tạo Lớp Học')}
          </h1>

          {/* Step 1: Choose Workspace Type */}
          {step === 1 && (
            <div className="space-y-6">
              <p className="text-gray-600 mb-6">Chọn loại workspace bạn muốn tạo:</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Business Option */}
                <button
                  type="button"
                  onClick={() => {
                    setWorkspaceType('business');
                    setStep(2);
                  }}
                  className="group relative p-6 border-2 border-gray-300 rounded-lg hover:border-blue-500 hover:shadow-lg transition-all text-left"
                >
                  <div className="text-4xl mb-3">🏪</div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-blue-600">
                    Kinh Doanh
                  </h3>
                  <p className="text-sm text-gray-600">
                    Quản lý cửa hàng, nhân viên, ca làm việc và lương
                  </p>
                </button>

                {/* Education Option */}
                <button
                  type="button"
                  onClick={() => {
                    setWorkspaceType('education');
                    setStep(2);
                  }}
                  className="group relative p-6 border-2 border-gray-300 rounded-lg hover:border-green-500 hover:shadow-lg transition-all text-left"
                >
                  <div className="text-4xl mb-3">🎓</div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-green-600">
                    Giáo Dục
                  </h3>
                  <p className="text-sm text-gray-600">
                    Quản lý lớp học, học sinh và điểm danh
                  </p>
                </button>
              </div>

              <div className="pt-4">
                <Link href="/owner">
                  <button
                    type="button"
                    className="w-full bg-gray-200 hover:bg-gray-300 text-gray-700 px-6 py-3 rounded-lg font-semibold transition-all"
                  >
                    Hủy
                  </button>
                </Link>
              </div>
            </div>
          )}

          {/* Step 2: Fill Details */}
          {step === 2 && (
            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
              {workspaceType === 'business' ? (
                // Business Form
                <>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Tên Cửa Hàng *
                    </label>
                    <input
                      type="text"
                      required
                      value={businessData.name}
                      onChange={(e) => setBusinessData({ ...businessData, name: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900 placeholder-gray-400"
                      placeholder="VD: Cửa hàng Nguyễn Văn A"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Địa Chỉ
                    </label>
                    <textarea
                      value={businessData.address}
                      onChange={(e) => setBusinessData({ ...businessData, address: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900 placeholder-gray-400"
                      placeholder="VD: 123 Nguyễn Huệ, Quận 1, TP.HCM (Tùy chọn)"
                      rows={3}
                    />
                    <p className="text-sm text-gray-500 mt-2">
                      💡 Bạn có thể cấu hình GPS và vị trí chi tiết trong Cài Đặt sau khi tạo cửa hàng
                    </p>
                  </div>
                </>
              ) : (
                // Education Form
                <>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Tên Lớp Học *
                    </label>
                    <input
                      type="text"
                      required
                      value={educationData.name}
                      onChange={(e) => setEducationData({ ...educationData, name: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white text-gray-900 placeholder-gray-400"
                      placeholder="VD: Toán 101 - Lớp 10A"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Môn Học
                      </label>
                      <input
                        type="text"
                        value={educationData.subject}
                        onChange={(e) => setEducationData({ ...educationData, subject: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white text-gray-900 placeholder-gray-400"
                        placeholder="VD: Toán học"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Khối Lớp
                      </label>
                      <input
                        type="text"
                        value={educationData.grade_level}
                        onChange={(e) => setEducationData({ ...educationData, grade_level: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white text-gray-900 placeholder-gray-400"
                        placeholder="VD: Lớp 10"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Phòng Học
                      </label>
                      <input
                        type="text"
                        value={educationData.room_number}
                        onChange={(e) => setEducationData({ ...educationData, room_number: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white text-gray-900 placeholder-gray-400"
                        placeholder="VD: 204"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Năm Học
                      </label>
                      <input
                        type="text"
                        value={educationData.academic_year}
                        onChange={(e) => setEducationData({ ...educationData, academic_year: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white text-gray-900 placeholder-gray-400"
                        placeholder="VD: 2024-2025"
                      />
                    </div>
                  </div>
                </>
              )}

              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 px-6 py-3 rounded-lg font-semibold transition-all"
                >
                  Quay Lại
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className={`flex-1 ${
                    workspaceType === 'business'
                      ? 'bg-blue-600 hover:bg-blue-700'
                      : 'bg-green-600 hover:bg-green-700'
                  } text-white px-6 py-3 rounded-lg font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-2`}
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      Đang tạo...
                    </>
                  ) : (
                    workspaceType === 'business' ? 'Tạo Cửa Hàng' : 'Tạo Lớp Học'
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}
