'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Store, CheckIn, Staff } from '@/types';
import QRCode from 'react-qr-code';
import Header from '@/components/Header';

export default function StoreDetail() {
  const params = useParams();
  const storeId = params.id as string;

  const [store, setStore] = useState<Store | null>(null);
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'qr' | 'checkins' | 'staff'>('qr');

  useEffect(() => {
    loadStoreData();
  }, [storeId]);

  async function deleteStaff(staffId: string) {
    if (!confirm('Bạn có chắc muốn xóa nhân viên này?')) return;

    try {
      const { error } = await supabase
        .from('staff')
        .delete()
        .eq('id', staffId);

      if (error) throw error;

      alert('Đã xóa nhân viên');
      loadStoreData();
    } catch (error) {
      console.error('Error deleting staff:', error);
      alert('Lỗi khi xóa nhân viên');
    }
  }

  async function loadStoreData() {
    try {
      // Load store
      const { data: storeData, error: storeError } = await supabase
        .from('stores')
        .select('*')
        .eq('id', storeId)
        .single();

      if (storeError) throw storeError;
      setStore(storeData);

      // Load check-ins
      const { data: checkInsData, error: checkInsError } = await supabase
        .from('check_ins')
        .select('*, staff(*)')
        .eq('store_id', storeId)
        .order('check_in_time', { ascending: false })
        .limit(50);

      if (!checkInsError) {
        setCheckIns(checkInsData || []);
      }

      // Load staff
      const { data: staffData, error: staffError } = await supabase
        .from('staff')
        .select('*')
        .eq('store_id', storeId);

      if (!staffError) {
        setStaff(staffData || []);
      }
    } catch (error) {
      console.error('Error loading store data:', error);
    } finally {
      setLoading(false);
    }
  }

  function downloadQRCode() {
    const svg = document.getElementById('qr-code');
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
      downloadLink.download = `QR-${store?.name}.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!store) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Không tìm thấy cửa hàng</h2>
          <Link href="/owner" className="text-blue-600 hover:underline">
            Quay lại trang chủ
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Store Info */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-start justify-between mb-6">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-800 mb-2">{store.name}</h1>
              <div className="space-y-1 text-gray-600">
                <p className="flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {store.address}
                </p>
                <p className="flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                  </svg>
                  Bán kính điểm danh: {store.radius_meters}m
                </p>
                <p className="text-sm text-gray-500">
                  Tọa độ: {store.latitude}, {store.longitude}
                </p>
              </div>
            </div>
            <Link href="/owner">
              <button className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-lg font-semibold transition-all">
                Quay lại
              </button>
            </Link>
          </div>

          {/* Google Map */}
          <div className="w-full h-80 rounded-lg overflow-hidden border border-gray-200">
            <iframe
              width="100%"
              height="100%"
              frameBorder="0"
              style={{ border: 0 }}
              src={`https://www.google.com/maps?q=${store.latitude},${store.longitude}&z=17&output=embed`}
              allowFullScreen
            ></iframe>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-lg mb-6">
          <div className="flex border-b">
            <button
              onClick={() => setActiveTab('qr')}
              className={`flex-1 px-6 py-4 font-semibold transition-all ${
                activeTab === 'qr'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Mã QR Điểm Danh
            </button>
            <button
              onClick={() => setActiveTab('checkins')}
              className={`flex-1 px-6 py-4 font-semibold transition-all ${
                activeTab === 'checkins'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Lịch Sử Điểm Danh ({checkIns.length})
            </button>
            <button
              onClick={() => setActiveTab('staff')}
              className={`flex-1 px-6 py-4 font-semibold transition-all ${
                activeTab === 'staff'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Nhân Viên ({staff.length})
            </button>
          </div>

          {/* QR Code Tab */}
          {activeTab === 'qr' && (
            <div className="p-8">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-gray-800 mb-6">
                  Mã QR Điểm Danh
                </h2>
                <div className="bg-white p-8 rounded-lg inline-block">
                  <QRCode
                    id="qr-code"
                    value={`https://diemdanh.net/checkin/submit?store=${store.id}`}
                    size={300}
                    level="H"
                  />
                </div>
                <div className="mt-6 space-y-4">
                  <button
                    onClick={downloadQRCode}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold flex items-center gap-2 mx-auto transition-all"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Tải Mã QR
                  </button>
                  <div className="text-sm text-gray-600">
                    <p>Bán kính cho phép: <strong>{store.radius_meters} mét</strong></p>
                    <p className="mt-2">In mã QR này và dán tại cửa hàng để nhân viên quét điểm danh</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Check-ins Tab */}
          {activeTab === 'checkins' && (
            <div className="p-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">
                Lịch Sử Điểm Danh
              </h2>
              {checkIns.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  Chưa có lịch sử điểm danh
                </div>
              ) : (
                <div className="space-y-4">
                  {checkIns.map((checkIn: any) => (
                    <div key={checkIn.id} className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-4">
                          <img
                            src={checkIn.selfie_url}
                            alt="Selfie"
                            className="w-16 h-16 rounded-full object-cover"
                          />
                          <div>
                            <p className="font-semibold text-gray-800">
                              {checkIn.staff?.full_name || 'N/A'}
                            </p>
                            <p className="text-sm text-gray-600">
                              {checkIn.staff?.email || 'N/A'}
                            </p>
                          </div>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                          checkIn.status === 'checked_out' ? 'bg-green-100 text-green-800' :
                          checkIn.status === 'checked_in' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {checkIn.status === 'checked_out' ? 'Đã check-out' :
                           checkIn.status === 'checked_in' ? 'Đang làm việc' :
                           checkIn.status === 'success' ? 'Đã check-in' : 'N/A'}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-gray-500">Giờ vào</p>
                          <p className="font-semibold text-gray-800">
                            {new Date(checkIn.check_in_time).toLocaleTimeString('vi-VN', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>

                        {checkIn.check_out_time && (
                          <>
                            <div>
                              <p className="text-gray-500">Giờ ra</p>
                              <p className="font-semibold text-gray-800">
                                {new Date(checkIn.check_out_time).toLocaleTimeString('vi-VN', {
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </p>
                            </div>
                            <div>
                              <p className="text-gray-500">Thời gian làm việc</p>
                              <p className="font-semibold text-green-600">
                                {Math.floor(checkIn.duration_minutes / 60)} giờ {checkIn.duration_minutes % 60} phút
                              </p>
                            </div>
                          </>
                        )}

                        <div>
                          <p className="text-gray-500">Khoảng cách</p>
                          <p className="font-semibold text-gray-800">
                            {checkIn.distance_meters.toFixed(1)}m
                          </p>
                        </div>
                      </div>

                      <div className="mt-3 pt-3 border-t border-gray-200 text-xs text-gray-500">
                        {new Date(checkIn.check_in_time).toLocaleDateString('vi-VN', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Staff Tab */}
          {activeTab === 'staff' && (
            <div className="p-8">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">
                  Danh Sách Nhân Viên
                </h2>
                <Link href={`/owner/stores/${storeId}/add-staff`}>
                  <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold">
                    + Thêm Nhân Viên
                  </button>
                </Link>
              </div>
              {staff.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  Chưa có nhân viên nào
                </div>
              ) : (
                <div className="space-y-4">
                  {staff.map((member) => (
                    <div key={member.id} className="bg-gray-50 rounded-lg p-4 flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-gray-800">{member.full_name}</p>
                        <p className="text-sm text-gray-600">{member.email}</p>
                        {member.phone && (
                          <p className="text-sm text-gray-500">{member.phone}</p>
                        )}
                      </div>
                      <button
                        onClick={() => deleteStaff(member.id)}
                        className="text-red-600 hover:text-red-800 font-semibold"
                      >
                        Xóa
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
