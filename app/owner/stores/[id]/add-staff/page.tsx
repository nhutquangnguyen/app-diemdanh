'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { getCurrentUser } from '@/lib/auth';
import Header from '@/components/Header';

export default function AddStaff() {
  const params = useParams();
  const router = useRouter();
  const storeId = params.id as string;

  const [user, setUser] = useState<any>(null);
  const [store, setStore] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');

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
      alert('Không tìm thấy cửa hàng');
      router.push('/owner');
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      // Check if staff already exists
      const { data: existingStaff } = await supabase
        .from('staff')
        .select('id')
        .eq('email', email)
        .eq('store_id', storeId)
        .single();

      if (existingStaff) {
        alert('Email này đã được thêm vào danh sách nhân viên');
        setLoading(false);
        return;
      }

      // Add staff with email only
      const { error } = await supabase
        .from('staff')
        .insert([
          {
            store_id: storeId,
            email: email,
            full_name: email.split('@')[0], // Use email prefix as name
            phone: null,
          },
        ]);

      if (error) throw error;

      alert('Thêm email thành công!');
      router.push(`/owner/stores/${storeId}`);
    } catch (error: any) {
      console.error('Error adding staff:', error);
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
          <div className="mb-6">
            <p className="text-gray-600">
              Thêm email nhân viên. Chỉ những email trong danh sách mới có thể điểm danh.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Email *
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="nhanvien@example.com"
              />
              <p className="text-sm text-gray-500 mt-1">
                Nhân viên dùng email này để điểm danh
              </p>
            </div>

            <div className="flex gap-4">
              <Link href={`/owner/stores/${storeId}`} className="flex-1">
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
                {loading ? 'Đang thêm...' : 'Thêm Email'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
