'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Store, Staff, ShiftTemplate } from '@/types';
import Header from '@/components/Header';
import StaffSchedule from '@/components/staff/StaffSchedule';
import StaffAvailability from '@/components/staff/StaffAvailability';
import StaffHistory from '@/components/staff/StaffHistory';
import StaffProfile from '@/components/staff/StaffProfile';

export default function StaffDashboard() {
  const params = useParams();
  const router = useRouter();
  const storeId = params.id as string;

  const [store, setStore] = useState<Store | null>(null);
  const [staffMember, setStaffMember] = useState<Staff | null>(null);
  const [shifts, setShifts] = useState<ShiftTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'schedule' | 'availability' | 'history' | 'profile'>('schedule');

  useEffect(() => {
    loadData();
  }, [storeId]);

  async function loadData() {
    try {
      setLoading(true);

      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        router.push('/auth/login');
        return;
      }

      // Load store data
      const { data: storeData, error: storeError } = await supabase
        .from('stores')
        .select('*')
        .eq('id', storeId)
        .single();

      if (storeError) throw storeError;
      setStore(storeData);

      // Load staff member data
      const { data: staffData, error: staffError } = await supabase
        .from('staff')
        .select('*')
        .eq('store_id', storeId)
        .eq('email', user.email)
        .single();

      if (staffError) {
        console.error('Error loading staff data:', staffError);
        // If not a staff member, redirect back
        router.push('/');
        return;
      }

      setStaffMember(staffData);

      // Load shift templates
      const { data: shiftsData, error: shiftsError } = await supabase
        .from('shift_templates')
        .select('*')
        .eq('store_id', storeId)
        .order('start_time');

      if (shiftsError) throw shiftsError;
      setShifts(shiftsData || []);

    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!store || !staffMember) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Không tìm thấy dữ liệu</p>
          <Link href="/" className="text-blue-600 hover:underline">
            Quay lại trang chủ
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col">
      <Header />

      {/* Header with back button */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center gap-3">
          <Link href="/" className="text-gray-600 hover:text-gray-800">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-gray-800">{store.name}</h1>
            <p className="text-xs text-gray-500">Nhân viên: {staffMember.display_name}</p>
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <main className="flex-1 overflow-y-auto pb-20">
        {activeTab === 'schedule' && (
          <StaffSchedule storeId={storeId} staffId={staffMember.id} shifts={shifts} />
        )}
        {activeTab === 'availability' && (
          <StaffAvailability storeId={storeId} staffId={staffMember.id} staffName={staffMember.display_name} shifts={shifts} />
        )}
        {activeTab === 'history' && (
          <StaffHistory storeId={storeId} staffId={staffMember.id} shifts={shifts} />
        )}
        {activeTab === 'profile' && (
          <StaffProfile storeId={storeId} staffId={staffMember.id} staffMember={staffMember} />
        )}
      </main>

      {/* Bottom Tab Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-2 py-2 safe-area-inset-bottom z-50">
        <div className="max-w-7xl mx-auto flex justify-around">
          {/* Tab 1: Tuần này */}
          <button
            onClick={() => setActiveTab('schedule')}
            className={`flex flex-col items-center justify-center px-4 py-2 rounded-lg transition-all flex-1 ${
              activeTab === 'schedule'
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="text-xs font-medium">Tuần này</span>
          </button>

          {/* Tab 2: Lịch Rảnh */}
          <button
            onClick={() => setActiveTab('availability')}
            className={`flex flex-col items-center justify-center px-3 py-2 rounded-lg transition-all flex-1 ${
              activeTab === 'availability'
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-xs font-medium">Lịch Rảnh</span>
          </button>

          {/* Tab 3: Tháng này */}
          <button
            onClick={() => setActiveTab('history')}
            className={`flex flex-col items-center justify-center px-3 py-2 rounded-lg transition-all flex-1 ${
              activeTab === 'history'
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
            <span className="text-xs font-medium">Tháng này</span>
          </button>

          {/* Tab 4: Profile */}
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex flex-col items-center justify-center px-3 py-2 rounded-lg transition-all flex-1 ${
              activeTab === 'profile'
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span className="text-xs font-medium">Profile</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
