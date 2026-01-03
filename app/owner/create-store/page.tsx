'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { getCurrentUser } from '@/lib/auth';
import { getCurrentLocation } from '@/utils/location';
import Header from '@/components/Header';

export default function CreateStore() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

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
  const [locationLoading, setLocationLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    latitude: 0,
    longitude: 0,
    radius_meters: 50,
  });

  async function handleGetLocation() {
    setLocationLoading(true);
    try {
      const location = await getCurrentLocation();
      if (location) {
        setFormData({
          ...formData,
          latitude: location.latitude,
          longitude: location.longitude,
        });
        alert('Đã lấy vị trí hiện tại thành công!');
      } else {
        alert('Không thể lấy vị trí. Vui lòng cho phép truy cập vị trí.');
      }
    } catch (error) {
      console.error('Error getting location:', error);
      alert('Lỗi khi lấy vị trí');
    } finally {
      setLocationLoading(false);
    }
  }

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

      const { data, error } = await supabase
        .from('stores')
        .insert([
          {
            ...formData,
            owner_id: user.id,
            qr_code: qrCode,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      alert('Tạo cửa hàng thành công!');
      router.push(`/owner/stores/${data.id}`);
    } catch (error: any) {
      console.error('Error creating store:', error);
      alert('Lỗi: ' + error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <Header />

      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Tên Cửa Hàng *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="VD: Cửa hàng Nguyễn Văn A"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Địa Chỉ *
              </label>
              <textarea
                required
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="VD: 123 Nguyễn Huệ, Quận 1, TP.HCM"
                rows={3}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Vị Trí GPS *
              </label>
              <div className="flex gap-4 mb-4">
                <input
                  type="number"
                  step="any"
                  required
                  value={formData.latitude || ''}
                  onChange={(e) => setFormData({ ...formData, latitude: parseFloat(e.target.value) })}
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Vĩ độ"
                />
                <input
                  type="number"
                  step="any"
                  required
                  value={formData.longitude || ''}
                  onChange={(e) => setFormData({ ...formData, longitude: parseFloat(e.target.value) })}
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Kinh độ"
                />
              </div>
              <button
                type="button"
                onClick={handleGetLocation}
                disabled={locationLoading}
                className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                {locationLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Đang lấy vị trí...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Lấy Vị Trí Hiện Tại
                  </>
                )}
              </button>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Bán Kính Cho Phép (mét) *
              </label>
              <input
                type="number"
                required
                min="10"
                max="500"
                value={formData.radius_meters}
                onChange={(e) => setFormData({ ...formData, radius_meters: parseInt(e.target.value) })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-sm text-gray-500 mt-2">
                Nhân viên chỉ có thể điểm danh trong bán kính này (10-500m)
              </p>
            </div>

            <div className="flex gap-4">
              <Link href="/owner" className="flex-1">
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
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Đang tạo...
                  </>
                ) : (
                  'Tạo Cửa Hàng'
                )}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
