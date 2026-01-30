import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Store, ShiftTemplate } from '@/types';
import { supabase } from '@/lib/supabase';

interface StoreSettingsProps {
  store: Store;
  settingsLoading: boolean;
  updateStoreSettings: (settings: Partial<Store>) => void;
}

interface ShiftRequirement {
  shift_template_id: string;
  day_of_week: number;
  required_staff_count: number;
}

export default function StoreSettings({
  store,
  settingsLoading,
  updateStoreSettings,
}: StoreSettingsProps) {
  const router = useRouter();
  const [shifts, setShifts] = useState<ShiftTemplate[]>([]);
  const [requirements, setRequirements] = useState<{ [key: string]: number }>({});
  const [requirementsCount, setRequirementsCount] = useState(1);
  const [loadingShifts, setLoadingShifts] = useState(false);
  const [savingRequirements, setSavingRequirements] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [latitude, setLatitude] = useState(store.latitude);
  const [longitude, setLongitude] = useState(store.longitude);

  // Update latitude/longitude when store changes
  useEffect(() => {
    setLatitude(store.latitude);
    setLongitude(store.longitude);
  }, [store.latitude, store.longitude]);

  // Load shifts and current requirements
  useEffect(() => {
    if (store?.id) {
      loadShiftsAndRequirements();
    }
  }, [store?.id]);

  async function getCurrentLocation() {
    if (!navigator.geolocation) {
      alert('Trình duyệt của bạn không hỗ trợ định vị GPS');
      return;
    }

    setGettingLocation(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude);
        setLongitude(position.coords.longitude);
        setGettingLocation(false);
      },
      (error) => {
        console.error('Error getting location:', error);
        let errorMessage = 'Không thể lấy vị trí hiện tại';

        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Bạn đã từ chối quyền truy cập vị trí';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Thông tin vị trí không khả dụng';
            break;
          case error.TIMEOUT:
            errorMessage = 'Yêu cầu lấy vị trí đã hết thời gian';
            break;
        }

        alert(errorMessage);
        setGettingLocation(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  }

  async function loadShiftsAndRequirements() {
    try {
      setLoadingShifts(true);

      // Load shifts
      const { data: shiftsData, error: shiftsError } = await supabase
        .from('shift_templates')
        .select('*')
        .eq('store_id', store.id)
        .order('start_time');

      if (shiftsError) throw shiftsError;
      setShifts(shiftsData || []);

      // Load current week's Monday
      const now = new Date();
      const dayOfWeek = now.getDay();
      const monday = new Date(now);
      monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
      const weekStartDate = monday.toISOString().split('T')[0];

      // Load existing requirements for current week
      const { data: reqData, error: reqError } = await supabase
        .from('shift_requirements')
        .select('*')
        .eq('store_id', store.id)
        .eq('week_start_date', weekStartDate);

      if (reqError) throw reqError;

      // Build requirements map
      const reqMap: { [key: string]: number } = {};
      if (reqData && reqData.length > 0) {
        reqData.forEach(req => {
          const key = `${req.shift_template_id}_${req.day_of_week}`;
          reqMap[key] = req.required_staff_count;
        });
      }

      setRequirements(reqMap);

    } catch (error) {
      console.error('Error loading shifts and requirements:', error);
    } finally {
      setLoadingShifts(false);
    }
  }

  function getRequirementValue(shiftId: string, dayOfWeek: number): number {
    const key = `${shiftId}_${dayOfWeek}`;
    return requirements[key] || 0;
  }

  function handleRequirementChange(shiftId: string, dayOfWeek: number, value: number) {
    const key = `${shiftId}_${dayOfWeek}`;
    setRequirements(prev => ({
      ...prev,
      [key]: value
    }));
  }

  function applyToAll() {
    const newReqs: { [key: string]: number } = {};
    shifts.forEach(shift => {
      // Use DB format: 0=Sunday, 1=Monday, 2=Tuesday...6=Saturday
      for (let day = 0; day <= 6; day++) {
        const key = `${shift.id}_${day}`;
        newReqs[key] = requirementsCount;
      }
    });
    setRequirements(newReqs);
  }

  function clearAll() {
    setRequirements({});
  }

  async function saveRequirements() {
    try {
      setSavingRequirements(true);

      // Get current week's Monday
      const now = new Date();
      const dayOfWeek = now.getDay();
      const monday = new Date(now);
      monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
      const weekStartDate = monday.toISOString().split('T')[0];

      // Delete existing requirements for this week
      await supabase
        .from('shift_requirements')
        .delete()
        .eq('store_id', store.id)
        .eq('week_start_date', weekStartDate);

      // Build new requirements array
      const newRequirements: any[] = [];
      Object.entries(requirements).forEach(([key, count]) => {
        if (count > 0) {
          const [shiftId, dayOfWeekStr] = key.split('_');
          newRequirements.push({
            store_id: store.id,
            week_start_date: weekStartDate,
            shift_template_id: shiftId,
            day_of_week: parseInt(dayOfWeekStr),
            required_staff_count: count,
          });
        }
      });

      // Insert new requirements
      if (newRequirements.length > 0) {
        const { error } = await supabase
          .from('shift_requirements')
          .insert(newRequirements);

        if (error) throw error;
      }

      alert('✓ Đã lưu yêu cầu nhân viên');
    } catch (error: any) {
      console.error('Error saving requirements:', error);
      alert(`Lỗi: ${error.message}`);
    } finally {
      setSavingRequirements(false);
    }
  }

  async function handleDeleteStore() {
    const confirmText = `Xóa ${store.name}`;
    const userInput = prompt(
      `⚠️ CẢNH BÁO: Hành động này sẽ ẩn cửa hàng!\n\nCửa hàng sẽ được ẩn khỏi danh sách, bao gồm:\n• Nhân viên không thể điểm danh\n• Cửa hàng không hiển thị trong danh sách\n• Dữ liệu được lưu trữ an toàn (có thể khôi phục)\n\nNhập "${confirmText}" để xác nhận:`
    );

    if (userInput !== confirmText) {
      if (userInput !== null) {
        alert('Xác nhận không khớp. Hủy xóa cửa hàng.');
      }
      return;
    }

    try {
      setDeleting(true);

      // Soft delete: Set deleted_at timestamp
      const { error } = await supabase
        .from('stores')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', store.id);

      if (error) throw error;

      alert('✓ Đã xóa cửa hàng thành công');
      router.push('/owner');
    } catch (error: any) {
      console.error('Error deleting store:', error);
      alert(`Lỗi khi xóa cửa hàng: ${error.message}`);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="px-4 sm:px-6 py-6">
      {/* SINGLE UNIFIED FORM */}
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
          late_penalty_enabled: formData.get('late_penalty_enabled') === 'on',
          late_penalty_rate: parseFloat(formData.get('late_penalty_rate') as string) || 1.0,
          early_checkout_penalty_enabled: formData.get('early_checkout_penalty_enabled') === 'on',
          early_checkout_penalty_rate: parseFloat(formData.get('early_checkout_penalty_rate') as string) || 1.0,
          overtime_enabled: formData.get('overtime_enabled') === 'on',
          overtime_multiplier: parseFloat(formData.get('overtime_multiplier') as string) || 1.5,
          overtime_grace_minutes: parseInt(formData.get('overtime_grace_minutes') as string) || 15,
          auto_schedule_enabled: formData.get('auto_schedule_enabled') === 'on',
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
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Địa chỉ</label>
              <input
                type="text"
                name="address"
                required
                defaultValue={store.address}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">Tọa độ GPS</label>
                <button
                  type="button"
                  onClick={getCurrentLocation}
                  disabled={gettingLocation}
                  className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {gettingLocation ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Đang lấy...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Lấy vị trí hiện tại
                    </>
                  )}
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Vĩ độ (Latitude)</label>
                  <input
                    type="number"
                    name="latitude"
                    required
                    step="any"
                    value={latitude ?? ''}
                    onChange={(e) => setLatitude(parseFloat(e.target.value))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Kinh độ (Longitude)</label>
                  <input
                    type="number"
                    name="longitude"
                    required
                    step="any"
                    value={longitude ?? ''}
                    onChange={(e) => setLongitude(parseFloat(e.target.value))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
                  />
                </div>
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

        {/* Salary Calculation Rules */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Quy tắc tính lương</h3>
          <div className="space-y-4">
            {/* Late Penalty Toggle */}
            <div className="border-b border-gray-200 pb-4">
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-medium text-gray-700">
                  Phạt đi muộn
                </label>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    name="late_penalty_enabled"
                    defaultChecked={store.late_penalty_enabled ?? true}
                    className="sr-only peer"
                    onChange={(e) => {
                      const rateInput = document.querySelector('input[name="late_penalty_rate"]') as HTMLInputElement;
                      if (rateInput) {
                        rateInput.disabled = !e.target.checked;
                      }
                    }}
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
              <div className="ml-4">
                <label className="block text-sm font-medium text-gray-600 mb-2">
                  Hệ số phạt
                </label>
                <input
                  type="number"
                  name="late_penalty_rate"
                  min="0"
                  max="5"
                  step="0.1"
                  defaultValue={store.late_penalty_rate || 1.0}
                  disabled={!(store.late_penalty_enabled ?? true)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 disabled:bg-gray-100 disabled:text-gray-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  1.0 = phạt theo lương giờ, 2.0 = phạt gấp đôi (mặc định: 1.0)
                </p>
              </div>
            </div>

            {/* Early Checkout Penalty Toggle */}
            <div className="border-b border-gray-200 pb-4">
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-medium text-gray-700">
                  Phạt về sớm
                </label>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    name="early_checkout_penalty_enabled"
                    defaultChecked={store.early_checkout_penalty_enabled ?? true}
                    className="sr-only peer"
                    onChange={(e) => {
                      const rateInput = document.querySelector('input[name="early_checkout_penalty_rate"]') as HTMLInputElement;
                      if (rateInput) {
                        rateInput.disabled = !e.target.checked;
                      }
                    }}
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
              <div className="ml-4">
                <label className="block text-sm font-medium text-gray-600 mb-2">
                  Hệ số phạt
                </label>
                <input
                  type="number"
                  name="early_checkout_penalty_rate"
                  min="0"
                  max="5"
                  step="0.1"
                  defaultValue={store.early_checkout_penalty_rate || 1.0}
                  disabled={!(store.early_checkout_penalty_enabled ?? true)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 disabled:bg-gray-100 disabled:text-gray-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  1.0 = phạt theo lương giờ, 2.0 = phạt gấp đôi (mặc định: 1.0)
                </p>
              </div>
            </div>

            {/* Overtime Toggle */}
            <div className="border-b border-gray-200 pb-4">
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-medium text-gray-700">
                  Tăng ca
                </label>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    name="overtime_enabled"
                    defaultChecked={store.overtime_enabled ?? true}
                    className="sr-only peer"
                    onChange={(e) => {
                      const multiplierInput = document.querySelector('input[name="overtime_multiplier"]') as HTMLInputElement;
                      const graceInput = document.querySelector('input[name="overtime_grace_minutes"]') as HTMLInputElement;
                      if (multiplierInput) multiplierInput.disabled = !e.target.checked;
                      if (graceInput) graceInput.disabled = !e.target.checked;
                    }}
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
              <div className="ml-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-2">
                    Hệ số tăng ca
                  </label>
                  <input
                    type="number"
                    name="overtime_multiplier"
                    min="1"
                    max="5"
                    step="0.1"
                    defaultValue={store.overtime_multiplier || 1.5}
                    disabled={!(store.overtime_enabled ?? true)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 disabled:bg-gray-100 disabled:text-gray-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    1.5 = trả 150% lương giờ, 2.0 = trả gấp đôi (mặc định: 1.5)
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-2">
                    Thời gian ưu đãi tăng ca (phút)
                  </label>
                  <input
                    type="number"
                    name="overtime_grace_minutes"
                    min="0"
                    max="60"
                    step="5"
                    defaultValue={store.overtime_grace_minutes || 15}
                    disabled={!(store.overtime_enabled ?? true)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 disabled:bg-gray-100 disabled:text-gray-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Số phút làm thêm tối thiểu để được tính tăng ca (mặc định: 15)
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Auto Schedule Settings */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-4 border-2 border-blue-200">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-lg font-semibold text-gray-800">Tự động xếp lịch AI</h3>
                <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded-full font-semibold">
                  MỚI
                </span>
              </div>
              <p className="text-sm text-gray-600">
                Tự động tạo lịch làm việc khi tất cả nhân viên đã gửi lịch rảnh
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer ml-4">
              <input
                type="checkbox"
                name="auto_schedule_enabled"
                className="sr-only peer"
                defaultChecked={store.auto_schedule_enabled ?? true}
              />
              <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          <div className="bg-white rounded-lg p-3 mt-3 border border-blue-200">
            <div className="text-xs text-gray-700 space-y-2">
              <div className="flex items-start gap-2">
                <span className="text-blue-600 font-bold mt-0.5">✓</span>
                <span>
                  Khi nhân viên cuối cùng gửi lịch rảnh, hệ thống tự động tạo lịch dựa trên yêu cầu tuần này
                </span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-blue-600 font-bold mt-0.5">✓</span>
                <span>
                  Lịch được áp dụng ngay lập tức, bạn có thể chỉnh sửa trực tiếp hoặc tạo lại
                </span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-blue-600 font-bold mt-0.5">✓</span>
                <span>
                  Cảnh báo (nếu có) sẽ hiển thị trong tab "Lịch" với dấu chấm đỏ thông báo
                </span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-orange-600 font-bold mt-0.5">!</span>
                <span className="text-orange-700 font-semibold">
                  Chỉ tự động tạo 1 lần/tuần, không tạo lại khi nhân viên cập nhật sau đó
                </span>
              </div>
            </div>
          </div>

          {/* Staff Requirements Section - Exactly like Smart Schedule */}
          {store.auto_schedule_enabled && (
            <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6 mt-3">
              <h2 className="text-lg font-bold text-gray-800 mb-4">Số Lượng Nhân Viên Cần</h2>

              {loadingShifts ? (
                <div className="text-center py-8 text-gray-500">Đang tải...</div>
              ) : shifts.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  Chưa có ca làm việc. Vui lòng tạo ca trong tab "Quản Lý Ca"
                </div>
              ) : (
                <>
                  {/* Bulk apply - Exactly like Smart Schedule */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                    <div className="text-sm font-semibold text-gray-700 mb-3">Áp dụng nhanh:</div>
                    <div className="flex flex-wrap gap-2 items-center">
                      <input
                        type="number"
                        min="0"
                        value={requirementsCount}
                        onChange={(e) => setRequirementsCount(parseInt(e.target.value) || 1)}
                        className="w-20 px-3 py-2 border border-gray-300 rounded-lg text-center font-semibold focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="0"
                      />
                      <button
                        type="button"
                        onClick={applyToAll}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-sm transition-colors"
                      >
                        Áp dụng cho tất cả
                      </button>
                      <button
                        type="button"
                        onClick={clearAll}
                        className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-semibold text-sm transition-colors"
                      >
                        Xóa tất cả
                      </button>
                    </div>
                  </div>

                  {/* Requirements Grid - Exactly like Smart Schedule */}
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="border-b-2 border-gray-300">
                          <th className="text-left p-2 sm:p-3 text-gray-700 font-bold text-xs sm:text-sm sticky left-0 bg-white z-10 min-w-[80px] sm:min-w-0">
                            Ca
                          </th>
                          {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((day, idx) => (
                            <th key={idx} className="p-1 sm:p-2 text-center text-gray-700 font-bold text-[10px] sm:text-xs w-[40px] sm:w-16">
                              {day}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {shifts.map((shift, shiftIdx) => (
                          <tr key={shift.id} className={`border-b ${shiftIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                            <td className="p-2 sm:p-3 sticky left-0 bg-inherit z-10 min-w-[80px] sm:min-w-0">
                              <div className="flex items-center gap-1 sm:gap-2">
                                <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full flex-shrink-0" style={{ backgroundColor: shift.color }} />
                                <span className="font-semibold text-xs sm:text-sm text-gray-800 truncate">{shift.name}</span>
                              </div>
                            </td>
                            {[1, 2, 3, 4, 5, 6, 0].map((day, dayIndex) => {
                              const value = getRequirementValue(shift.id, day);
                              return (
                                <td key={dayIndex} className="p-0.5 sm:p-2 text-center w-[40px] sm:w-16">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const newValue = prompt('Nhập số lượng nhân viên cần:', value.toString());
                                      if (newValue !== null) {
                                        const num = parseInt(newValue);
                                        if (!isNaN(num) && num >= 0) {
                                          handleRequirementChange(shift.id, day, num);
                                        }
                                      }
                                    }}
                                    className="w-8 h-8 sm:w-12 sm:h-12 bg-white hover:bg-blue-50 border-2 border-gray-300 hover:border-blue-500 rounded sm:rounded-lg mx-auto font-bold text-sm sm:text-lg text-gray-800 transition-all active:scale-95"
                                  >
                                    {value}
                                  </button>
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Save Button */}
                  <div className="mt-6 flex gap-3">
                    <button
                      type="button"
                      onClick={saveRequirements}
                      disabled={savingRequirements}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold flex items-center justify-center gap-2 disabled:bg-gray-400"
                    >
                      {savingRequirements ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          Đang lưu...
                        </>
                      ) : (
                        <>
                          💾 Lưu Yêu Cầu Nhân Viên
                        </>
                      )}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={settingsLoading}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-semibold transition-all"
        >
          {settingsLoading ? 'Đang lưu...' : 'Lưu Cài Đặt'}
        </button>
      </form>

      {/* Danger Zone */}
      <div className="mt-8 bg-red-50 border-2 border-red-300 rounded-lg p-4 sm:p-6">
        <h3 className="text-lg font-bold text-red-800 mb-2">Vùng Nguy Hiểm</h3>
        <p className="text-sm text-red-700 mb-4">
          Xóa cửa hàng sẽ xóa vĩnh viễn tất cả dữ liệu liên quan. Hành động này không thể hoàn tác.
        </p>
        <button
          type="button"
          onClick={handleDeleteStore}
          disabled={deleting}
          className="w-full sm:w-auto bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-2"
        >
          {deleting ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Đang xóa...
            </>
          ) : (
            <>
              🗑️ Xóa Cửa Hàng Vĩnh Viễn
            </>
          )}
        </button>
      </div>
    </div>
  );
}
