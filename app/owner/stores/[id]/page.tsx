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
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [settingsLoading, setSettingsLoading] = useState(false);

  // Expandable sections state
  const [expandedSections, setExpandedSections] = useState({
    staffOverview: true,
    staff: false,
    settings: false,
  });

  // Filter state for staff overview
  const [staffFilter, setStaffFilter] = useState<'all' | 'working' | 'late' | 'not_checked'>('all');
  const [staffSearch, setStaffSearch] = useState('');

  useEffect(() => {
    loadStoreData();
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadStoreData, 30000);
    return () => clearInterval(interval);
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

  async function updateStoreSettings(settings: {
    name?: string;
    address?: string;
    latitude?: number;
    longitude?: number;
    gps_required?: boolean;
    selfie_required?: boolean;
    access_mode?: 'staff_only' | 'anyone';
    radius_meters?: number;
  }) {
    setSettingsLoading(true);
    try {
      const { error } = await supabase
        .from('stores')
        .update(settings)
        .eq('id', storeId);

      if (error) throw error;

      alert('Đã cập nhật cài đặt thành công!');
      loadStoreData();
    } catch (error) {
      console.error('Error updating settings:', error);
      alert('Lỗi khi cập nhật cài đặt');
    } finally {
      setSettingsLoading(false);
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
    } catch (error: any) {
      console.error('Error loading store data:', error);
      console.error('Error details:', {
        message: error?.message,
        code: error?.code,
        details: error?.details,
      });
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

  function toggleSection(section: keyof typeof expandedSections) {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));

    // Scroll to section after a brief delay to allow animation
    setTimeout(() => {
      const element = document.getElementById(`section-${section}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  }

  // Calculate today's stats
  const today = new Date().toDateString();
  const todayCheckIns = checkIns.filter(c => new Date(c.check_in_time).toDateString() === today);
  const currentlyWorking = todayCheckIns.filter(c => c.status === 'success'); // All successful check-ins for today
  const notCheckedIn = staff.length - todayCheckIns.length;

  // Calculate average time (mock for now - would need check-out times)
  const avgTime = todayCheckIns.length > 0 ? '2.5h' : '0h';

  // Recent check-ins (last 5)
  const recentCheckIns = checkIns.slice(0, 5);

  // Week data (mock - would calculate from actual data)
  const weekDays = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
  const weekData = [8, 12, 10, 11, todayCheckIns.length, 0, 0]; // Mock data

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

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Link href="/owner">
              <button className="text-gray-600 hover:text-gray-800">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            </Link>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">{store.name}</h1>
              <p className="text-sm text-gray-600">{store.address}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href={`/owner/stores/${storeId}/report`}>
              <button className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-3 sm:px-4 py-2 rounded-lg font-semibold transition-all">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="hidden md:inline">Báo cáo</span>
              </button>
            </Link>
            <button
              onClick={() => toggleSection('settings')}
              className="text-gray-600 hover:text-gray-800 p-2 rounded-lg hover:bg-white/50 transition-all"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          </div>
        </div>

        {/* STAFF OVERVIEW */}
        <div id="section-staffOverview" className="bg-white rounded-lg shadow-lg mb-4 overflow-hidden">
          <button
            onClick={() => toggleSection('staffOverview')}
            className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-all"
          >
            <h2 className="text-xl font-bold text-gray-800">
              TỔNG QUAN NHÂN VIÊN
            </h2>
            <svg
              className={`w-5 h-5 text-gray-600 transition-transform ${expandedSections.staffOverview ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {expandedSections.staffOverview && (
            <div className="px-6 pb-6">
              {/* Filter Tabs */}
              <div className="grid grid-cols-4 gap-2 mb-4">
                <button
                  onClick={() => setStaffFilter('all')}
                  className={`px-3 py-2 rounded-lg font-semibold text-sm transition-all ${
                    staffFilter === 'all'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <div>Tất cả</div>
                  <div className={`text-xs mt-1 ${staffFilter === 'all' ? 'text-blue-100' : 'text-gray-500'}`}>
                    ({staff.length})
                  </div>
                </button>
                <button
                  onClick={() => setStaffFilter('working')}
                  className={`px-3 py-2 rounded-lg font-semibold text-sm transition-all ${
                    staffFilter === 'working'
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <div>Đang làm</div>
                  <div className={`text-xs mt-1 ${staffFilter === 'working' ? 'text-green-100' : 'text-gray-500'}`}>
                    ({currentlyWorking.length})
                  </div>
                </button>
                <button
                  onClick={() => setStaffFilter('late')}
                  className={`px-3 py-2 rounded-lg font-semibold text-sm transition-all ${
                    staffFilter === 'late'
                      ? 'bg-yellow-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <div>Muộn</div>
                  <div className={`text-xs mt-1 ${staffFilter === 'late' ? 'text-yellow-100' : 'text-gray-500'}`}>
                    ({todayCheckIns.filter((c: CheckIn) => c.status === 'late').length})
                  </div>
                </button>
                <button
                  onClick={() => setStaffFilter('not_checked')}
                  className={`px-3 py-2 rounded-lg font-semibold text-sm transition-all ${
                    staffFilter === 'not_checked'
                      ? 'bg-orange-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <div>Chưa check</div>
                  <div className={`text-xs mt-1 ${staffFilter === 'not_checked' ? 'text-orange-100' : 'text-gray-500'}`}>
                    ({notCheckedIn})
                  </div>
                </button>
              </div>

              {/* Search Box */}
              <div className="mb-4">
                <input
                  type="text"
                  placeholder="Tìm tên..."
                  value={staffSearch}
                  onChange={(e) => setStaffSearch(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Staff Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Nhân viên
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Check-in
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Check-out
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Thời gian làm
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Trạng thái
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {staff
                      .filter((s: Staff) => {
                        // Filter by status
                        const todayCheckIn = todayCheckIns.find((c: CheckIn) => c.staff_id === s.id);
                        if (staffFilter === 'working') {
                          return todayCheckIn && todayCheckIn.status === 'success';
                        } else if (staffFilter === 'late') {
                          return todayCheckIn && todayCheckIn.status === 'late';
                        } else if (staffFilter === 'not_checked') {
                          return !todayCheckIn;
                        }
                        return true; // 'all'
                      })
                      .filter((s: Staff) => {
                        // Filter by search
                        if (!staffSearch) return true;
                        return s.full_name.toLowerCase().includes(staffSearch.toLowerCase());
                      })
                      .map((s: Staff) => {
                        const todayCheckIn = todayCheckIns.find((c: CheckIn) => c.staff_id === s.id);
                        const isWorking = todayCheckIn && todayCheckIn.status === 'success';
                        const isLate = todayCheckIn && todayCheckIn.status === 'late';
                        const initials = s.full_name
                          ?.split(' ')
                          .slice(-2)
                          .map((n: string) => n[0])
                          .join('')
                          .toUpperCase() || '??';

                        let workDuration = '';
                        if (todayCheckIn) {
                          const minutes = Math.floor((Date.now() - new Date(todayCheckIn.check_in_time).getTime()) / 1000 / 60);
                          const hours = Math.floor(minutes / 60);
                          const mins = minutes % 60;
                          workDuration = `${hours}h ${mins}m`;
                        }

                        return (
                          <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                                  isWorking ? 'bg-gradient-to-br from-green-500 to-green-600' :
                                  isLate ? 'bg-gradient-to-br from-yellow-500 to-yellow-600' :
                                  'bg-gradient-to-br from-gray-400 to-gray-500'
                                }`}>
                                  {initials}
                                </div>
                                <div>
                                  <div className="font-semibold text-gray-800">{s.full_name}</div>
                                  <div className="text-xs text-gray-500">{s.email}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-700">
                              {todayCheckIn ? (
                                new Date(todayCheckIn.check_in_time).toLocaleTimeString('vi-VN', {
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })
                              ) : (
                                <span className="text-gray-400">--:--</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-700">
                              <span className="text-gray-400">--:--</span>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-700">
                              {workDuration || <span className="text-gray-400">--</span>}
                            </td>
                            <td className="px-4 py-3">
                              {isWorking && (
                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                  Đang làm
                                </span>
                              )}
                              {isLate && (
                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-700">
                                  ⚠ Muộn
                                </span>
                              )}
                              {!todayCheckIn && (
                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-600">
                                  Chưa điểm danh
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* STAFF MANAGEMENT */}
        <div id="section-staff" className="bg-white rounded-lg shadow-lg mb-4 overflow-hidden">
          <button
            onClick={() => toggleSection('staff')}
            className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-all"
          >
            <h2 className="text-xl font-bold text-gray-800">
              NHÂN VIÊN ({staff.length})
            </h2>
            <svg
              className={`w-5 h-5 text-gray-600 transition-transform ${expandedSections.staff ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {expandedSections.staff && (
            <div className="px-6 pb-6">
              <div className="mb-4">
                <Link href={`/owner/stores/${storeId}/add-staff`}>
                  <button className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold transition-all flex items-center justify-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Thêm Nhân Viên
                  </button>
                </Link>
              </div>

              {staff.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  Chưa có nhân viên nào
                </div>
              ) : (
                <div className="space-y-2">
                  {staff.map((member) => (
                    <div key={member.id} className="bg-gray-50 rounded-lg p-4 flex items-center justify-between hover:bg-gray-100 transition-all">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold shadow">
                          {member.full_name?.split(' ').slice(-2).map(n => n[0]).join('').toUpperCase() || '??'}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-800">{member.full_name}</p>
                          <p className="text-sm text-gray-600">{member.email}</p>
                          {member.phone && (
                            <p className="text-sm text-gray-500">{member.phone}</p>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => deleteStaff(member.id)}
                        className="text-red-600 hover:text-red-800 font-semibold px-4 py-2 rounded-lg hover:bg-red-50 transition-all"
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

        {/* SETTINGS */}
        <div id="section-settings" className="bg-white rounded-lg shadow-lg mb-4 overflow-hidden">
          <button
            onClick={() => toggleSection('settings')}
            className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-all"
          >
            <h2 className="text-xl font-bold text-gray-800">CÀI ĐẶT</h2>
            <svg
              className={`w-5 h-5 text-gray-600 transition-transform ${expandedSections.settings ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {expandedSections.settings && (
            <div className="px-6 pb-6">
              {/* QR CODE & SHARING */}
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Mã QR Điểm Danh</h3>
                <div className="text-center">
                  <div className="bg-white p-6 rounded-lg inline-block border-2 border-gray-200">
                    <QRCode
                      id="qr-code"
                      value={`https://www.diemdanh.net/checkin/submit?store=${store.id}`}
                      size={200}
                      level="H"
                    />
                  </div>
                  <div className="mt-4">
                    <div className="flex flex-wrap gap-2 justify-center">
                      <button
                        type="button"
                        onClick={downloadQRCode}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold flex items-center gap-2 transition-all"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Tải xuống
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(`https://www.diemdanh.net/checkin/submit?store=${store.id}`);
                          alert('Đã sao chép link!');
                        }}
                        className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-lg font-semibold flex items-center gap-2 transition-all"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        Copy Link
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                updateStoreSettings({
                  name: formData.get('name') as string,
                  address: formData.get('address') as string,
                  latitude: parseFloat(formData.get('latitude') as string),
                  longitude: parseFloat(formData.get('longitude') as string),
                  gps_required: formData.get('gps_required') === 'on',
                  selfie_required: formData.get('selfie_required') === 'on',
                  access_mode: formData.get('access_mode') as 'staff_only' | 'anyone',
                  radius_meters: parseInt(formData.get('radius_meters') as string) || 50,
                });
              }} className="space-y-6">
                {/* Store Information */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Thông Tin Cửa Hàng</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Tên cửa hàng</label>
                      <input
                        type="text"
                        name="name"
                        required
                        defaultValue={store.name}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Địa chỉ</label>
                      <input
                        type="text"
                        name="address"
                        required
                        defaultValue={store.address}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Vĩ độ</label>
                        <input
                          type="number"
                          name="latitude"
                          required
                          step="any"
                          defaultValue={store.latitude}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Kinh độ</label>
                        <input
                          type="number"
                          name="longitude"
                          required
                          step="any"
                          defaultValue={store.longitude}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* GPS Settings */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-800">Yêu cầu GPS</h3>
                      <p className="text-sm text-gray-600 mt-1">
                        Nhân viên phải ở trong bán kính cho phép
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        name="gps_required"
                        className="sr-only peer"
                        defaultChecked={store.gps_required}
                      />
                      <div className="w-14 h-7 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Bán kính (mét)
                    </label>
                    <input
                      type="number"
                      name="radius_meters"
                      min="10"
                      max="1000"
                      step="10"
                      defaultValue={store.radius_meters}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* Selfie Settings */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-800">Yêu cầu Selfie</h3>
                      <p className="text-sm text-gray-600 mt-1">
                        Nhân viên phải chụp ảnh khi điểm danh
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        name="selfie_required"
                        className="sr-only peer"
                        defaultChecked={store.selfie_required}
                      />
                      <div className="w-14 h-7 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                </div>

                {/* Access Mode */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Chế độ truy cập</h3>
                  <div className="space-y-3">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="radio"
                        name="access_mode"
                        value="staff_only"
                        defaultChecked={store.access_mode === 'staff_only'}
                        className="w-5 h-5 text-blue-600"
                      />
                      <div>
                        <div className="font-medium text-gray-800">Chỉ nhân viên</div>
                        <div className="text-sm text-gray-600">Chỉ email trong danh sách mới điểm danh được</div>
                      </div>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="radio"
                        name="access_mode"
                        value="anyone"
                        defaultChecked={store.access_mode === 'anyone'}
                        className="w-5 h-5 text-blue-600"
                      />
                      <div>
                        <div className="font-medium text-gray-800">Bất kỳ ai</div>
                        <div className="text-sm text-gray-600">Ai cũng có thể điểm danh (không cần trong danh sách)</div>
                      </div>
                    </label>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={settingsLoading}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-semibold transition-all"
                >
                  {settingsLoading ? 'Đang lưu...' : 'Lưu Cài Đặt'}
                </button>
              </form>
            </div>
          )}
        </div>
      </main>

      {/* Image Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-4xl w-full">
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute -top-12 right-0 text-white hover:text-gray-300 transition-colors"
            >
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <img
              src={selectedImage}
              alt="Full size selfie"
              className="w-full h-auto rounded-lg shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}

    </div>
  );
}
