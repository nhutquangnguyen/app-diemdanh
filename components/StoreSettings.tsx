import { Store } from '@/types';

interface StoreSettingsProps {
  store: Store;
  settingsLoading: boolean;
  updateStoreSettings: (settings: Partial<Store>) => void;
}

export default function StoreSettings({
  store,
  settingsLoading,
  updateStoreSettings,
}: StoreSettingsProps) {
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
                  Khi nhân viên cuối cùng gửi lịch rảnh, hệ thống tự động tạo lịch dựa trên yêu cầu tuần trước
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
