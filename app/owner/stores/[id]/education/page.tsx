'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Store } from '@/types';
import Header from '@/components/Header';
import ClassToday from '@/components/education/ClassToday';
import ClassTimetable from '@/components/education/ClassTimetable';
import ClassStudents from '@/components/education/ClassStudents';
import ClassSettings from '@/components/education/ClassSettings';
import TabNavigation, { useTabNavigation } from '@/components/common/TabNavigation';

type EducationTab = 'today' | 'timetable' | 'students' | 'settings';

export default function EducationWorkspace() {
  const params = useParams();
  const router = useRouter();
  const classId = params.id as string;

  const [classroom, setClassroom] = useState<Store | null>(null);
  const [loading, setLoading] = useState(true);

  // Define tabs
  const tabs = [
    { id: 'today', label: 'Hôm Nay', icon: '📋' },
    { id: 'timetable', label: 'Thời Khóa Biểu', icon: '📅' },
    { id: 'students', label: 'Học Sinh', icon: '👥' },
    { id: 'settings', label: 'Cài Đặt', icon: '⚙️' },
  ];

  // Get active tab from URL with persistence
  const activeTab = useTabNavigation(tabs, 'today') as EducationTab;

  useEffect(() => {
    loadClassroom();
  }, [classId]);

  async function loadClassroom() {
    try {
      const { data, error } = await supabase
        .from('stores')
        .select('*')
        .eq('id', classId)
        .eq('workspace_type', 'education')
        .single();

      if (error) throw error;

      if (!data) {
        // Not an education workspace, redirect back
        router.push(`/owner/stores/${classId}`);
        return;
      }

      setClassroom(data);
    } catch (error) {
      console.error('Error loading classroom:', error);
      router.push('/owner');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100">
        <Header />
        <div className="flex justify-center items-center h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
        </div>
      </div>
    );
  }

  if (!classroom) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100">
      <Header />

      {/* Class Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/owner">
                <button className="text-gray-600 hover:text-gray-900">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
              </Link>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🎓</span>
                  <h1 className="text-2xl font-bold text-gray-900">{classroom.name}</h1>
                </div>
                <div className="flex items-center gap-3 mt-1 text-sm text-gray-600">
                  {classroom.subject && <span>📚 {classroom.subject}</span>}
                  {classroom.grade_level && <span>🎯 {classroom.grade_level}</span>}
                  {classroom.room_number && <span>🚪 Phòng {classroom.room_number}</span>}
                </div>
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="mt-4">
            <TabNavigation tabs={tabs} defaultTab="today" />
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'today' && <ClassToday classId={classId} classroom={classroom} />}
        {activeTab === 'timetable' && <ClassTimetable classId={classId} classroom={classroom} />}
        {activeTab === 'students' && <ClassStudents classId={classId} classroom={classroom} />}
        {activeTab === 'settings' && <ClassSettings classId={classId} classroom={classroom} onUpdate={loadClassroom} />}
      </main>
    </div>
  );
}
