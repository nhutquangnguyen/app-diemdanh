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
  const [showQRModal, setShowQRModal] = useState(false);
  const [settingsLoading, setSettingsLoading] = useState(false);

  // Expandable sections state
  const [expandedSections, setExpandedSections] = useState({
    overview: true,
    recent: true,
    whoHere: true,
    week: false,
    staff: false,
    qr: false,
    settings: false,
  });

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

  function toggleSection(section: keyof typeof expandedSections) {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
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
            <button
              onClick={() => setShowQRModal(true)}
              className="hidden sm:flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold transition-all"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
              </svg>
              <span className="hidden md:inline">QR Code</span>
            </button>
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

        {/* TODAY'S OVERVIEW */}
        <div className="bg-white rounded-lg shadow-lg mb-4 overflow-hidden">
          <button
            onClick={() => toggleSection('overview')}
            className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-all"
          >
            <h2 className="text-xl font-bold text-gray-800">HÔM NAY</h2>
            <svg
              className={`w-5 h-5 text-gray-600 transition-transform ${expandedSections.overview ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {expandedSections.overview && (
            <div className="px-6 pb-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {/* Total Check-ins */}
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
                  <div className="text-3xl font-bold text-blue-600 mb-1">{todayCheckIns.length}</div>
                  <div className="text-sm text-gray-600 mb-2">Điểm danh</div>
                  {todayCheckIns.length > 0 && (
                    <div className="text-xs text-green-600 flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                      </svg>
                      Hoạt động
                    </div>
                  )}
                </div>

                {/* Currently Working */}
                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
                  <div className="text-3xl font-bold text-green-600 mb-1">{currentlyWorking.length}</div>
                  <div className="text-sm text-gray-600 mb-2">Đang làm</div>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-xs text-gray-500">Live</span>
                  </div>
                </div>

                {/* Not Checked In */}
                <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4 border border-orange-200">
                  <div className="text-3xl font-bold text-orange-600 mb-1">{notCheckedIn}</div>
                  <div className="text-sm text-gray-600 mb-2">Chưa vào</div>
                  {notCheckedIn > 0 && (
                    <div className="text-xs text-orange-600">
                      Còn {notCheckedIn} người
                    </div>
                  )}
                </div>

                {/* Average Time */}
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
                  <div className="text-3xl font-bold text-purple-600 mb-1">{avgTime}</div>
                  <div className="text-sm text-gray-600 mb-2">TB thời gian</div>
                  <div className="text-xs text-gray-500">Trung bình</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* WHO'S HERE NOW */}
        <div className="bg-white rounded-lg shadow-lg mb-4 overflow-hidden">
          <button
            onClick={() => toggleSection('whoHere')}
            className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-all"
          >
            <h2 className="text-xl font-bold text-gray-800">
              AI ĐANG Ở ĐÂY ({currentlyWorking.length}/{staff.length})
            </h2>
            <svg
              className={`w-5 h-5 text-gray-600 transition-transform ${expandedSections.whoHere ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {expandedSections.whoHere && (
            <div className="px-6 pb-6">
              {currentlyWorking.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <svg className="w-16 h-16 mx-auto mb-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  Chưa có ai đang làm việc
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {currentlyWorking.map((checkIn: any) => {
                    const staff = checkIn.staff;
                    const initials = staff?.full_name
                      ?.split(' ')
                      .slice(-2)
                      .map((n: string) => n[0])
                      .join('')
                      .toUpperCase() || '??';
                    const workDuration = Math.floor((Date.now() - new Date(checkIn.check_in_time).getTime()) / 1000 / 60);
                    const hours = Math.floor(workDuration / 60);
                    const minutes = workDuration % 60;

                    return (
                      <div key={checkIn.id} className="bg-gray-50 rounded-lg p-3 text-center border border-gray-200">
                        <div className="w-14 h-14 mx-auto mb-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-md">
                          {initials}
                        </div>
                        <div className="text-sm font-semibold text-gray-800 truncate" title={staff?.full_name}>
                          {staff?.full_name?.split(' ').slice(-2).join(' ') || 'N/A'}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {hours}h {minutes}m
                        </div>
                        <div className="flex items-center justify-center mt-2">
                          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Not Here Yet */}
              {notCheckedIn > 0 && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <h3 className="text-sm font-semibold text-gray-600 mb-3">
                    CHƯA ĐIỂM DANH ({notCheckedIn})
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {staff
                      .filter(s => !todayCheckIns.some(c => c.staff_id === s.id))
                      .map(s => (
                        <div
                          key={s.id}
                          className="inline-flex items-center gap-2 bg-gray-100 px-3 py-1 rounded-full text-sm text-gray-600"
                        >
                          <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                          {s.full_name.split(' ').slice(-2).join(' ')}
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* RECENT ACTIVITY */}
        <div className="bg-white rounded-lg shadow-lg mb-4 overflow-hidden">
          <button
            onClick={() => toggleSection('recent')}
            className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-all"
          >
            <h2 className="text-xl font-bold text-gray-800">HOẠT ĐỘNG GẦN ĐÂY</h2>
            <div className="flex items-center gap-3">
              {recentCheckIns.length > 5 && (
                <span className="text-sm text-blue-600 hover:underline">Xem tất cả →</span>
              )}
              <svg
                className={`w-5 h-5 text-gray-600 transition-transform ${expandedSections.recent ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </button>

          {expandedSections.recent && (
            <div className="px-6 pb-6">
              {recentCheckIns.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  Chưa có lịch sử điểm danh
                </div>
              ) : (
                <div className="space-y-3">
                  {recentCheckIns.map((checkIn: any, index: number) => {
                    const staff = checkIn.staff;
                    const timeAgo = Math.floor((Date.now() - new Date(checkIn.check_in_time).getTime()) / 1000 / 60);
                    const displayTime = timeAgo < 1 ? 'Vừa xong' : timeAgo < 60 ? `${timeAgo} phút trước` : `${Math.floor(timeAgo / 60)} giờ trước`;

                    return (
                      <div key={checkIn.id} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-all">
                        {/* Timeline dot */}
                        <div className="flex flex-col items-center">
                          <div className={`w-3 h-3 rounded-full ${checkIn.status === 'success' ? 'bg-green-500' : checkIn.status === 'late' ? 'bg-yellow-500' : 'bg-red-500'}`}></div>
                          {index < recentCheckIns.length - 1 && (
                            <div className="w-0.5 h-12 bg-gray-300 my-1"></div>
                          )}
                        </div>

                        {/* Selfie */}
                        {checkIn.selfie_url ? (
                          <button
                            onClick={() => setSelectedImage(checkIn.selfie_url)}
                            className="flex-shrink-0"
                          >
                            <img
                              src={checkIn.selfie_url}
                              alt="Selfie"
                              className="w-12 h-12 rounded-lg object-cover border-2 border-gray-200 hover:border-blue-400 cursor-pointer transition-all"
                            />
                          </button>
                        ) : (
                          <div className="w-12 h-12 flex-shrink-0 rounded-lg bg-gray-300 flex items-center justify-center border-2 border-gray-200">
                            <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                          </div>
                        )}

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-semibold text-gray-800 truncate">
                              {staff?.full_name || 'N/A'}
                            </p>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                              checkIn.status === 'success' ? 'bg-green-100 text-green-700' : checkIn.status === 'late' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
                            }`}>
                              {checkIn.status === 'success' ? '✓ Thành công' : checkIn.status === 'late' ? '⚠ Trễ' : '✗ Sai vị trí'}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-gray-600">
                            <span>{new Date(checkIn.check_in_time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</span>
                            {checkIn.distance_meters > 0 && (
                              <span className="flex items-center gap-1">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                {checkIn.distance_meters.toFixed(0)}m
                              </span>
                            )}
                            <span className="text-gray-500">{displayTime}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* WEEK AT A GLANCE */}
        <div className="bg-white rounded-lg shadow-lg mb-4 overflow-hidden">
          <button
            onClick={() => toggleSection('week')}
            className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-all"
          >
            <h2 className="text-xl font-bold text-gray-800">TUẦN NÀY</h2>
            <svg
              className={`w-5 h-5 text-gray-600 transition-transform ${expandedSections.week ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {expandedSections.week && (
            <div className="px-6 pb-6">
              <div className="flex items-end justify-between gap-2 h-40">
                {weekDays.map((day, index) => {
                  const count = weekData[index];
                  const maxCount = Math.max(...weekData);
                  const heightPercent = maxCount > 0 ? (count / maxCount) * 100 : 0;
                  const isToday = index === 4; // Mock - would calculate based on actual day

                  return (
                    <div key={day} className="flex-1 flex flex-col items-center gap-2">
                      <div className="w-full flex flex-col justify-end items-center" style={{ height: '120px' }}>
                        <div className="text-xs font-semibold text-gray-600 mb-1">{count}</div>
                        <div
                          className={`w-full rounded-t-lg transition-all ${
                            isToday ? 'bg-blue-500' : 'bg-gray-300'
                          }`}
                          style={{ height: `${heightPercent}%`, minHeight: count > 0 ? '8px' : '0' }}
                        ></div>
                      </div>
                      <div className={`text-xs font-medium ${isToday ? 'text-blue-600' : 'text-gray-600'}`}>
                        {day}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* STAFF MANAGEMENT */}
        <div className="bg-white rounded-lg shadow-lg mb-4 overflow-hidden">
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

        {/* QR CODE & SHARING */}
        <div className="bg-white rounded-lg shadow-lg mb-4 overflow-hidden">
          <button
            onClick={() => toggleSection('qr')}
            className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-all"
          >
            <h2 className="text-xl font-bold text-gray-800">MÃ QR & CHIA SẺ</h2>
            <svg
              className={`w-5 h-5 text-gray-600 transition-transform ${expandedSections.qr ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {expandedSections.qr && (
            <div className="px-6 pb-6">
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
                  <p className="text-sm text-gray-600 mb-4">
                    diemdanh.net/c/{store.id.slice(0, 8)}
                  </p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    <button
                      onClick={downloadQRCode}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold flex items-center gap-2 transition-all"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Tải xuống
                    </button>
                    <button
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
          )}
        </div>

        {/* SETTINGS */}
        <div className="bg-white rounded-lg shadow-lg mb-4 overflow-hidden">
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

      {/* QR Modal */}
      {showQRModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4"
          onClick={() => setShowQRModal(false)}
        >
          <div className="bg-white rounded-lg p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-800">Mã QR Điểm Danh</h3>
              <button
                onClick={() => setShowQRModal(false)}
                className="text-gray-600 hover:text-gray-800"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="text-center">
              <div className="bg-white p-6 rounded-lg inline-block border-2 border-gray-200 mb-4">
                <QRCode
                  id="qr-code-modal"
                  value={`https://www.diemdanh.net/checkin/submit?store=${store.id}`}
                  size={250}
                  level="H"
                />
              </div>
              <p className="text-sm text-gray-600 mb-4">{store.name}</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={downloadQRCode}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Tải xuống
                </button>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(`https://www.diemdanh.net/checkin/submit?store=${store.id}`);
                    alert('Đã sao chép link!');
                  }}
                  className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Copy
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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

      {/* Floating QR Button (Mobile) */}
      <button
        onClick={() => setShowQRModal(true)}
        className="sm:hidden fixed bottom-6 right-6 w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg flex items-center justify-center transition-all z-40"
      >
        <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
        </svg>
      </button>
    </div>
  );
}
