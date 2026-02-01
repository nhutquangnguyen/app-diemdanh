'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { getPlugin } from '@/core/utils/pluginRegistry';
import { Store, Student, Staff, ClassSession } from '@/types';
import { getCurrentLocation, calculateDistance } from '@/utils/location';
import Header from '@/components/Header';
import CheckInFlow from '@/components/common/CheckInFlow';
import PermissionGuidance from '@/components/common/PermissionGuidance';

export default function MemberCheckinPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const workspaceId = params.id as string;
  const action = searchParams.get('action'); // 'check-in' or 'check-out'
  const sessionId = searchParams.get('session'); // For education: which session to check into

  const [loading, setLoading] = useState(true);
  const [workspace, setWorkspace] = useState<Store | null>(null);
  const [memberData, setMemberData] = useState<Student | Staff | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeCheckIn, setActiveCheckIn] = useState<any>(null);
  const [isCheckOut, setIsCheckOut] = useState(false);
  const [session, setSession] = useState<ClassSession | null>(null);

  // Permission states
  const [permissionsChecked, setPermissionsChecked] = useState(false);
  const [locationPermissionGranted, setLocationPermissionGranted] = useState(false);
  const [cameraPermissionGranted, setCameraPermissionGranted] = useState(false);
  const [locationError, setLocationError] = useState(false);
  const [cameraError, setCameraError] = useState(false);
  const [distanceError, setDistanceError] = useState(false);
  const [currentDistance, setCurrentDistance] = useState(0);

  useEffect(() => {
    loadData();
  }, [workspaceId]);

  // No redirect - handle all workspace types on this page

  async function loadData() {
    try {
      // Check authentication
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        router.push(`/auth/login?returnUrl=/member/${workspaceId}/checkin`);
        return;
      }

      // Load workspace
      const { data: workspaceData, error: workspaceError } = await supabase
        .from('stores')
        .select('*')
        .eq('id', workspaceId)
        .single();

      if (workspaceError) throw workspaceError;
      if (!workspaceData) {
        setError('Không tìm thấy workspace');
        setLoading(false);
        return;
      }

      setWorkspace(workspaceData);

      // Get plugin to determine member table
      const plugin = getPlugin(workspaceData.workspace_type || 'business');
      const peopleAdapter = plugin?.adapters?.people;
      const memberTable = peopleAdapter?.tables?.people || 'staff';
      const workspaceIdField = peopleAdapter?.fields?.workspaceId || 'store_id';

      // Load member record
      const { data: member, error: memberError } = await supabase
        .from(memberTable)
        .select('*')
        .eq(workspaceIdField, workspaceId)
        .eq('user_id', currentUser.id)
        .eq('status', 'active')
        .single();

      if (memberError || !member) {
        const workspaceLabel = plugin?.config.workspaceLabel?.toLowerCase() || 'workspace';
        setError(`Bạn chưa được thêm vào ${workspaceLabel} này`);
        setLoading(false);
        return;
      }

      setMemberData(member);

      // For staff, check if there's an active check-in
      if (workspaceData.workspace_type !== 'education') {
        await checkForActiveCheckIn(member.id, workspaceId, workspaceData);
      } else if (sessionId) {
        // For education, load the session info
        const { data: sessionData } = await supabase
          .from('class_sessions')
          .select('*')
          .eq('id', sessionId)
          .single();

        if (sessionData) {
          setSession(sessionData);
        }
      }

      setLoading(false);

      // After data is loaded, check permissions
      await checkPermissions(workspaceData);
    } catch (error) {
      console.error('Error loading data:', error);
      setError('Có lỗi xảy ra khi tải dữ liệu');
      setLoading(false);
    }
  }

  async function checkPermissions(workspace: Store) {
    try {
      let allPermissionsGranted = true;

      // Check camera permission if selfie required
      if (workspace.selfie_required) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true });
          stream.getTracks().forEach(track => track.stop());
          setCameraPermissionGranted(true);
        } catch (err) {
          console.error('Camera permission error:', err);
          setCameraError(true);
          allPermissionsGranted = false;
        }
      } else {
        setCameraPermissionGranted(true);
      }

      // Check location permission if GPS required
      if (workspace.gps_required) {
        const location = await getCurrentLocation();
        if (!location) {
          setLocationError(true);
          allPermissionsGranted = false;
        } else {
          setLocationPermissionGranted(true);

          // Check distance if GPS coordinates are set
          if (workspace.latitude && workspace.longitude) {
            const dist = calculateDistance(
              location.latitude,
              location.longitude,
              typeof workspace.latitude === 'string' ? parseFloat(workspace.latitude) : workspace.latitude,
              typeof workspace.longitude === 'string' ? parseFloat(workspace.longitude) : workspace.longitude
            );

            setCurrentDistance(dist);

            if (dist > (workspace.radius_meters || 100)) {
              setDistanceError(true);
              allPermissionsGranted = false;
            }
          }
        }
      } else {
        setLocationPermissionGranted(true);
      }

      setPermissionsChecked(true);
    } catch (error) {
      console.error('Error checking permissions:', error);
      setPermissionsChecked(true);
    }
  }

  async function checkForActiveCheckIn(staffId: string, storeId: string, workspace: Store) {
    try {
      // Get plugin adapter for field names
      const plugin = getPlugin(workspace.workspace_type || 'business');
      const attendanceAdapter = plugin?.adapters?.attendance;
      const personIdField = attendanceAdapter?.fields?.personId || 'staff_id';
      const workspaceIdField = attendanceAdapter?.fields?.workspaceId || 'store_id';

      // Get today's date range
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Check for active check-in (no check_out_time) today
      const { data: activeCheckInData } = await supabase
        .from('check_ins')
        .select('*')
        .eq(personIdField, staffId)
        .eq(workspaceIdField, storeId)
        .gte('check_in_time', today.toISOString())
        .lt('check_in_time', tomorrow.toISOString())
        .is('check_out_time', null)
        .order('check_in_time', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (activeCheckInData) {
        setActiveCheckIn(activeCheckInData);
        setIsCheckOut(true);
      }
    } catch (error) {
      console.error('Error checking active check-in:', error);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Đang tải...</p>
        </div>
      </div>
    );
  }

  if (error || !workspace || !memberData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Lỗi</h2>
          <p className="text-gray-600 mb-6">{error || 'Không thể tải thông tin'}</p>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-all"
          >
            Về Trang Chủ
          </button>
        </div>
      </div>
    );
  }

  const plugin = getPlugin(workspace.workspace_type || 'business');
  const isEducation = workspace.workspace_type === 'education';

  // Show permission guidance if permissions not granted
  const hasPermissionIssue = permissionsChecked && (cameraError || locationError || distanceError);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col">
      <Header />

      {/* Header with back button */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center gap-3">
          <button
            onClick={() => router.push(`/member/${workspaceId}`)}
            className="text-gray-600 hover:text-gray-800"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{plugin?.icon || '📁'}</span>
              <h1 className="text-lg font-bold text-gray-800">{workspace.name}</h1>
            </div>
            <p className="text-xs text-gray-500">
              {isEducation ? (
                <>
                  {workspace.subject && `${workspace.subject} • `}
                  {workspace.grade_level && `${workspace.grade_level}`}
                </>
              ) : (
                workspace.address || 'Điểm danh'
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Check-in Content */}
      <main className="flex-1 overflow-y-auto pb-4">
        {!permissionsChecked ? (
          // Still checking permissions
          <div className="flex justify-center items-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Đang kiểm tra quyền truy cập...</p>
            </div>
          </div>
        ) : hasPermissionIssue ? (
          // Show permission guidance as content (no full page since we have header)
          <div className="px-4 py-6">
            {cameraError && (
              <PermissionGuidance
                type="camera"
                onRetry={() => {
                  setCameraError(false);
                  checkPermissions(workspace);
                }}
                renderMode="modal"
              />
            )}
            {locationError && !cameraError && (
              <PermissionGuidance
                type="location"
                onRetry={() => {
                  setLocationError(false);
                  checkPermissions(workspace);
                }}
                renderMode="modal"
              />
            )}
            {distanceError && !cameraError && !locationError && (
              <PermissionGuidance
                type="distance"
                currentDistance={currentDistance}
                maxRadius={workspace.radius_meters || 100}
                locationName={workspace.name}
                onRetry={() => {
                  setDistanceError(false);
                  checkPermissions(workspace);
                }}
                renderMode="modal"
              />
            )}
          </div>
        ) : (
          // All permissions granted - show CheckInFlow
          <CheckInFlow
          type={isEducation ? 'student' : 'staff'}
          locationId={workspaceId}
          location={{
            name: workspace.name,
            gps_required: workspace.gps_required || false,
            selfie_required: workspace.selfie_required || false,
            latitude: workspace.latitude ? (typeof workspace.latitude === 'string' ? parseFloat(workspace.latitude) : workspace.latitude) : null,
            longitude: workspace.longitude ? (typeof workspace.longitude === 'string' ? parseFloat(workspace.longitude) : workspace.longitude) : null,
            radius_meters: workspace.radius_meters || 100,
          }}
          // Staff-specific props
          staffId={isEducation ? undefined : (memberData as Staff).id}
          isCheckOut={isEducation ? undefined : isCheckOut}
          activeCheckInId={isEducation ? undefined : activeCheckIn?.id}
          // Student-specific props
          studentId={isEducation ? (memberData as Student).id : undefined}
          sessionId={isEducation ? sessionId || undefined : undefined}
          sessionName={isEducation && session ? `${session.name} (${session.start_time.substring(0, 5)} - ${session.end_time.substring(0, 5)})` : undefined}
          onSuccess={(data) => {
            // Redirect back to member page after success
            setTimeout(() => {
              router.push(`/member/${workspaceId}`);
            }, 2000);
          }}
          onCancel={() => {
            router.push(`/member/${workspaceId}`);
          }}
          />
        )}
      </main>
    </div>
  );
}
