'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { getCurrentUser } from '@/lib/auth';
import Header from '@/components/Header';
import { useToast } from '@/components/Toast';

export default function AddStaff() {
  const params = useParams();
  const router = useRouter();
  const storeId = params.id as string;
  const toast = useToast();

  const [user, setUser] = useState<any>(null);
  const [store, setStore] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [emails, setEmails] = useState('');
  const [salaryType, setSalaryType] = useState<'hourly' | 'monthly' | 'daily'>('hourly');
  const [hourRate, setHourRate] = useState('25000'); // Default hourly rate
  const [monthlyRate, setMonthlyRate] = useState('5000000'); // Default monthly rate
  const [dailyRate, setDailyRate] = useState('200000'); // Default daily rate
  const [results, setResults] = useState<any[]>([]);

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
    loadStore();
  }

  async function loadStore() {
    try {
      const { data, error } = await supabase
        .from('stores')
        .select('*')
        .eq('id', storeId)
        .single();

      if (error) throw error;
      setStore(data);
    } catch (error) {
      console.error('Error loading store:', error);
      toast.error('Không tìm thấy cửa hàng');
      router.push('/owner');
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setResults([]);

    try {
      // Parse emails - support comma-separated and newline-separated
      const emailList = emails
        .split(/[,\n]/)
        .map(e => e.trim())
        .filter(e => e.length > 0);

      if (emailList.length === 0) {
        toast.error('Vui lòng nhập ít nhất một email');
        setLoading(false);
        return;
      }

      // Call API to add staff
      const response = await fetch('/api/staff/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          storeId,
          emails: emailList,
          salaryType,
          hourlyRate: salaryType === 'hourly' ? parseFloat(hourRate) || 0 : 0,
          monthlyRate: salaryType === 'monthly' ? parseFloat(monthlyRate) || 0 : undefined,
          dailyRate: salaryType === 'daily' ? parseFloat(dailyRate) || 0 : undefined,
          storeName: store?.name || 'Cửa hàng'
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Có lỗi xảy ra');
      }

      setResults(data.results);

      // Count successes
      const addedCount = data.results.filter((r: any) => r.status === 'added').length;
      const invitedCount = data.results.filter((r: any) => r.status === 'invited').length;
      const errorCount = data.results.filter((r: any) => r.status === 'error' || r.status === 'already_exists').length;

      // Show summary
      if (addedCount > 0) {
        toast.success(`✅ Đã thêm ${addedCount} nhân viên`);
      }
      if (invitedCount > 0) {
        toast.success(`📧 Đã gửi lời mời đến ${invitedCount} email`);
      }
      if (errorCount > 0) {
        toast.warning(`⚠️ ${errorCount} email không thể xử lý`);
      }

      // If all successful, redirect after 2 seconds
      if (errorCount === 0 && data.results.length > 0) {
        setTimeout(() => {
          router.push(`/owner/${storeId}?tab=staff`);
        }, 2000);
      }
    } catch (error: any) {
      console.error('Error adding staff:', error);
      toast.error('Lỗi: ' + error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <Header />

      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              Thêm Nhân Viên
            </h2>
            <p className="text-gray-600">
              Thêm một hoặc nhiều email. Nếu email chưa có tài khoản, hệ thống sẽ tự động gửi lời mời.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Email (một hoặc nhiều) *
              </label>
              <textarea
                required
                value={emails}
                onChange={(e) => setEmails(e.target.value)}
                rows={5}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                placeholder="nhanvien1@example.com, nhanvien2@example.com
hoặc mỗi email một dòng:
nhanvien3@example.com
nhanvien4@example.com"
              />
              <p className="text-sm text-gray-500 mt-1">
                💡 Nhập nhiều email cách nhau bởi dấu phẩy hoặc xuống dòng.
                Email đã có tài khoản sẽ được thêm ngay, email chưa có sẽ nhận lời mời.
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Loại Lương *
              </label>
              <div className="flex gap-3 mb-4">
                <label className="flex-1 cursor-pointer">
                  <input
                    type="radio"
                    name="salaryType"
                    value="hourly"
                    checked={salaryType === 'hourly'}
                    onChange={(e) => setSalaryType(e.target.value as 'hourly')}
                    className="sr-only"
                  />
                  <div className={`px-4 py-3 rounded-lg border-2 text-center font-medium transition-all ${
                    salaryType === 'hourly'
                      ? 'border-blue-600 bg-blue-50 text-blue-700'
                      : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                  }`}>
                    Theo Giờ
                  </div>
                </label>
                <label className="flex-1 cursor-pointer">
                  <input
                    type="radio"
                    name="salaryType"
                    value="monthly"
                    checked={salaryType === 'monthly'}
                    onChange={(e) => setSalaryType(e.target.value as 'monthly')}
                    className="sr-only"
                  />
                  <div className={`px-4 py-3 rounded-lg border-2 text-center font-medium transition-all ${
                    salaryType === 'monthly'
                      ? 'border-blue-600 bg-blue-50 text-blue-700'
                      : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                  }`}>
                    Theo Tháng
                  </div>
                </label>
                <label className="flex-1 cursor-pointer">
                  <input
                    type="radio"
                    name="salaryType"
                    value="daily"
                    checked={salaryType === 'daily'}
                    onChange={(e) => setSalaryType(e.target.value as 'daily')}
                    className="sr-only"
                  />
                  <div className={`px-4 py-3 rounded-lg border-2 text-center font-medium transition-all ${
                    salaryType === 'daily'
                      ? 'border-blue-600 bg-blue-50 text-blue-700'
                      : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                  }`}>
                    Theo Ngày
                  </div>
                </label>
              </div>

              {salaryType === 'hourly' && (
                <>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Lương Theo Giờ (VNĐ) *
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    required
                    value={hourRate ? new Intl.NumberFormat('vi-VN').format(parseFloat(hourRate.replace(/\./g, ''))) : ''}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\./g, '');
                      if (value === '' || /^\d+$/.test(value)) {
                        setHourRate(value);
                      }
                    }}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="25.000"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Mức lương theo giờ để tính tổng lương (VD: 25.000 VNĐ/giờ)
                  </p>
                </>
              )}

              {salaryType === 'monthly' && (
                <>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Lương Theo Tháng (VNĐ) *
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    required
                    value={monthlyRate ? new Intl.NumberFormat('vi-VN').format(parseFloat(monthlyRate.replace(/\./g, ''))) : ''}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\./g, '');
                      if (value === '' || /^\d+$/.test(value)) {
                        setMonthlyRate(value);
                      }
                    }}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="5.000.000"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Mức lương cố định mỗi tháng (VD: 5.000.000 VNĐ/tháng)
                  </p>
                </>
              )}

              {salaryType === 'daily' && (
                <>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Lương Theo Ngày (VNĐ) *
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    required
                    value={dailyRate ? new Intl.NumberFormat('vi-VN').format(parseFloat(dailyRate.replace(/\./g, ''))) : ''}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\./g, '');
                      if (value === '' || /^\d+$/.test(value)) {
                        setDailyRate(value);
                      }
                    }}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="200.000"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Mức lương theo ngày làm việc (VD: 200.000 VNĐ/ngày)
                  </p>
                </>
              )}
            </div>

            <div className="flex gap-4">
              <Link href={`/owner/${storeId}?tab=staff`} className="flex-1">
                <button
                  type="button"
                  className="w-full bg-gray-200 hover:bg-gray-300 text-gray-700 px-6 py-3 rounded-lg font-semibold transition-all"
                >
                  Hủy
                </button>
              </Link>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-all disabled:opacity-50"
              >
                {loading ? 'Đang xử lý...' : 'Thêm Nhân Viên'}
              </button>
            </div>
          </form>

          {/* Results Display */}
          {results.length > 0 && (
            <div className="mt-8 pt-6 border-t border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Kết Quả</h3>
              <div className="space-y-2">
                {results.map((result, index) => (
                  <div
                    key={index}
                    className={`flex items-start gap-3 p-3 rounded-lg ${
                      result.status === 'added'
                        ? 'bg-green-50 border border-green-200'
                        : result.status === 'invited'
                        ? 'bg-blue-50 border border-blue-200'
                        : result.status === 'already_exists'
                        ? 'bg-yellow-50 border border-yellow-200'
                        : 'bg-red-50 border border-red-200'
                    }`}
                  >
                    <div className="flex-shrink-0 mt-0.5">
                      {result.status === 'added' && (
                        <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                      {result.status === 'invited' && (
                        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                      )}
                      {result.status === 'already_exists' && (
                        <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                      )}
                      {result.status === 'error' && (
                        <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">{result.email}</p>
                      <p className={`text-sm ${
                        result.status === 'added'
                          ? 'text-green-700'
                          : result.status === 'invited'
                          ? 'text-blue-700'
                          : result.status === 'already_exists'
                          ? 'text-yellow-700'
                          : 'text-red-700'
                      }`}>
                        {result.message}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Toast Container */}
      <toast.ToastContainer />
    </div>
  );
}
