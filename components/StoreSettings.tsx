import QRCode from 'react-qr-code';
import { Store } from '@/types';

interface StoreSettingsProps {
  store: Store;
  settingsLoading: boolean;
  downloadQRCode: () => void;
  updateStoreSettings: (settings: Partial<Store>) => void;
  onCopyLink: () => void;
}

export default function StoreSettings({
  store,
  settingsLoading,
  downloadQRCode,
  updateStoreSettings,
  onCopyLink,
}: StoreSettingsProps) {
  return (
    <div className="px-4 sm:px-6 py-6">
      {/* QR CODE & SHARING */}
      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Mã QR Điểm Danh</h3>
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
            <div className="flex flex-wrap gap-2 justify-center">
              <button
                type="button"
                onClick={downloadQRCode}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold flex items-center gap-2 transition-all"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Tải xuống
              </button>
              <button
                type="button"
                onClick={onCopyLink}
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
