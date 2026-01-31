'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { getCurrentUser } from '@/lib/auth';
import { Store } from '@/types';
import { getPlugin } from '@/core/utils/pluginRegistry';
import { PageLayout, Card, Button, EmptyState, LoadingSpinner, Badge } from '@/components/ui';

interface StoreWithStaffCount extends Store {
  staffCount?: number;
  activeStaffCount?: number;
  studentCount?: number; // For education workspaces
}

export default function OwnerDashboard() {
  const router = useRouter();
  const [stores, setStores] = useState<StoreWithStaffCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      router.push('/auth/login?returnUrl=/owner');
      return;
    }
    setUser(currentUser);
    loadStores();
  }

  async function loadStores() {
    try {
      const currentUser = await getCurrentUser();
      if (!currentUser) return;

      const { data, error } = await supabase
        .from('stores')
        .select('*')
        .eq('owner_id', currentUser.id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get today's date range
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const todayStart = today.toISOString();
      const tomorrowStart = tomorrow.toISOString();

      // Fetch staff/student count for each workspace
      const storesWithStaffCount = await Promise.all(
        (data || []).map(async (store) => {
          if (store.workspace_type === 'education') {
            // For education workspaces, get student count
            const { count: totalStudents } = await supabase
              .from('students')
              .select('*', { count: 'exact', head: true })
              .eq('class_id', store.id)
              .eq('status', 'active');

            return {
              ...store,
              studentCount: totalStudents || 0,
            };
          } else {
            // For business workspaces, get staff count and active check-ins
            const { count: totalStaff } = await supabase
              .from('staff')
              .select('*', { count: 'exact', head: true })
              .eq('store_id', store.id);

            // Get active check-ins count (currently working)
            const { count: activeStaff } = await supabase
              .from('check_ins')
              .select('*', { count: 'exact', head: true })
              .eq('store_id', store.id)
              .gte('check_in_time', todayStart)
              .lt('check_in_time', tomorrowStart)
              .is('check_out_time', null);

            return {
              ...store,
              staffCount: totalStaff || 0,
              activeStaffCount: activeStaff || 0,
            };
          }
        })
      );

      setStores(storesWithStaffCount);
    } catch (error) {
      console.error('Error loading stores:', error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <PageLayout>
      {/* Page Header */}
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800">
          Workspaces
        </h1>
        <Link href="/owner/create-store">
          <Button
            iconBefore={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            }
          >
            Tạo Workspace
          </Button>
        </Link>
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <LoadingSpinner text="Đang tải..." />
        </div>
      ) : stores.length === 0 ? (
        /* Empty State */
        <Card>
          <EmptyState
            icon={
              <svg className="w-24 h-24 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            }
            title="Chưa có workspace nào"
            description="Tạo workspace đầu tiên để bắt đầu quản lý điểm danh"
            actionLabel="Tạo Workspace Ngay"
            onAction={() => router.push('/owner/create-store')}
          />
        </Card>
      ) : (
        /* Workspace Grid */
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {stores.map((store) => {
            const plugin = getPlugin(store.workspace_type || 'business');
            const isEducation = store.workspace_type === 'education';

            return (
              <Link key={store.id} href={`/owner/${store.id}`}>
                <Card
                  hoverable
                  className={`border-t-4 ${isEducation ? 'border-green-500' : 'border-blue-500'}`}
                >
                  {/* Workspace Type Badge */}
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-2xl">
                      {plugin?.icon || '📁'}
                    </span>
                    <Badge variant={isEducation ? 'success' : 'primary'}>
                      {plugin?.displayName || store.workspace_type}
                    </Badge>
                  </div>

                  <h3 className="text-xl font-bold text-gray-800 mb-2">
                    {store.name}
                  </h3>

                  {isEducation ? (
                    /* Education Workspace */
                    <>
                      <div className="text-sm text-gray-600 mb-4 space-y-1">
                        {store.subject && <p>📚 {store.subject}</p>}
                        {store.grade_level && <p>🎯 {store.grade_level}</p>}
                        {store.room_number && <p>🚪 Phòng {store.room_number}</p>}
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                        <span className="font-medium text-gray-700">
                          {store.studentCount || 0} {plugin?.config.peopleLabel?.toLowerCase() || 'người'}
                        </span>
                      </div>
                    </>
                  ) : (
                    /* Business Workspace */
                    <>
                      <p className="text-gray-600 text-sm mb-4">
                        {store.address || 'Chưa có địa chỉ'}
                      </p>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2 text-gray-600">
                            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                            <span className="font-medium">
                              {store.staffCount || 0} {plugin?.config.peopleLabel?.toLowerCase() || 'người'}
                            </span>
                          </div>
                          {(store.activeStaffCount || 0) > 0 && (
                            <Badge variant="success" dot pulse>
                              {store.activeStaffCount} đang làm
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center justify-between text-sm text-gray-500">
                          <div className="flex items-center gap-2">
                            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <span>Bán kính: {store.radius_meters}m</span>
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  {/* Arrow icon */}
                  <div className="flex justify-end mt-4">
                    <svg
                      className={`w-5 h-5 ${isEducation ? 'text-green-600' : 'text-blue-600'}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </PageLayout>
  );
}
