import { useState, useEffect } from 'react';
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
  const [shifts, setShifts] = useState<ShiftTemplate[]>([]);
  const [requirements, setRequirements] = useState<{ [key: string]: number }>({});
  const [requirementsCount, setRequirementsCount] = useState(1);
  const [loadingShifts, setLoadingShifts] = useState(false);
  const [savingRequirements, setSavingRequirements] = useState(false);

  // Load shifts and current requirements
  useEffect(() => {
    if (store?.id) {
      loadShiftsAndRequirements();
    }
  }, [store?.id]);

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
      for (let day = 2; day <= 8; day++) { // T2-CN (Monday=2...Sunday=8, we'll convert to 1-7)
        const key = `${shift.id}_${day === 8 ? 1 : day}`; // Convert CN(8) to Sunday(1)
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
          late_penalty_rate: parseFloat(formData.get('late_penalty_rate') as string) || 1.0,
          early_checkout_penalty_rate: parseFloat(formData.get('early_checkout_penalty_rate') as string) || 1.0,
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

        {/* Salary Calculation Rules */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Quy tắc tính lương</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Hệ số phạt đi muộn
              </label>
              <input
                type="number"
                name="late_penalty_rate"
                min="0"
                max="5"
                step="0.1"
                defaultValue={store.late_penalty_rate || 1.0}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                1.0 = phạt theo lương giờ, 2.0 = phạt gấp đôi (mặc định: 1.0)
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Hệ số phạt về sớm
              </label>
              <input
                type="number"
                name="early_checkout_penalty_rate"
                min="0"
                max="5"
                step="0.1"
                defaultValue={store.early_checkout_penalty_rate || 1.0}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                1.0 = phạt theo lương giờ, 2.0 = phạt gấp đôi (mặc định: 1.0)
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Hệ số tăng ca
              </label>
              <input
                type="number"
                name="overtime_multiplier"
                min="1"
                max="5"
                step="0.1"
                defaultValue={store.overtime_multiplier || 1.5}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                1.5 = trả 150% lương giờ, 2.0 = trả gấp đôi (mặc định: 1.5)
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Thời gian ưu đãi tăng ca (phút)
              </label>
              <input
                type="number"
                name="overtime_grace_minutes"
                min="0"
                max="60"
                step="5"
                defaultValue={store.overtime_grace_minutes || 15}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Số phút làm thêm tối thiểu để được tính tăng ca (mặc định: 15)
              </p>
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

          {/* Staff Requirements Section */}
          {store.auto_schedule_enabled && (
            <div className="bg-white rounded-lg p-4 mt-3 border-2 border-blue-300">
              <h4 className="text-base font-bold text-gray-800 mb-3">Số Lượng Nhân Viên Cần</h4>

              {loadingShifts ? (
                <div className="text-center py-8 text-gray-500">Đang tải...</div>
              ) : shifts.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  Chưa có ca làm việc. Vui lòng tạo ca trong tab "Quản Lý Ca"
                </div>
              ) : (
                <>
                  {/* Quick Apply Section */}
                  <div className="bg-gray-50 rounded-lg p-3 mb-4">
                    <div className="text-sm font-medium text-gray-700 mb-2">Áp dụng nhanh:</div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="1"
                        max="10"
                        value={requirementsCount}
                        onChange={(e) => setRequirementsCount(parseInt(e.target.value) || 1)}
                        className="w-20 px-3 py-2 border border-gray-300 rounded-lg text-center font-bold"
                      />
                      <button
                        type="button"
                        onClick={applyToAll}
                        className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-all"
                      >
                        Áp dụng cho tất cả
                      </button>
                      <button
                        type="button"
                        onClick={clearAll}
                        className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white text-sm font-semibold rounded-lg transition-all"
                      >
                        Xóa tất cả
                      </button>
                    </div>
                  </div>

                  {/* Requirements Grid */}
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-gray-100">
                          <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700 border">Ca</th>
                          <th className="px-3 py-2 text-center text-xs font-semibold text-gray-700 border">T2</th>
                          <th className="px-3 py-2 text-center text-xs font-semibold text-gray-700 border">T3</th>
                          <th className="px-3 py-2 text-center text-xs font-semibold text-gray-700 border">T4</th>
                          <th className="px-3 py-2 text-center text-xs font-semibold text-gray-700 border">T5</th>
                          <th className="px-3 py-2 text-center text-xs font-semibold text-gray-700 border">T6</th>
                          <th className="px-3 py-2 text-center text-xs font-semibold text-gray-700 border">T7</th>
                          <th className="px-3 py-2 text-center text-xs font-semibold text-gray-700 border">CN</th>
                        </tr>
                      </thead>
                      <tbody>
                        {shifts.map((shift) => (
                          <tr key={shift.id} className="hover:bg-gray-50">
                            <td className="px-3 py-2 border">
                              <div className="flex items-center gap-2">
                                <div
                                  className="w-3 h-3 rounded-full flex-shrink-0"
                                  style={{ backgroundColor: shift.color }}
                                />
                                <span className="text-sm font-medium text-gray-800">{shift.name}</span>
                              </div>
                            </td>
                            {[2, 3, 4, 5, 6, 7, 1].map((dayOfWeek) => (
                              <td key={dayOfWeek} className="px-2 py-2 border">
                                <input
                                  type="number"
                                  min="0"
                                  max="10"
                                  value={getRequirementValue(shift.id, dayOfWeek)}
                                  onChange={(e) => handleRequirementChange(shift.id, dayOfWeek, parseInt(e.target.value) || 0)}
                                  className="w-full px-2 py-1 border border-gray-300 rounded text-center font-medium text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Save Button */}
                  <button
                    type="button"
                    onClick={saveRequirements}
                    disabled={savingRequirements}
                    className="w-full mt-4 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-4 py-3 rounded-lg font-semibold transition-all"
                  >
                    {savingRequirements ? 'Đang lưu...' : '💾 Lưu Yêu Cầu Nhân Viên'}
                  </button>
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
    </div>
  );
}
