'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import {
  Store,
  CheckIn,
  Staff,
  ShiftTemplate,
  ScheduleWithDetails,
  StaffFilter,
  WeekSummary,
  SalaryAdjustment,
  SalaryConfirmation,
  StaffSalaryCalculation
} from '@/types';
import QRCode from 'react-qr-code';
import Header from '@/components/Header';
import { useToast } from '@/components/Toast';
import StoreSchedule from '@/components/StoreSchedule';
import SmartScheduleNew from '@/components/SmartScheduleNew';
import StoreShifts from '@/components/StoreShifts';
import StoreSettings from '@/components/StoreSettings';
import StoreToday from '@/components/StoreToday';
import StoreStaff from '@/components/StoreStaff';
import StoreSalary from '@/components/StoreSalary';
import StaffSalaryDetail from '@/components/salary/StaffSalaryDetail';
import AdjustmentForm from '@/components/salary/AdjustmentForm';
import ConfirmDialog from '@/components/ConfirmDialog';
import { calculateStaffMonthlySalary, getCurrentMonth, formatAmount } from '@/lib/salaryCalculations';
import { checkScheduleNeedsReview } from '@/lib/scheduleNotifications';

export default function StoreDetail() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const storeId = params.id as string;
  const toast = useToast();

  const [store, setStore] = useState<Store | null>(null);
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]); // For "today" tab
  const [salaryCheckIns, setSalaryCheckIns] = useState<CheckIn[]>([]); // For salary tab (month-specific)
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [settingsLoading, setSettingsLoading] = useState(false);

  // Tab navigation state - Initialize from URL query params
  const [activeTab, setActiveTab] = useState<'today' | 'overview' | 'shifts' | 'staff' | 'settings' | 'schedule' | 'smart-schedule' | 'report' | 'salary' | 'qr'>(() => {
    const tabFromUrl = searchParams.get('tab');
    const validTabs = ['today', 'overview', 'shifts', 'staff', 'settings', 'schedule', 'smart-schedule', 'report', 'salary', 'qr'];
    return (tabFromUrl && validTabs.includes(tabFromUrl)) ? tabFromUrl as any : 'today';
  });
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const moreMenuRefDesktop = useRef<HTMLDivElement>(null);
  const moreMenuRefMobile = useRef<HTMLDivElement>(null);
  const [scheduleNeedsReview, setScheduleNeedsReview] = useState(false);

  // Filter state for staff overview
  const [staffFilter, setStaffFilter] = useState<'all' | 'working' | 'late' | 'not_checked'>('all');
  const [staffSearch, setStaffSearch] = useState('');
  const [expandedStaff, setExpandedStaff] = useState<Set<string>>(new Set());

  // Edit staff info state
  const [editingStaffId, setEditingStaffId] = useState<string | null>(null);
  const [editSalaryType, setEditSalaryType] = useState<'hourly' | 'monthly' | 'daily'>('hourly');
  const [editHourRate, setEditHourRate] = useState<string>('');
  const [editMonthlyRate, setEditMonthlyRate] = useState<string>('');
  const [editDailyRate, setEditDailyRate] = useState<string>('');
  const [editName, setEditName] = useState<string>('');

  // Swipe-to-delete state
  const [swipeState, setSwipeState] = useState<{ [key: string]: number }>({});
  const [swipeStart, setSwipeStart] = useState<{ staffId: string; x: number } | null>(null);

  // Shift management state
  const [shifts, setShifts] = useState<ShiftTemplate[]>([]);
  const [editingShift, setEditingShift] = useState<ShiftTemplate | null>(null);
  const [showShiftForm, setShowShiftForm] = useState(false);
  const [shiftFormData, setShiftFormData] = useState({
    name: '',
    start_time: '08:00',
    end_time: '17:00',
    grace_period_minutes: 15,
    color: '#3B82F6',
  });

  // Schedule management state
  const [schedules, setSchedules] = useState<ScheduleWithDetails[]>([]);
  const [isAssigning, setIsAssigning] = useState(false);
  const [isRemoving, setIsRemoving] = useState<string | null>(null);
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() => {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(today.setDate(diff));
  });
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedShift, setSelectedShift] = useState<ShiftTemplate | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedStaffIds, setSelectedStaffIds] = useState<string[]>([]);
  const [scheduleStaffSearch, setScheduleStaffSearch] = useState('');

  // Touch/swipe state for mobile gestures
  const [touchStart, setTouchStart] = useState<{ x: number; y: number; time: number } | null>(null);
  const [touchEnd, setTouchEnd] = useState<{ x: number; y: number } | null>(null);

  // Confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    isLoading?: boolean;
    confirmText?: string;
    confirmButtonClass?: string;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    isLoading: false,
  });
  const [isPulling, setIsPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);

  // Day context menu state
  const [dayContextMenu, setDayContextMenu] = useState<{ date: Date; x: number; y: number } | null>(null);
  const [copiedDaySchedule, setCopiedDaySchedule] = useState<ScheduleWithDetails[] | null>(null);

  // Selection state for copy/paste/clear
  const [selectedItem, setSelectedItem] = useState<{ type: 'day' | 'staff'; id: string; date?: Date } | null>(null);
  const [clipboard, setClipboard] = useState<{ type: 'day' | 'staff'; schedules: ScheduleWithDetails[] } | null>(null);

  // Salary management state
  const [selectedMonth, setSelectedMonth] = useState<string>(getCurrentMonth());
  const [salaryAdjustments, setSalaryAdjustments] = useState<SalaryAdjustment[]>([]);
  const [salaryConfirmations, setSalaryConfirmations] = useState<SalaryConfirmation[]>([]);
  const [selectedStaffForSalary, setSelectedStaffForSalary] = useState<string | null>(null);
  const [showAdjustmentForm, setShowAdjustmentForm] = useState(false);
  const [editingAdjustment, setEditingAdjustment] = useState<SalaryAdjustment | null>(null);

  // Wrapper function to update both state and URL when tab changes
  const updateActiveTab = (tab: typeof activeTab) => {
    setActiveTab(tab);
    // Update URL with tab query param to persist across reloads
    const currentUrl = new URL(window.location.href);
    currentUrl.searchParams.set('tab', tab);
    router.replace(currentUrl.pathname + currentUrl.search, { scroll: false });
  };

  useEffect(() => {
    const verifySessionAndLoad = async () => {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        console.warn('⚠️ [AUTH] No active session found on page load');
        toast.error('Bạn cần đăng nhập để xem trang này');
        router.push('/auth/login');
        return;
      }

      console.log('✅ [AUTH] Session verified, loading data');
      loadStoreData();
    };

    verifySessionAndLoad();

    // Auto-refresh every 30 seconds (with session check)
    const interval = setInterval(async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        loadStoreData(); // Safe to always refresh - uses separate state from salary
      } else {
        console.warn('⚠️ [AUTH] Session expired during auto-refresh');
        clearInterval(interval);
      }
    }, 30000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId]);

  useEffect(() => {
    if (storeId && (activeTab === 'schedule' || activeTab === 'today')) {
      loadSchedules();
    }
  }, [currentWeekStart, storeId, activeTab]);

  // Check for schedule warnings that need review
  useEffect(() => {
    async function checkWarnings() {
      if (storeId) {
        const needsReview = await checkScheduleNeedsReview(storeId);
        setScheduleNeedsReview(needsReview);
      }
    }
    checkWarnings();
    // Re-check periodically
    const interval = setInterval(checkWarnings, 60000); // Every minute
    return () => clearInterval(interval);
  }, [storeId, activeTab]);

  useEffect(() => {
    if (storeId && activeTab === 'salary') {
      loadSalaryData();
    }
  }, [selectedMonth, storeId, activeTab]);

  // Close more menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const clickedInsideDesktop = moreMenuRefDesktop.current?.contains(event.target as Node);
      const clickedInsideMobile = moreMenuRefMobile.current?.contains(event.target as Node);

      if (!clickedInsideDesktop && !clickedInsideMobile) {
        setShowMoreMenu(false);
      }
    }

    if (showMoreMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showMoreMenu]);

  function deleteStaff(staffId: string) {
    console.log('🗑️ [DELETE_STAFF] Function called with staffId:', staffId);
    const staffMember = staff.find(s => s.id === staffId);
    console.log('🗑️ [DELETE_STAFF] Found staff member:', staffMember);
    const staffName = staffMember?.display_name || 'nhân viên này';

    console.log('🗑️ [DELETE_STAFF] Opening confirmation dialog');
    setConfirmDialog({
      isOpen: true,
      title: 'Xóa nhân viên',
      message: `Bạn có chắc chắn muốn xóa ${staffName}? Hành động này không thể hoàn tác.`,
      onConfirm: async () => {
        console.log('🔥 [DELETE_STAFF] onConfirm callback STARTED! staffId:', staffId);
        setConfirmDialog(prev => {
          console.log('🔥 [DELETE_STAFF] Setting isLoading to true');
          return { ...prev, isLoading: true };
        });
        try {
          // Get current user
          console.log('🔥 [DELETE_STAFF] Getting current user...');
          const { data: { user }, error: userError } = await supabase.auth.getUser();

          if (userError || !user) {
            console.error('🔥 [DELETE_STAFF] Failed to get current user:', userError);
            toast.error('Không thể xác thực người dùng');
            setConfirmDialog(prev => ({ ...prev, isLoading: false }));
            return;
          }

          console.log('🔥 [DELETE_STAFF] Current user:', user.id);
          console.log('🔥 [DELETE_STAFF] Calling delete API...');

          // Call API endpoint to delete staff (bypasses RLS)
          const response = await fetch('/api/staff/delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              staffId,
              userId: user.id,
            }),
          });

          const result = await response.json();
          console.log('🔥 [DELETE_STAFF] API response:', result);

          if (!response.ok) {
            if (result.error === 'Only store owner can delete staff members') {
              toast.error('Chỉ chủ cửa hàng mới có thể xóa nhân viên');
            } else {
              toast.error(result.error || 'Không thể xóa nhân viên');
            }
            setConfirmDialog(prev => ({ ...prev, isLoading: false }));
            return;
          }

          console.log('🔥 [DELETE_STAFF] Delete successful!');
          toast.success('Đã xóa nhân viên thành công');
          setConfirmDialog({ isOpen: false, title: '', message: '', onConfirm: () => {} });
          loadStoreData();
        } catch (error) {
          console.error('🔥 [DELETE_STAFF] Error deleting staff:', error);
          toast.error('Lỗi khi xóa nhân viên');
          setConfirmDialog(prev => ({ ...prev, isLoading: false }));
        }
      },
    });
  }

  async function updateStaffInfo(staffId: string) {
    try {
      // Validate based on salary type
      let hourRate = 0;
      let monthlyRate: number | undefined = undefined;
      let dailyRate: number | undefined = undefined;

      if (editSalaryType === 'hourly') {
        const rate = parseFloat(editHourRate);
        if (isNaN(rate) || rate < 0) {
          toast.warning('Vui lòng nhập số hợp lệ cho lương giờ');
          return;
        }
        hourRate = rate;
      } else if (editSalaryType === 'monthly') {
        const rate = parseFloat(editMonthlyRate);
        if (isNaN(rate) || rate < 0) {
          toast.warning('Vui lòng nhập số hợp lệ cho lương tháng');
          return;
        }
        monthlyRate = rate;
      } else if (editSalaryType === 'daily') {
        const rate = parseFloat(editDailyRate);
        if (isNaN(rate) || rate < 0) {
          toast.warning('Vui lòng nhập số hợp lệ cho lương ngày');
          return;
        }
        dailyRate = rate;
      }

      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        toast.error('Không thể xác thực người dùng');
        return;
      }

      // Update via API
      const response = await fetch('/api/staff/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          staffId,
          salaryType: editSalaryType,
          hourRate,
          monthlyRate,
          dailyRate,
          name: editName.trim() || null,
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to update staff');
      }

      // Reset state first
      setEditingStaffId(null);
      setEditSalaryType('hourly');
      setEditHourRate('');
      setEditMonthlyRate('');
      setEditDailyRate('');
      setEditName('');

      // Reload data
      await loadStoreData();
    } catch (error: any) {
      console.error('Error updating staff info:', error);
      toast.error('Lỗi khi cập nhật thông tin nhân viên: ' + error.message);
    }
  }

  // Shift management functions
  async function handleShiftSubmit(e: React.FormEvent) {
    e.preventDefault();

    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        toast.error('Không thể xác thực người dùng');
        return;
      }

      if (editingShift) {
        // Update existing shift via API
        const response = await fetch('/api/shifts', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user.id,
            shiftId: editingShift.id,
            shiftData: shiftFormData,
          }),
        });

        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.error || 'Failed to update shift');
        }
      } else {
        // Create new shift via API
        const response = await fetch('/api/shifts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user.id,
            storeId,
            shiftData: shiftFormData,
          }),
        });

        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.error || 'Failed to create shift');
        }
      }

      resetShiftForm();
      loadStoreData();
    } catch (error: any) {
      console.error('Error saving shift:', error);
      toast.error('Lỗi: ' + error.message);
    }
  }

  function deleteShift(shiftId: string) {
    const shift = shifts.find(s => s.id === shiftId);
    const shiftName = shift?.name || 'ca làm việc này';

    setConfirmDialog({
      isOpen: true,
      title: 'Xóa ca làm việc',
      message: `Bạn có chắc chắn muốn xóa ca "${shiftName}"? Tất cả lịch làm việc liên quan sẽ bị xóa. Hành động này không thể hoàn tác.`,
      onConfirm: async () => {
        setConfirmDialog(prev => ({ ...prev, isLoading: true }));
        try {
          // Get current user
          const { data: { user }, error: userError } = await supabase.auth.getUser();
          if (userError || !user) {
            toast.error('Không thể xác thực người dùng');
            setConfirmDialog(prev => ({ ...prev, isLoading: false }));
            return;
          }

          // Delete via API
          const response = await fetch(`/api/shifts?shiftId=${shiftId}&userId=${user.id}`, {
            method: 'DELETE',
          });

          const result = await response.json();
          if (!response.ok) {
            throw new Error(result.error || 'Failed to delete shift');
          }

          toast.success('Đã xóa ca làm việc thành công');
          setConfirmDialog({ isOpen: false, title: '', message: '', onConfirm: () => {} });
          loadStoreData();
        } catch (error: any) {
          console.error('Error deleting shift:', error);
          toast.error('Lỗi khi xóa ca làm việc: ' + error.message);
          setConfirmDialog(prev => ({ ...prev, isLoading: false }));
        }
      },
    });
  }

  function startEditShift(shift: ShiftTemplate) {
    setEditingShift(shift);
    setShiftFormData({
      name: shift.name,
      start_time: shift.start_time.substring(0, 5), // HH:mm
      end_time: shift.end_time.substring(0, 5),
      grace_period_minutes: shift.grace_period_minutes,
      color: shift.color,
    });
    setShowShiftForm(true);
  }

  function resetShiftForm() {
    setShiftFormData({
      name: '',
      start_time: '08:00',
      end_time: '17:00',
      grace_period_minutes: 15,
      color: '#3B82F6',
    });
    setEditingShift(null);
    setShowShiftForm(false);
  }

  function calculateShiftDuration(startTime: string, endTime: string): string {
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);

    let hours = endHour - startHour;
    let minutes = endMin - startMin;

    if (minutes < 0) {
      hours--;
      minutes += 60;
    }

    return `${hours}h${minutes > 0 ? ` ${minutes}p` : ''}`;
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
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        toast.error('Không thể xác thực người dùng');
        return;
      }

      // Update via API
      const response = await fetch('/api/stores/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          storeId,
          settings,
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to update settings');
      }

      // Only reload the store settings, not everything
      const { data: updatedStore, error: storeError } = await supabase
        .from('stores')
        .select('*')
        .eq('id', storeId)
        .single();

      if (!storeError && updatedStore) {
        setStore(updatedStore);
        toast.success('Đã cập nhật cài đặt thành công');
      }
    } catch (error: any) {
      console.error('Error updating settings:', error);
      toast.error('Lỗi khi cập nhật cài đặt: ' + error.message);
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
        .is('deleted_at', null)
        .single();

      if (storeError) throw storeError;
      setStore(storeData);

      // Check authentication
      const { data: { user: authUser } } = await supabase.auth.getUser();
      console.log('🔐 [AUTH] Current user:', {
        id: authUser?.id,
        email: authUser?.email,
        storeId,
        storeOwnerId: storeData?.owner_id
      });

      // Load check-ins
      const { data: checkInsData, error: checkInsError } = await supabase
        .from('check_ins')
        .select('*, staff(*)')
        .eq('store_id', storeId)
        .order('check_in_time', { ascending: false })
        .limit(50);

      console.log('📋 [DATA] Check-ins query result:', {
        success: !checkInsError,
        error: checkInsError?.message,
        total: checkInsData?.length || 0,
        dates: checkInsData?.slice(0, 5).map(c => c.check_in_time) || []
      });

      if (checkInsError) {
        console.error('❌ [DATA] Error loading check-ins:', checkInsError);

        // Check if it's an auth/permission error
        if (checkInsError.code === 'PGRST301' || checkInsError.message?.includes('JWT') || !authUser) {
          toast.error('Phiên đăng nhập không hợp lệ. Đang chuyển đến trang đăng nhập...');
          setTimeout(() => router.push('/auth/login'), 2000);
          return;
        }
      } else {
        setCheckIns(checkInsData || []);
      }

      // Load staff
      const { data: staffData, error: staffError } = await supabase
        .from('staff')
        .select('*')
        .eq('store_id', storeId);

      if (!staffError && staffData) {
        // Auto-fix: Update invited staff who have created accounts
        const invitedWithAccounts = staffData.filter(
          s => s.status === 'invited' && s.user_id !== null
        );

        if (invitedWithAccounts.length > 0) {
          console.log(`Auto-fixing ${invitedWithAccounts.length} invited staff with accounts`);
          for (const staff of invitedWithAccounts) {
            await supabase
              .from('staff')
              .update({
                status: 'active',
                invitation_token: null
              })
              .eq('id', staff.id);
          }

          // Reload staff data to get updated statuses
          const { data: updatedStaffData } = await supabase
            .from('staff')
            .select('*')
            .eq('store_id', storeId);

          setStaff(updatedStaffData || []);
        } else {
          setStaff(staffData);
        }
      }

      // Load shifts
      const { data: shiftsData, error: shiftsError } = await supabase
        .from('shift_templates')
        .select('*')
        .eq('store_id', storeId)
        .order('start_time');

      if (!shiftsError) {
        setShifts(shiftsData || []);
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

  function toggleStaffExpand(staffId: string) {
    setExpandedStaff(prev => {
      const newSet = new Set(prev);
      if (newSet.has(staffId)) {
        newSet.delete(staffId);
      } else {
        newSet.add(staffId);
      }
      return newSet;
    });
  }

  // Swipe-to-delete handlers
  function handleStaffTouchStart(e: React.TouchEvent, staffId: string) {
    const touch = e.touches[0];
    setSwipeStart({ staffId, x: touch.clientX });
  }

  function handleStaffTouchMove(e: React.TouchEvent, staffId: string) {
    if (!swipeStart || swipeStart.staffId !== staffId) return;

    const touch = e.touches[0];
    const deltaX = touch.clientX - swipeStart.x;

    // Only allow left swipe (negative deltaX)
    if (deltaX < 0) {
      setSwipeState(prev => ({ ...prev, [staffId]: Math.max(deltaX, -100) }));
    }
  }

  function handleStaffTouchEnd(staffId: string) {
    const swipeDistance = swipeState[staffId] || 0;

    if (swipeDistance < -60) {
      // Swipe far enough - show delete button
      setSwipeState(prev => ({ ...prev, [staffId]: -80 }));
    } else {
      // Not far enough - reset
      setSwipeState(prev => ({ ...prev, [staffId]: 0 }));
    }

    setSwipeStart(null);
  }

  // Schedule functions
  async function loadSchedules() {
    try {
      const weekEnd = new Date(currentWeekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);

      const { data, error: schedError } = await supabase
        .from('staff_schedules')
        .select(`
          *,
          shift_template:shift_templates(*),
          staff(*)
        `)
        .eq('store_id', storeId)
        .gte('scheduled_date', formatDateSchedule(currentWeekStart))
        .lte('scheduled_date', formatDateSchedule(weekEnd));

      if (schedError) throw schedError;
      setSchedules(data || []);
    } catch (err) {
      console.error('Error loading schedules:', err);
    }
  }

  function formatDateSchedule(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function formatDateDisplay(date: Date, short: boolean = false): string {
    const days = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
    if (short) {
      return days[date.getDay()];
    }
    return `${days[date.getDay()]} - ${date.getDate()}/${date.getMonth() + 1}`;
  }

  function getWeekDays(): Date[] {
    const days: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(currentWeekStart);
      day.setDate(day.getDate() + i);
      days.push(day);
    }
    return days;
  }

  function getStaffForShiftAndDate(shiftId: string, date: Date): ScheduleWithDetails[] {
    const dateStr = formatDateSchedule(date);
    return schedules.filter(
      (s) => s.shift_template_id === shiftId && s.scheduled_date === dateStr
    );
  }

  function openAssignModal(shift: ShiftTemplate, date: Date) {
    const existingStaff = getStaffForShiftAndDate(shift.id, date).map(s => s.staff_id);
    setSelectedShift(shift);
    setSelectedDate(formatDateSchedule(date));
    setSelectedStaffIds(existingStaff);
    setScheduleStaffSearch('');
    setShowAssignModal(true);
  }

  function toggleStaffSelection(staffId: string) {
    setSelectedStaffIds(prev =>
      prev.includes(staffId)
        ? prev.filter(id => id !== staffId)
        : [...prev, staffId]
    );
  }

  async function handleSaveStaff() {
    if (!selectedShift || !selectedDate) {
      toast.warning('Vui lòng chọn đầy đủ thông tin');
      return;
    }

    setIsAssigning(true);

    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        toast.error('Không thể xác thực người dùng');
        return;
      }

      const existing = getStaffForShiftAndDate(selectedShift.id, new Date(selectedDate));
      const existingStaffIds = existing.map(s => s.staff_id);

      const toAdd = selectedStaffIds.filter(id => !existingStaffIds.includes(id));
      const toRemove = existingStaffIds.filter(id => !selectedStaffIds.includes(id));

      if (toRemove.length > 0) {
        const scheduleIdsToRemove = existing
          .filter(s => toRemove.includes(s.staff_id))
          .map(s => s.id);

        // Delete via API
        const deleteResponse = await fetch(`/api/schedules?userId=${user.id}&storeId=${storeId}&scheduleIds=${scheduleIdsToRemove.join(',')}`, {
          method: 'DELETE',
        });

        const deleteResult = await deleteResponse.json();
        if (!deleteResponse.ok) {
          throw new Error(deleteResult.error || 'Failed to remove schedules');
        }
      }

      if (toAdd.length > 0) {
        const newSchedules = toAdd.map(staffId => ({
          staff_id: staffId,
          store_id: storeId,
          shift_template_id: selectedShift.id,
          scheduled_date: selectedDate,
          notes: null,
        }));

        // Insert via API
        const insertResponse = await fetch('/api/schedules', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user.id,
            storeId,
            schedules: newSchedules,
          }),
        });

        const insertResult = await insertResponse.json();
        if (!insertResponse.ok) {
          throw new Error(insertResult.error || 'Failed to add schedules');
        }
      }

      setShowAssignModal(false);
      loadSchedules();
    } catch (err: any) {
      console.error('Error saving staff:', err);
      toast.error('Lỗi: ' + err.message);
    } finally {
      setIsAssigning(false);
    }
  }

  async function handleRemoveStaffFromShift(scheduleId: string, staffName: string) {
    setIsRemoving(scheduleId);
    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        toast.error('Không thể xác thực người dùng');
        return;
      }

      // Delete via API
      const response = await fetch(`/api/schedules?userId=${user.id}&storeId=${storeId}&scheduleId=${scheduleId}`, {
        method: 'DELETE',
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to remove schedule');
      }

      loadSchedules();
    } catch (err: any) {
      console.error('Error removing schedule:', err);
      toast.error('Lỗi khi xóa lịch: ' + err.message);
    } finally {
      setIsRemoving(null);
    }
  }

  async function handleAssignShift(staffId: string, shiftId: string, date: string) {
    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        toast.error('Không thể xác thực người dùng');
        return;
      }

      // Create via API
      const response = await fetch('/api/schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          storeId,
          schedules: [{
            staff_id: staffId,
            store_id: storeId,
            shift_template_id: shiftId,
            scheduled_date: date,
            notes: null,
          }],
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to assign shift');
      }

      loadSchedules();
    } catch (err: any) {
      console.error('Error assigning shift:', err);
      toast.error('Lỗi khi xếp ca: ' + err.message);
    }
  }

  function navigateWeek(direction: 'prev' | 'next') {
    const newDate = new Date(currentWeekStart);
    newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
    setCurrentWeekStart(newDate);
  }

  function goToToday() {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1);
    setCurrentWeekStart(new Date(today.setDate(diff)));
  }

  async function copyPreviousWeek() {
    try {
      const prevWeekStart = new Date(currentWeekStart);
      prevWeekStart.setDate(prevWeekStart.getDate() - 7);
      const prevWeekEnd = new Date(prevWeekStart);
      prevWeekEnd.setDate(prevWeekEnd.getDate() + 6);

      const { data: prevSchedules, error: fetchError } = await supabase
        .from('staff_schedules')
        .select('*')
        .eq('store_id', storeId)
        .gte('scheduled_date', formatDateSchedule(prevWeekStart))
        .lte('scheduled_date', formatDateSchedule(prevWeekEnd));

      if (fetchError) throw fetchError;

      if (!prevSchedules || prevSchedules.length === 0) {
        return;
      }

      const newSchedules = prevSchedules.map((s) => {
        const oldDate = new Date(s.scheduled_date);
        const newDate = new Date(oldDate);
        newDate.setDate(newDate.getDate() + 7);

        return {
          staff_id: s.staff_id,
          store_id: s.store_id,
          shift_template_id: s.shift_template_id,
          scheduled_date: formatDateSchedule(newDate),
          notes: s.notes,
        };
      });

      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        toast.error('Không thể xác thực người dùng');
        return;
      }

      // Insert via API
      const insertResponse = await fetch('/api/schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          storeId,
          schedules: newSchedules,
        }),
      });

      const insertResult = await insertResponse.json();
      if (!insertResponse.ok) {
        if (insertResult.code === '23505') {
          // Duplicate entry - silently ignore
        } else {
          throw new Error(insertResult.error || 'Failed to copy week schedules');
        }
      }

      loadSchedules();
    } catch (err: any) {
      console.error('Error copying week:', err);
      toast.error('Lỗi: ' + err.message);
    }
  }

  // Day-level copy/paste/clear functions
  async function copyDaySchedule(date: Date) {
    try {
      const dateStr = formatDateSchedule(date);
      const daySchedules = schedules.filter(s => s.scheduled_date === dateStr);

      // Allow copying even if empty (to paste empty/clear target)
      setCopiedDaySchedule(daySchedules);

      // Haptic feedback
      if ('vibrate' in navigator) {
        navigator.vibrate(50);
      }
    } catch (err: any) {
      console.error('Error copying day:', err);
      toast.error('Lỗi khi sao chép');
    }
  }

  async function pasteDaySchedule(date: Date) {
    try {
      if (!copiedDaySchedule || copiedDaySchedule.length === 0) {
        return;
      }

      const targetDateStr = formatDateSchedule(date);

      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        toast.error('Không thể xác thực người dùng');
        return;
      }

      // First, delete existing schedules for the target day via API
      const deleteResponse = await fetch(`/api/schedules?userId=${user.id}&storeId=${storeId}&scheduledDate=${targetDateStr}`, {
        method: 'DELETE',
      });

      if (!deleteResponse.ok) {
        const deleteResult = await deleteResponse.json();
        throw new Error(deleteResult.error || 'Failed to clear existing schedules');
      }

      // Create new schedule records with the target date
      const newSchedules = copiedDaySchedule.map(s => ({
        staff_id: s.staff_id,
        store_id: s.store_id,
        shift_template_id: s.shift_template_id,
        scheduled_date: targetDateStr,
        notes: s.notes,
      }));

      // Insert the new schedules via API
      const insertResponse = await fetch('/api/schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          storeId,
          schedules: newSchedules,
        }),
      });

      const insertResult = await insertResponse.json();
      if (!insertResponse.ok) {
        throw new Error(insertResult.error || 'Failed to paste schedules');
      }

      loadSchedules();

      // Haptic feedback
      if ('vibrate' in navigator) {
        navigator.vibrate(50);
      }
    } catch (err: any) {
      console.error('Error pasting day:', err);
      toast.error('Lỗi khi dán lịch');
    }
  }

  async function clearDaySchedule(date: Date) {
    try {
      const dateStr = formatDateSchedule(date);
      const daySchedules = schedules.filter(s => s.scheduled_date === dateStr);

      if (daySchedules.length === 0) {
        return;
      }

      if (!confirm(`Xóa tất cả ${daySchedules.length} ca làm việc trong ngày này?`)) {
        return;
      }

      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        toast.error('Không thể xác thực người dùng');
        return;
      }

      // Delete via API
      const response = await fetch(`/api/schedules?userId=${user.id}&storeId=${storeId}&scheduledDate=${dateStr}`, {
        method: 'DELETE',
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to clear day schedule');
      }

      loadSchedules();

      // Haptic feedback
      if ('vibrate' in navigator) {
        navigator.vibrate(50);
      }
    } catch (err: any) {
      console.error('Error clearing day:', err);
      toast.error('Lỗi khi xóa lịch');
    }
  }

  function handleDayLongPress(date: Date, x: number, y: number) {
    console.log('handleDayLongPress called:', { date, x, y });
    setDayContextMenu({ date, x, y });

    // Haptic feedback
    if ('vibrate' in navigator) {
      navigator.vibrate(50);
    }
  }

  // New toolbar-based copy/paste/clear functions
  function handleToolbarCopy() {
    if (!selectedItem) {
      return;
    }

    try {
      let schedulesToCopy: ScheduleWithDetails[] = [];

      if (selectedItem.type === 'day' && selectedItem.date) {
        // Copy all shifts for a specific day
        const dateStr = formatDateSchedule(selectedItem.date);
        schedulesToCopy = schedules.filter(s => s.scheduled_date === dateStr);
      } else if (selectedItem.type === 'staff') {
        // Copy all shifts for a staff member for the entire week
        const weekDays = getWeekDays();
        const weekDateStrs = weekDays.map(d => formatDateSchedule(d));
        schedulesToCopy = schedules.filter(
          s => s.staff_id === selectedItem.id && weekDateStrs.includes(s.scheduled_date)
        );
      }

      // Allow copying even if empty (to paste empty/clear target)
      setClipboard({ type: selectedItem.type, schedules: schedulesToCopy });

      if ('vibrate' in navigator) {
        navigator.vibrate(50);
      }
    } catch (error) {
      console.error('Error copying:', error);
      toast.error('Lỗi khi sao chép');
    }
  }

  async function handleToolbarPaste() {
    if (!clipboard) {
      return;
    }

    if (!selectedItem) {
      return;
    }

    // Check type compatibility
    if (clipboard.type !== selectedItem.type) {
      return;
    }

    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        toast.error('Không thể xác thực người dùng');
        return;
      }

      // First, delete existing schedules in the target location
      if (clipboard.type === 'day' && selectedItem.date) {
        // Delete all schedules for the target day via API
        const targetDateStr = formatDateSchedule(selectedItem.date);
        const deleteResponse = await fetch(`/api/schedules?userId=${user.id}&storeId=${storeId}&scheduledDate=${targetDateStr}`, {
          method: 'DELETE',
        });

        if (!deleteResponse.ok) {
          const deleteResult = await deleteResponse.json();
          throw new Error(deleteResult.error || 'Failed to clear existing schedules');
        }
      } else if (clipboard.type === 'staff') {
        // Delete all schedules for the target staff for the week via API
        const weekDays = getWeekDays();
        const weekDateStrs = weekDays.map(d => formatDateSchedule(d));
        const deleteResponse = await fetch(`/api/schedules?userId=${user.id}&storeId=${storeId}&staffId=${selectedItem.id}&scheduledDates=${weekDateStrs.join(',')}`, {
          method: 'DELETE',
        });

        if (!deleteResponse.ok) {
          const deleteResult = await deleteResponse.json();
          throw new Error(deleteResult.error || 'Failed to clear existing schedules');
        }
      }

      // Then, insert the new schedules
      let newSchedules: any[] = [];

      if (clipboard.type === 'day' && selectedItem.date) {
        // Paste day to another day
        const targetDateStr = formatDateSchedule(selectedItem.date);
        newSchedules = clipboard.schedules.map(s => ({
          staff_id: s.staff_id,
          store_id: s.store_id,
          shift_template_id: s.shift_template_id,
          scheduled_date: targetDateStr,
          notes: s.notes,
        }));
      } else if (clipboard.type === 'staff') {
        // Paste staff week to another staff
        newSchedules = clipboard.schedules.map(s => ({
          staff_id: selectedItem.id,
          store_id: s.store_id,
          shift_template_id: s.shift_template_id,
          scheduled_date: s.scheduled_date,
          notes: s.notes,
        }));
      }

      if (newSchedules.length > 0) {
        // Insert via API
        const insertResponse = await fetch('/api/schedules', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user.id,
            storeId,
            schedules: newSchedules,
          }),
        });

        const insertResult = await insertResponse.json();
        if (!insertResponse.ok) {
          throw new Error(insertResult.error || 'Failed to paste schedules');
        }
      }

      loadSchedules();

      if ('vibrate' in navigator) {
        navigator.vibrate(50);
      }
    } catch (error: any) {
      console.error('Error pasting:', error);
      toast.error('Lỗi khi dán: ' + error.message);
    }
  }

  async function handleToolbarClear() {
    if (!selectedItem) {
      return;
    }

    try {
      let schedulesToDelete: ScheduleWithDetails[] = [];

      if (selectedItem.type === 'day' && selectedItem.date) {
        const dateStr = formatDateSchedule(selectedItem.date);
        schedulesToDelete = schedules.filter(s => s.scheduled_date === dateStr);
      } else if (selectedItem.type === 'staff') {
        const weekDays = getWeekDays();
        const weekDateStrs = weekDays.map(d => formatDateSchedule(d));
        schedulesToDelete = schedules.filter(
          s => s.staff_id === selectedItem.id && weekDateStrs.includes(s.scheduled_date)
        );
      }

      if (schedulesToDelete.length === 0) {
        return;
      }

      if (!confirm(`Xóa tất cả ${schedulesToDelete.length} ca làm việc?`)) {
        return;
      }

      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        toast.error('Không thể xác thực người dùng');
        return;
      }

      if (selectedItem.type === 'day' && selectedItem.date) {
        const dateStr = formatDateSchedule(selectedItem.date);
        const response = await fetch(`/api/schedules?userId=${user.id}&storeId=${storeId}&scheduledDate=${dateStr}`, {
          method: 'DELETE',
        });

        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.error || 'Failed to clear schedules');
        }
      } else if (selectedItem.type === 'staff') {
        const weekDays = getWeekDays();
        const weekDateStrs = weekDays.map(d => formatDateSchedule(d));
        const response = await fetch(`/api/schedules?userId=${user.id}&storeId=${storeId}&staffId=${selectedItem.id}&scheduledDates=${weekDateStrs.join(',')}`, {
          method: 'DELETE',
        });

        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.error || 'Failed to clear schedules');
        }
      }

      loadSchedules();
      setSelectedItem(null);

      if ('vibrate' in navigator) {
        navigator.vibrate(50);
      }
    } catch (error) {
      console.error('Error clearing:', error);
      toast.error('Lỗi khi xóa');
    }
  }

  // Swipe gesture handlers
  function handleTouchStart(e: React.TouchEvent) {
    const touch = e.touches[0];
    setTouchStart({ x: touch.clientX, y: touch.clientY, time: Date.now() });
    setTouchEnd(null);

    // Long press detection for copy previous week
    const timer = setTimeout(() => {
      copyPreviousWeek();
      // Haptic feedback on mobile
      if ('vibrate' in navigator) {
        navigator.vibrate(50);
      }
    }, 800); // 800ms long press
    setLongPressTimer(timer);
  }

  function handleTouchMove(e: React.TouchEvent) {
    const touch = e.touches[0];
    setTouchEnd({ x: touch.clientX, y: touch.clientY });

    // Cancel long press if user moves too much
    if (touchStart && longPressTimer) {
      const deltaX = Math.abs(touch.clientX - touchStart.x);
      const deltaY = Math.abs(touch.clientY - touchStart.y);
      if (deltaX > 10 || deltaY > 10) {
        clearTimeout(longPressTimer);
        setLongPressTimer(null);
      }
    }

    // Pull to refresh detection
    if (touchStart && touch.clientY - touchStart.y > 0 && window.scrollY === 0) {
      const distance = touch.clientY - touchStart.y;
      setIsPulling(true);
      setPullDistance(Math.min(distance, 100));
    }
  }

  function handleTouchEnd() {
    // Clear long press timer
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }

    // Handle pull to refresh
    if (isPulling && pullDistance > 60) {
      loadSchedules();
    }
    setIsPulling(false);
    setPullDistance(0);

    // Handle horizontal swipe
    if (!touchStart || !touchEnd) return;

    const deltaX = touchEnd.x - touchStart.x;
    const deltaY = Math.abs(touchEnd.y - touchStart.y);
    const swipeTime = Date.now() - touchStart.time;

    // Only count as swipe if horizontal movement > vertical and fast enough
    if (Math.abs(deltaX) > 50 && deltaX > deltaY && swipeTime < 300) {
      if (deltaX > 0) {
        navigateWeek('prev');
      } else {
        navigateWeek('next');
      }
    }

    setTouchStart(null);
    setTouchEnd(null);
  }

  // Salary functions
  async function loadSalaryData() {
    try {
      // Load salary adjustments for the selected month
      const [year, month] = selectedMonth.split('-');
      const firstDay = `${year}-${month}-01`;
      const lastDay = new Date(parseInt(year), parseInt(month), 0);
      const lastDayStr = `${year}-${month}-${String(lastDay.getDate()).padStart(2, '0')}`;

      const { data: adjustmentsData, error: adjError } = await supabase
        .from('salary_adjustments')
        .select('*')
        .eq('store_id', storeId)
        .gte('adjustment_date', firstDay)
        .lte('adjustment_date', lastDayStr);

      if (adjError) throw adjError;
      setSalaryAdjustments(adjustmentsData || []);

      // Load salary confirmations for the selected month
      const { data: confirmationsData, error: confError } = await supabase
        .from('salary_confirmations')
        .select('*')
        .eq('store_id', storeId)
        .eq('month', selectedMonth);

      if (confError) throw confError;
      setSalaryConfirmations(confirmationsData || []);

      // Load schedules for the selected month (needed for salary calculations)
      const { data: schedulesData, error: schedError } = await supabase
        .from('staff_schedules')
        .select(`
          *,
          shift_template:shift_templates(*),
          staff(*)
        `)
        .eq('store_id', storeId)
        .gte('scheduled_date', firstDay)
        .lte('scheduled_date', lastDayStr);

      if (schedError) throw schedError;

      console.log('📋 [DATA] Loaded schedules for salary:', {
        month: `${firstDay} to ${lastDayStr}`,
        total: schedulesData?.length || 0,
        dates: schedulesData?.slice(0, 5).map(s => s.scheduled_date) || []
      });

      setSchedules(schedulesData || []);

      // Also reload check-ins for the selected month (needed for accurate salary calculations after edits)
      const { data: checkInsData, error: checkInsError } = await supabase
        .from('check_ins')
        .select('*, staff(*)')
        .eq('store_id', storeId)
        .gte('check_in_time', firstDay)
        .lte('check_in_time', `${lastDayStr}T23:59:59`)
        .order('check_in_time', { ascending: false });

      if (!checkInsError) {
        console.log('📋 [DATA] Reloaded check-ins for salary:', {
          month: `${firstDay} to ${lastDayStr}`,
          total: checkInsData?.length || 0
        });
        setSalaryCheckIns(checkInsData || []); // Use separate state for salary
      } else {
        console.error('❌ [DATA] Error reloading check-ins:', checkInsError);
      }
    } catch (error) {
      console.error('Error loading salary data:', error);
      toast.error('Lỗi khi tải dữ liệu lương');
    }
  }

  function handleViewStaffSalaryDetail(staffId: string) {
    setSelectedStaffForSalary(staffId);
  }

  function handleTogglePaymentStatus(staffId: string, currentStatus: 'paid' | 'unpaid') {
    const staffMember = staff.find(s => s.id === staffId);
    if (!staffMember) return;

    const calculation = calculateStaffSalary(staffMember);
    if (!calculation) return;

    const staffName = staffMember.name || staffMember.full_name || staffMember.email;
    const isPaid = currentStatus === 'paid';

    // Show confirmation dialog
    setConfirmDialog({
      isOpen: true,
      title: isPaid ? 'Hủy đánh dấu đã trả lương?' : 'Xác nhận đã trả lương?',
      message: isPaid
        ? `Bạn có chắc muốn hủy đánh dấu đã trả lương cho ${staffName} không?`
        : `Bạn có chắc đã trả lương ${formatAmount(calculation.final_amount)}đ cho ${staffName} không?`,
      confirmText: isPaid ? 'Hủy đánh dấu' : 'Xác nhận đã trả',
      confirmButtonClass: isPaid ? 'bg-orange-600 hover:bg-orange-700' : 'bg-green-600 hover:bg-green-700',
      onConfirm: async () => {
        await executeTogglePaymentStatus(staffId, currentStatus);
      },
    });
  }

  async function executeTogglePaymentStatus(staffId: string, currentStatus: 'paid' | 'unpaid') {
    try {
      setConfirmDialog(prev => ({ ...prev, isLoading: true }));

      const staffMember = staff.find(s => s.id === staffId);
      if (!staffMember) return;

      const calculation = calculateStaffSalary(staffMember);
      if (!calculation) return;

      const existingConfirmation = salaryConfirmations.find(c => c.staff_id === staffId);

      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        toast.error('Không thể xác thực người dùng');
        setConfirmDialog(prev => ({ ...prev, isLoading: false }));
        return;
      }

      if (currentStatus === 'paid') {
        // Unpay - update status to draft
        if (existingConfirmation) {
          const response = await fetch('/api/salary', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: user.id,
              storeId,
              operation: 'update_confirmation',
              data: {
                confirmationId: existingConfirmation.id,
                status: 'draft',
                paid_at: null,
              },
            }),
          });

          const result = await response.json();
          if (!response.ok) {
            throw new Error(result.error || 'Failed to update payment status');
          }
        }
      } else {
        // Mark as paid
        if (existingConfirmation) {
          const response = await fetch('/api/salary', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: user.id,
              storeId,
              operation: 'update_confirmation',
              data: {
                confirmationId: existingConfirmation.id,
                status: 'paid',
                paid_at: new Date().toISOString(),
              },
            }),
          });

          const result = await response.json();
          if (!response.ok) {
            throw new Error(result.error || 'Failed to update payment status');
          }
        } else {
          const response = await fetch('/api/salary', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: user.id,
              storeId,
              operation: 'create_confirmation',
              data: {
                staffId,
                month: selectedMonth,
                total_salary: calculation.final_amount,
                status: 'paid',
              },
            }),
          });

          const result = await response.json();
          if (!response.ok) {
            throw new Error(result.error || 'Failed to create payment confirmation');
          }
        }
      }

      loadSalaryData();
      setConfirmDialog({ isOpen: false, title: '', message: '', onConfirm: () => {} });
    } catch (error: any) {
      console.error('Error toggling payment status:', error);
      setConfirmDialog(prev => ({ ...prev, isLoading: false }));
    }
  }

  function handleAddAdjustment(staffId: string) {
    setSelectedStaffForSalary(staffId);
    setEditingAdjustment(null);
    setShowAdjustmentForm(true);
  }

  function handleEditAdjustment(adjustment: SalaryAdjustment) {
    setEditingAdjustment(adjustment);
    setShowAdjustmentForm(true);
  }

  async function handleSaveAdjustment(staffId: string, data: {
    type: string;
    amount: number;
    date: string;
    note: string;
  }) {
    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        toast.error('Không thể xác thực người dùng');
        return;
      }

      if (editingAdjustment) {
        // Update existing adjustment via API
        const response = await fetch('/api/salary', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user.id,
            storeId,
            operation: 'update_adjustment',
            data: {
              adjustmentId: editingAdjustment.id,
              type: data.type,
              amount: data.amount,
              adjustment_date: data.date,
              description: data.note,
            },
          }),
        });

        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.error || 'Failed to update adjustment');
        }
      } else {
        // Create new adjustment via API
        const response = await fetch('/api/salary', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user.id,
            storeId,
            operation: 'create_adjustment',
            data: {
              staffId,
              type: data.type,
              amount: data.amount,
              adjustment_date: data.date,
              description: data.note,
            },
          }),
        });

        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.error || 'Failed to create adjustment');
        }
      }

      setShowAdjustmentForm(false);
      setEditingAdjustment(null);
      loadSalaryData();
    } catch (error: any) {
      console.error('Error saving adjustment:', error);
      toast.error('Lỗi khi lưu điều chỉnh: ' + error.message);
    }
  }

  async function handleDeleteAdjustment(adjustmentId: string) {
    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        toast.error('Không thể xác thực người dùng');
        return;
      }

      // Delete via API
      const response = await fetch(`/api/salary?userId=${user.id}&storeId=${storeId}&adjustmentId=${adjustmentId}`, {
        method: 'DELETE',
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete adjustment');
      }

      loadSalaryData();
    } catch (error) {
      console.error('Error deleting adjustment:', error);
      toast.error('Lỗi khi xóa điều chỉnh');
    }
  }

  // Calculate salary for a specific staff member
  function calculateStaffSalary(staffMember: Staff): StaffSalaryCalculation | null {
    if (!store) return null;

    // Get schedules for this staff in the selected month
    const monthSchedules = schedules.filter(s => {
      const scheduleMonth = s.scheduled_date.substring(0, 7);
      return s.staff_id === staffMember.id && scheduleMonth === selectedMonth;
    });

    // Get check-ins for this staff in the selected month (use salary-specific state)
    const monthCheckIns = salaryCheckIns.filter(c => {
      if (c.staff_id !== staffMember.id) return false;
      const checkInDate = new Date(c.check_in_time);
      const checkInMonth = `${checkInDate.getFullYear()}-${String(checkInDate.getMonth() + 1).padStart(2, '0')}`;
      return checkInMonth === selectedMonth;
    });

    // Get adjustments for this staff in the selected month
    const staffAdjustments = salaryAdjustments.filter(a => a.staff_id === staffMember.id);

    // Debug logging
    console.log(`💰 [SALARY] Staff: ${staffMember.name || staffMember.full_name}`, {
      selectedMonth,
      schedules: monthSchedules.length,
      checkIns: monthCheckIns.length,
      adjustments: staffAdjustments.length,
      salaryType: staffMember.salary_type,
      hourRate: staffMember.hour_rate,
      monthlyRate: staffMember.monthly_rate,
      dailyRate: staffMember.daily_rate,
    });

    return calculateStaffMonthlySalary(
      staffMember,
      store,
      selectedMonth,
      monthSchedules,
      shifts,
      monthCheckIns,
      staffAdjustments
    );
  }

  // Week summary for schedule
  const weekSummary = useMemo(() => {
    const totalShifts = schedules.length;
    const staffCount = new Set(schedules.map(s => s.staff_id)).size;
    const totalHours = schedules.reduce((sum, s) => {
      if (!s.shift_template) return sum;
      const start = s.shift_template.start_time.split(':').map(Number);
      const end = s.shift_template.end_time.split(':').map(Number);
      const hours = (end[0] * 60 + end[1] - (start[0] * 60 + start[1])) / 60;
      return sum + hours;
    }, 0);
    return { totalShifts, staffCount, totalHours: Math.round(totalHours) };
  }, [schedules]);

  // Salary calculations for all staff
  const salaryCalculations = useMemo(() => {
    if (!store || activeTab !== 'salary') return [];

    return staff
      .map(s => calculateStaffSalary(s))
      .filter(Boolean) as StaffSalaryCalculation[];
  }, [staff, store, selectedMonth, schedules, salaryCheckIns, salaryAdjustments, shifts, activeTab]);

  // Calculate today's stats
  const today = new Date().toDateString();
  const todayCheckIns = checkIns.filter(c => new Date(c.check_in_time).toDateString() === today);
  const currentlyWorking = todayCheckIns.filter(c => c.status === 'success' && !c.check_out_time); // Checked in but not checked out
  const notCheckedIn = staff.length - todayCheckIns.length;

  // Get today's schedules
  const todayDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const todaySchedules = schedules.filter(s => s.scheduled_date === todayDate);

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
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Link href="/owner">
              <button className="text-gray-600 hover:text-gray-800">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            </Link>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-800">{store.name}</h1>
            </div>
          </div>
        </div>

        {/* Desktop Tab Navigation */}
        <div className="hidden sm:flex bg-white rounded-lg shadow-lg mb-4 p-2 gap-2 relative">
          <button
            onClick={() => updateActiveTab('today')}
            className={`flex-1 px-4 py-3 rounded-lg font-semibold transition-all ${
              activeTab === 'today'
                ? 'bg-blue-600 text-white'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            Hôm Nay
          </button>
          <button
            onClick={() => updateActiveTab('schedule')}
            className={`flex-1 px-4 py-3 rounded-lg font-semibold transition-all relative ${
              activeTab === 'schedule'
                ? 'bg-blue-600 text-white'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            Lịch
            {scheduleNeedsReview && (
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-600 rounded-full border-2 border-white"></span>
            )}
          </button>
          <button
            onClick={() => updateActiveTab('salary')}
            className={`flex-1 px-4 py-3 rounded-lg font-semibold transition-all ${
              activeTab === 'salary'
                ? 'bg-blue-600 text-white'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            Lương
          </button>
          <div ref={moreMenuRefDesktop} className="relative flex-1">
            <button
              type="button"
              onClick={() => setShowMoreMenu(!showMoreMenu)}
              className={`w-full px-4 py-3 rounded-lg font-semibold transition-all ${
                activeTab === 'settings' || activeTab === 'shifts' || activeTab === 'staff' || activeTab === 'smart-schedule' || activeTab === 'qr' || showMoreMenu
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              } flex items-center justify-center gap-2`}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
              Mở rộng
            </button>
            {showMoreMenu && (
              <div className="absolute right-0 top-full mt-2 bg-white rounded-lg shadow-xl border border-gray-200 py-2 min-w-[200px] z-50">
                <button
                  type="button"
                  onClick={() => {
                    updateActiveTab('smart-schedule');
                    setShowMoreMenu(false);
                  }}
                  className="w-full text-left px-4 py-3 hover:bg-gray-100 transition-all flex items-center gap-3"
                >
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  <span className="font-semibold text-gray-700">Xếp lịch AI</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    updateActiveTab('staff');
                    setShowMoreMenu(false);
                  }}
                  className="w-full text-left px-4 py-3 hover:bg-gray-100 transition-all flex items-center gap-3"
                >
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <span className="font-semibold text-gray-700">Nhân Viên</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    updateActiveTab('shifts');
                    setShowMoreMenu(false);
                  }}
                  className="w-full text-left px-4 py-3 hover:bg-gray-100 transition-all flex items-center gap-3"
                >
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="font-semibold text-gray-700">Quản Lý Ca</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    updateActiveTab('qr');
                    setShowMoreMenu(false);
                  }}
                  className="w-full text-left px-4 py-3 hover:bg-gray-100 transition-all flex items-center gap-3"
                >
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                  </svg>
                  <span className="font-semibold text-gray-700">Mã QR</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    updateActiveTab('settings');
                    setShowMoreMenu(false);
                  }}
                  className="w-full text-left px-4 py-3 hover:bg-gray-100 transition-all flex items-center gap-3"
                >
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className="font-semibold text-gray-700">Cài Đặt</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-lg shadow-lg mb-20 sm:mb-4 overflow-hidden">
          {/* TODAY TAB */}
          {activeTab === 'today' && store && (
            <StoreToday
              store={store}
              staff={staff}
              todayCheckIns={todayCheckIns}
              shifts={shifts}
              todaySchedules={todaySchedules}
              staffFilter={staffFilter}
              staffSearch={staffSearch}
              expandedStaff={expandedStaff}
              setStaffFilter={setStaffFilter}
              setStaffSearch={setStaffSearch}
              toggleStaffExpand={toggleStaffExpand}
            />
          )}

          {/* STAFF TAB */}
          {activeTab === 'staff' && (
            <StoreStaff
              storeId={storeId}
              staff={staff}
              swipeState={swipeState}
              swipeStart={swipeStart}
              editingStaffId={editingStaffId}
              editSalaryType={editSalaryType}
              editHourRate={editHourRate}
              editMonthlyRate={editMonthlyRate}
              editDailyRate={editDailyRate}
              editName={editName}
              setSwipeState={setSwipeState}
              setEditingStaffId={setEditingStaffId}
              setEditSalaryType={setEditSalaryType}
              setEditHourRate={setEditHourRate}
              setEditMonthlyRate={setEditMonthlyRate}
              setEditDailyRate={setEditDailyRate}
              setEditName={setEditName}
              handleStaffTouchStart={handleStaffTouchStart}
              handleStaffTouchMove={handleStaffTouchMove}
              handleStaffTouchEnd={handleStaffTouchEnd}
              deleteStaff={deleteStaff}
              updateStaffInfo={updateStaffInfo}
            />
          )}

          {/* SCHEDULE TAB */}
          {activeTab === 'schedule' && (
            <StoreSchedule
              storeId={storeId}
              staff={staff}
              shifts={shifts}
              schedules={schedules}
              currentWeekStart={currentWeekStart}
              isRemoving={isRemoving}
              weekSummary={weekSummary}
              copyPreviousWeek={copyPreviousWeek}
              navigateWeek={navigateWeek}
              goToToday={goToToday}
              getWeekDays={getWeekDays}
              formatDateSchedule={formatDateSchedule}
              formatDateDisplay={formatDateDisplay}
              getStaffForShiftAndDate={getStaffForShiftAndDate}
              openAssignModal={openAssignModal}
              handleRemoveStaffFromShift={handleRemoveStaffFromShift}
              handleAssignShift={handleAssignShift}
              handleTouchStart={handleTouchStart}
              handleTouchMove={handleTouchMove}
              handleTouchEnd={handleTouchEnd}
              selectedItem={selectedItem}
              setSelectedItem={setSelectedItem}
              clipboard={clipboard}
              setClipboard={setClipboard}
              handleToolbarCopy={handleToolbarCopy}
              handleToolbarPaste={handleToolbarPaste}
              handleToolbarClear={handleToolbarClear}
            />
          )}

          {/* SMART SCHEDULE TAB */}
          {activeTab === 'smart-schedule' && (
            <SmartScheduleNew
              storeId={storeId}
              staff={staff}
              shifts={shifts}
              currentWeekStart={currentWeekStart}
              navigateWeek={navigateWeek}
              setWeekStart={setCurrentWeekStart}
              goToToday={goToToday}
              onScheduleApplied={() => {
                loadSchedules();
                updateActiveTab('schedule');
              }}
            />
          )}

          {/* SHIFTS TAB */}
          {activeTab === 'shifts' && (
            <StoreShifts
              shifts={shifts}
              showShiftForm={showShiftForm}
              editingShift={editingShift}
              shiftFormData={shiftFormData}
              setShowShiftForm={setShowShiftForm}
              setEditingShift={setEditingShift}
              setShiftFormData={setShiftFormData}
              handleShiftSubmit={handleShiftSubmit}
              calculateShiftDuration={calculateShiftDuration}
              resetShiftForm={resetShiftForm}
              startEditShift={startEditShift}
              deleteShift={deleteShift}
            />
          )}

          {/* SALARY TAB */}
          {activeTab === 'salary' && store && (
            <StoreSalary
              store={store}
              salaryCalculations={salaryCalculations}
              confirmations={salaryConfirmations}
              selectedMonth={selectedMonth}
              onMonthChange={setSelectedMonth}
              onViewStaffDetail={handleViewStaffSalaryDetail}
              onTogglePaymentStatus={handleTogglePaymentStatus}
            />
          )}

          {/* QR CODE TAB */}
          {activeTab === 'qr' && (
            <div className="px-3 sm:px-6 py-4 sm:py-6">
              <div className="max-w-2xl mx-auto">
                {/* Header */}
                <div className="mb-4 sm:mb-6">
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2">Mã QR Điểm Danh</h2>
                  <p className="text-sm sm:text-base text-gray-600">In hoặc chia sẻ mã QR này để nhân viên có thể điểm danh dễ dàng</p>
                </div>

                {/* QR Code Display */}
                <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-8 border-2 border-gray-200">
                  <div className="text-center">
                    {/* Store Name */}
                    <div className="mb-4 sm:mb-6">
                      <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-1">{store.name}</h3>
                      <p className="text-xs sm:text-sm text-gray-600">{store.address}</p>
                    </div>

                    {/* QR Code */}
                    <div className="bg-white p-4 sm:p-8 rounded-xl inline-block border-2 sm:border-4 border-blue-500 shadow-xl max-w-full">
                      <QRCode
                        id="qr-code"
                        value={`https://app.diemdanh.net/checkin/submit?store=${store.id}`}
                        size={200}
                        level="H"
                        className="w-full h-auto max-w-[200px] sm:max-w-[256px]"
                      />
                    </div>

                    {/* Instructions */}
                    <div className="mt-4 sm:mt-6 bg-blue-50 rounded-lg p-3 sm:p-4">
                      <p className="text-xs sm:text-sm text-blue-800 font-medium mb-2">Hướng dẫn sử dụng:</p>
                      <ol className="text-xs sm:text-sm text-blue-700 text-left space-y-1 max-w-md mx-auto">
                        <li>1. Nhân viên quét mã QR bằng camera điện thoại</li>
                        <li>2. Hoặc nhấn vào link để mở trang điểm danh</li>
                        <li>3. Chọn ca làm việc và hoàn tất điểm danh</li>
                      </ol>
                    </div>

                    {/* Action Buttons */}
                    <div className="mt-4 sm:mt-6 flex flex-col sm:flex-row flex-wrap gap-2 sm:gap-3 justify-center">
                      <button
                        type="button"
                        onClick={downloadQRCode}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all shadow-md text-sm sm:text-base"
                      >
                        <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Tải xuống QR
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(`https://app.diemdanh.net/checkin/submit?store=${store.id}`);
                          toast.success('Đã copy link điểm danh!');
                        }}
                        className="bg-white hover:bg-gray-50 text-gray-700 border-2 border-gray-300 px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all shadow-md text-sm sm:text-base"
                      >
                        <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        Copy Link
                      </button>
                    </div>

                    {/* Link Display */}
                    <div className="mt-4 sm:mt-6">
                      <div className="bg-gray-100 rounded-lg p-2.5 sm:p-3 text-xs sm:text-sm text-gray-700 font-mono break-all">
                        https://app.diemdanh.net/checkin/submit?store={store.id}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SETTINGS TAB */}
          {activeTab === 'settings' && (
            <StoreSettings
              store={store}
              settingsLoading={settingsLoading}
              updateStoreSettings={updateStoreSettings}
            />
          )}
        </div>

        {/* Mobile Bottom Navigation */}
        <div className="sm:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-40">
          <div className="grid grid-cols-4 gap-1 p-2">
            <button
              onClick={() => updateActiveTab('today')}
              className={`w-full flex flex-col items-center py-2 px-1 rounded-lg transition-all ${
                activeTab === 'today'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600'
              }`}
            >
              <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-xs font-semibold">Hôm Nay</span>
            </button>
            <button
              onClick={() => updateActiveTab('schedule')}
              className={`w-full flex flex-col items-center py-2 px-1 rounded-lg transition-all relative ${
                activeTab === 'schedule'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600'
              }`}
            >
              <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="text-xs font-semibold">Lịch</span>
              {scheduleNeedsReview && (
                <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-600 rounded-full border border-white"></span>
              )}
            </button>
            <button
              onClick={() => updateActiveTab('salary')}
              className={`w-full flex flex-col items-center py-2 px-1 rounded-lg transition-all ${
                activeTab === 'salary'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600'
              }`}
            >
              <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-xs font-semibold">Lương</span>
            </button>
            <div ref={moreMenuRefMobile} className="relative">
              <button
                type="button"
                onClick={() => setShowMoreMenu(!showMoreMenu)}
                className={`w-full flex flex-col items-center py-2 px-1 rounded-lg transition-all ${
                  activeTab === 'settings' || activeTab === 'shifts' || activeTab === 'staff' || activeTab === 'smart-schedule' || activeTab === 'qr' || showMoreMenu
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600'
                }`}
              >
                <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
                <span className="text-xs font-semibold">Mở rộng</span>
              </button>
              {showMoreMenu && (
                <div className="absolute bottom-full right-0 mb-2 bg-white rounded-lg shadow-xl border border-gray-200 py-2 min-w-[200px] z-50">
                  <button
                    type="button"
                    onClick={() => {
                      updateActiveTab('smart-schedule');
                      setShowMoreMenu(false);
                    }}
                    className="w-full text-left px-4 py-3 hover:bg-gray-100 transition-all flex items-center gap-3"
                  >
                    <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                    <span className="font-semibold text-gray-700">Xếp lịch AI</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      updateActiveTab('staff');
                      setShowMoreMenu(false);
                    }}
                    className="w-full text-left px-4 py-3 hover:bg-gray-100 transition-all flex items-center gap-3"
                  >
                    <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <span className="font-semibold text-gray-700">Nhân Viên</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      updateActiveTab('shifts');
                      setShowMoreMenu(false);
                    }}
                    className="w-full text-left px-4 py-3 hover:bg-gray-100 transition-all flex items-center gap-3"
                  >
                    <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="font-semibold text-gray-700">Quản Lý Ca</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      updateActiveTab('qr');
                      setShowMoreMenu(false);
                    }}
                    className="w-full text-left px-4 py-3 hover:bg-gray-100 transition-all flex items-center gap-3"
                  >
                    <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                    </svg>
                    <span className="font-semibold text-gray-700">Mã QR</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      updateActiveTab('settings');
                      setShowMoreMenu(false);
                    }}
                    className="w-full text-left px-4 py-3 hover:bg-gray-100 transition-all flex items-center gap-3"
                  >
                    <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span className="font-semibold text-gray-700">Cài Đặt</span>
                  </button>
                </div>
              )}
            </div>
          </div>
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


      {/* Staff Assignment Modal for Schedule */}
      {showAssignModal && selectedShift && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-xl font-semibold text-gray-800">
                Xếp nhân viên - {selectedShift.name}
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                {selectedDate}
              </p>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-3">
                {staff.map((s) => (
                  <label
                    key={s.id}
                    className="flex items-center gap-3 p-3 rounded-lg border-2 border-gray-200 hover:bg-gray-50 cursor-pointer transition-all"
                  >
                    <input
                      type="checkbox"
                      checked={selectedStaffIds.includes(s.id)}
                      onChange={() => toggleStaffSelection(s.id)}
                      className="w-5 h-5 text-blue-600 rounded"
                    />
                    <div>
                      <div className="font-semibold text-gray-800">{s.name || s.full_name}</div>
                      <div className="text-sm text-gray-600">{s.email}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="p-6 border-t border-gray-200">
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowAssignModal(false)}
                  disabled={isAssigning}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 px-6 py-3 rounded-lg font-semibold transition-all disabled:opacity-50"
                >
                  Đóng
                </button>
                <button
                  type="button"
                  onClick={handleSaveStaff}
                  disabled={isAssigning}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isAssigning ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Đang lưu...</span>
                    </>
                  ) : (
                    <span>Lưu ({selectedStaffIds.length})</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Staff Salary Detail Modal */}
      {selectedStaffForSalary && (() => {
        const staffMember = staff.find(s => s.id === selectedStaffForSalary);
        const calculation = staffMember ? calculateStaffSalary(staffMember) : null;
        const confirmation = salaryConfirmations.find(c => c.staff_id === selectedStaffForSalary);

        return calculation && (
          <StaffSalaryDetail
            calculation={calculation}
            storeName={store?.name || ''}
            onClose={() => setSelectedStaffForSalary(null)}
            onAddAdjustment={() => handleAddAdjustment(selectedStaffForSalary)}
            onEditAdjustment={handleEditAdjustment}
            onDeleteAdjustment={handleDeleteAdjustment}
            onTogglePaymentStatus={() => handleTogglePaymentStatus(selectedStaffForSalary, confirmation?.status === 'paid' ? 'paid' : 'unpaid')}
            isPaid={confirmation?.status === 'paid'}
            onRefresh={loadSalaryData}
          />
        );
      })()}

      {/* Adjustment Form Modal */}
      {showAdjustmentForm && selectedStaffForSalary && (() => {
        const staffMember = staff.find(s => s.id === selectedStaffForSalary);
        return staffMember && (
          <AdjustmentForm
            staffName={staffMember.full_name || staffMember.email}
            month={selectedMonth}
            editingAdjustment={editingAdjustment}
            onSave={(data) => handleSaveAdjustment(selectedStaffForSalary, data)}
            onCancel={() => {
              setShowAdjustmentForm(false);
              setEditingAdjustment(null);
            }}
          />
        );
      })()}

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => {
          console.log('🔔 [PAGE] ConfirmDialog onClose called!');
          setConfirmDialog({ isOpen: false, title: '', message: '', onConfirm: () => {} });
        }}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmText={confirmDialog.confirmText || 'Xóa'}
        confirmButtonClass={confirmDialog.confirmButtonClass || 'bg-red-600 hover:bg-red-700'}
        cancelText="Hủy"
        isLoading={confirmDialog.isLoading}
      />

      {/* Toast Container */}
      <toast.ToastContainer />
    </div>
  );
}
