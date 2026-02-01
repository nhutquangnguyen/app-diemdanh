'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { FeatureProps } from '@/core/types/feature';
import { TodayView } from './TodayView';
import { ImageModal } from '@/components/common/ImageModal';

interface CheckIn {
  id: string;
  store_id: string;
  staff_id: string;
  check_in_time: string;
  check_out_time?: string;
  selfie_url?: string;
  check_out_selfie_url?: string;
  latitude?: number;
  longitude?: number;
  distance_from_store?: number;
  staff?: Person;
  [key: string]: any;
}

interface Person {
  id: string;
  name: string;
  email?: string;
  photo_url?: string;
  [key: string]: any;
}

interface ShiftTemplate {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
  color?: string;
  [key: string]: any;
}

interface Schedule {
  id: string;
  store_id: string;
  scheduled_date: string;
  staff_id?: string;
  student_id?: string;
  shift_template_id?: string;
  shift_template?: ShiftTemplate;
  [key: string]: any;
}

/**
 * Attendance Feature Component
 *
 * This is a reusable feature that works across all workspace types.
 * The adapter pattern allows customization for different workspace types
 * (staff for business, students for education, team members for projects, etc.)
 */
export function AttendanceFeature({ workspaceId, config, adapter }: FeatureProps) {
  const [people, setPeople] = useState<Person[]>([]);
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [shifts, setShifts] = useState<ShiftTemplate[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCheckIn, setSelectedCheckIn] = useState<CheckIn | null>(null);

  // Config
  const peopleLabel = config.peopleLabel || 'People';
  const checkInLabel = config.checkInLabel || 'Check-in';
  const gracePeriodMinutes = config.lateThresholdMinutes || 15;

  // Load data
  async function loadData() {
    try {
      setLoading(true);

      const today = new Date();
      const todayDate = today.toISOString().split('T')[0];
      const tomorrowDate = new Date(today.getTime() + 86400000).toISOString().split('T')[0];

      // Determine table names based on workspace type (from adapter)
      const peopleTable = adapter?.tables?.people || 'staff';
      const checkInsTable = adapter?.tables?.checkIns || 'check_ins';
      const shiftsTable = adapter?.tables?.shifts || 'shift_templates';
      const schedulesTable = adapter?.tables?.schedules || 'staff_schedules';

      // Determine field names based on workspace type (from adapter)
      const personIdField = adapter?.fields?.personId || 'staff_id';
      const workspaceIdField = adapter?.fields?.workspaceId || 'store_id';
      const sessionIdField = adapter?.fields?.sessionId || 'shift_id';

      // Load people
      const { data: peopleData, error: peopleError } = await supabase
        .from(peopleTable)
        .select('*')
        .eq(workspaceIdField, workspaceId)
        .is('deleted_at', null);

      if (peopleError) throw peopleError;

      // Load check-ins (today only)
      // Education uses attendance_date (date) + check_in_time (time)
      // Business uses check_in_time (timestamp)
      let checkInsQuery = supabase
        .from(checkInsTable)
        .select(`*, ${peopleTable}(*)`)
        .eq(workspaceIdField, workspaceId);

      // For education (attendance_records), filter by attendance_date
      if (checkInsTable === 'attendance_records') {
        checkInsQuery = checkInsQuery
          .eq('attendance_date', todayDate)
          .order('check_in_time', { ascending: false });
      } else {
        // For business (check_ins), filter by check_in_time timestamp
        checkInsQuery = checkInsQuery
          .gte('check_in_time', `${todayDate}T00:00:00`)
          .lt('check_in_time', `${tomorrowDate}T00:00:00`)
          .order('check_in_time', { ascending: false });
      }

      const { data: checkInsData, error: checkInsError } = await checkInsQuery as any;

      if (checkInsError) throw checkInsError;

      // Load shifts
      const { data: shiftsData, error: shiftsError } = await supabase
        .from(shiftsTable)
        .select('*')
        .eq(workspaceIdField, workspaceId)
        .is('deleted_at', null)
        .order('start_time');

      if (shiftsError) throw shiftsError;

      // Load today's schedules
      const { data: schedulesData, error: schedulesError } = await supabase
        .from(schedulesTable)
        .select(`*, shift_template:${shiftsTable}(*)`)
        .eq(workspaceIdField, workspaceId)
        .gte('scheduled_date', todayDate)
        .lt('scheduled_date', tomorrowDate) as any;

      if (schedulesError) throw schedulesError;

      // Apply adapter transformations if provided
      const transformedPeople = adapter?.transformData
        ? peopleData?.map(p => adapter.transformData!(p)) || []
        : peopleData || [];

      setPeople(transformedPeople);
      setCheckIns(checkInsData || []);
      setShifts(shiftsData || []);
      setSchedules(schedulesData || []);
    } catch (error) {
      console.error('Error loading attendance data:', error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();

    // Auto-refresh every 30 seconds
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [workspaceId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading {checkInLabel}...</p>
        </div>
      </div>
    );
  }

  // Use custom TodayView from adapter, or default
  const TodayViewComponent = adapter?.components?.TodayView || TodayView;

  return (
    <>
      <TodayViewComponent
        people={people}
        checkIns={checkIns}
        shifts={shifts}
        schedules={schedules}
        config={config}
        onViewPhoto={(checkIn: CheckIn) => setSelectedCheckIn(checkIn)}
      />

      {/* Image Modal */}
      {selectedCheckIn && (
        <ImageModal
          isOpen={true}
          onClose={() => setSelectedCheckIn(null)}
          imageUrl={selectedCheckIn.selfie_url || ''}
          title={`${selectedCheckIn.staff?.name || 'Unknown'} - ${checkInLabel}`}
          metadata={{
            time: selectedCheckIn.check_in_time,
            distance: selectedCheckIn.distance_from_store
              ? `${selectedCheckIn.distance_from_store}m`
              : undefined,
            checkOut: selectedCheckIn.check_out_time,
            checkOutPhoto: selectedCheckIn.check_out_selfie_url,
          }}
        />
      )}
    </>
  );
}
