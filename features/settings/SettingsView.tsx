'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DeleteWorkspace from '@/components/common/DeleteWorkspace';

interface SettingsViewProps {
  workspace: any;
  config: Record<string, any>;
  onUpdate: (updates: any) => void;
  saving: boolean;
}

export function SettingsView({ workspace, config, onUpdate, saving }: SettingsViewProps) {
  const router = useRouter();
  const [gettingLocation, setGettingLocation] = useState(false);
  const [latitude, setLatitude] = useState(workspace.latitude);
  const [longitude, setLongitude] = useState(workspace.longitude);

  useEffect(() => {
    setLatitude(workspace.latitude);
    setLongitude(workspace.longitude);
  }, [workspace.latitude, workspace.longitude]);

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

  return (
    <div className="px-4 sm:px-6 py-6">
      <form onSubmit={(e) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        onUpdate({
          name: formData.get('name') as string,
          address: formData.get('address') as string,
          latitude: parseFloat(formData.get('latitude') as string),
          longitude: parseFloat(formData.get('longitude') as string),
          gps_required: formData.get('gps_required') === 'on',
          selfie_required: formData.get('selfie_required') === 'on',
          access_mode: formData.get('access_mode') as string,
          radius_meters: parseInt(formData.get('radius_meters') as string) || 50,
        });
      }} className="space-y-6">
        {/* Basic Information */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Thông Tin Cơ Bản</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Tên</label>
              <input
                type="text"
                name="name"
                defaultValue={workspace.name}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Địa chỉ</label>
              <input
                type="text"
                name="address"
                defaultValue={workspace.address || ''}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Location Settings */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Cài Đặt Vị Trí</h3>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Vĩ độ (Latitude)</label>
                <input
                  type="number"
                  name="latitude"
                  step="0.000001"
                  value={latitude || ''}
                  onChange={(e) => setLatitude(parseFloat(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Kinh độ (Longitude)</label>
                <input
                  type="number"
                  name="longitude"
                  step="0.000001"
                  value={longitude || ''}
                  onChange={(e) => setLongitude(parseFloat(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={getCurrentLocation}
              disabled={gettingLocation}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {gettingLocation ? '⏳ Đang lấy vị trí...' : '📍 Lấy vị trí hiện tại'}
            </button>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Bán kính cho phép (mét)</label>
              <input
                type="number"
                name="radius_meters"
                defaultValue={workspace.radius_meters || 50}
                min="10"
                max="1000"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">
                Khoảng cách tối đa được phép điểm danh (từ 10m đến 1000m)
              </p>
            </div>
          </div>
        </div>

        {/* Check-in Requirements */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Yêu Cầu Điểm Danh</h3>
          <div className="space-y-3">
            <label className="flex items-start gap-4 cursor-pointer">
              <input
                type="checkbox"
                name="gps_required"
                defaultChecked={workspace.gps_required}
                className="w-5 h-5 mt-0.5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 flex-shrink-0"
              />
              <div>
                <div className="font-medium text-gray-900">Yêu cầu GPS</div>
                <div className="text-sm text-gray-500">Bắt buộc kiểm tra vị trí khi điểm danh</div>
              </div>
            </label>

            <label className="flex items-start gap-4 cursor-pointer">
              <input
                type="checkbox"
                name="selfie_required"
                defaultChecked={workspace.selfie_required}
                className="w-5 h-5 mt-0.5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 flex-shrink-0"
              />
              <div>
                <div className="font-medium text-gray-900">Yêu cầu Selfie</div>
                <div className="text-sm text-gray-500">Bắt buộc chụp ảnh khi điểm danh</div>
              </div>
            </label>
          </div>
        </div>

        {/* Access Mode */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Chế Độ Truy Cập</h3>
          <div className="space-y-3">
            <label className="flex items-start gap-4 cursor-pointer">
              <input
                type="radio"
                name="access_mode"
                value="staff_only"
                defaultChecked={workspace.access_mode === 'staff_only'}
                className="w-4 h-4 mt-1 text-blue-600 border-gray-300 focus:ring-blue-500 flex-shrink-0"
              />
              <div>
                <div className="font-medium text-gray-900">Chỉ người được phân công</div>
                <div className="text-sm text-gray-500">Chỉ những người được xếp lịch mới có thể điểm danh</div>
              </div>
            </label>

            <label className="flex items-start gap-4 cursor-pointer">
              <input
                type="radio"
                name="access_mode"
                value="anyone"
                defaultChecked={workspace.access_mode === 'anyone'}
                className="w-4 h-4 mt-1 text-blue-600 border-gray-300 focus:ring-blue-500 flex-shrink-0"
              />
              <div>
                <div className="font-medium text-gray-900">Bất kỳ ai</div>
                <div className="text-sm text-gray-500">Mọi người đều có thể điểm danh</div>
              </div>
            </label>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
          >
            {saving ? '⏳ Đang lưu...' : '💾 Lưu Cài Đặt'}
          </button>
        </div>
      </form>

      {/* Delete Section */}
      <div className="mt-8 pt-8 border-t border-gray-300">
        <h3 className="text-lg font-semibold text-red-600 mb-4">⚠️ Vùng Nguy Hiểm</h3>
        <DeleteWorkspace
          workspaceId={workspace.id}
          workspaceName={workspace.name}
          onDeleteSuccess={() => router.push('/owner')}
        />
      </div>
    </div>
  );
}
