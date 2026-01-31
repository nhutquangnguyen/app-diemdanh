'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

interface Props {
  workspaceId: string;
  workspaceName: string;
  onDeleteSuccess?: () => void;
}

export default function DeleteWorkspace({
  workspaceId,
  workspaceName,
  onDeleteSuccess,
}: Props) {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  const requiredText = `Xóa ${workspaceName}`;

  async function handleDelete() {
    if (confirmText !== requiredText) {
      alert('Xác nhận không khớp. Vui lòng nhập chính xác.');
      return;
    }

    try {
      setDeleting(true);

      // Soft delete: Set deleted_at timestamp
      const { error } = await supabase
        .from('stores')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', workspaceId);

      if (error) throw error;

      alert('✓ Đã xóa thành công');

      if (onDeleteSuccess) {
        onDeleteSuccess();
      } else {
        router.push('/owner');
      }
    } catch (error: any) {
      console.error('Error deleting workspace:', error);
      alert(`Lỗi khi xóa: ${error.message}`);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      {/* Danger Zone UI */}
      <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4 sm:p-6">
        <h3 className="text-lg font-bold text-red-800 mb-2">Vùng Nguy Hiểm</h3>
        <p className="text-sm text-red-700 mb-4">
          Xóa sẽ ẩn toàn bộ dữ liệu liên quan. Dữ liệu được lưu trữ an toàn và có thể khôi phục.
        </p>
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-2"
        >
          🗑️ Xóa
        </button>
      </div>

      {/* Confirmation Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-red-800 mb-4">
              ⚠️ Xác Nhận Xóa
            </h2>

            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-700 mb-2">
                Hành động này sẽ ẩn:
              </p>
              <ul className="text-sm text-red-700 list-disc list-inside space-y-1">
                <li>Tất cả thành viên không thể truy cập</li>
                <li>Dữ liệu sẽ bị ẩn khỏi danh sách</li>
                <li>Dữ liệu được lưu trữ an toàn (có thể khôi phục)</li>
              </ul>
            </div>

            <p className="text-sm text-gray-700 mb-2">
              Nhập <span className="font-bold text-red-600">"{requiredText}"</span> để xác nhận:
            </p>

            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-4 focus:ring-2 focus:ring-red-500 focus:border-transparent"
              placeholder={requiredText}
              autoFocus
            />

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowModal(false);
                  setConfirmText('');
                }}
                disabled={deleting}
                className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-semibold transition-all disabled:opacity-50"
              >
                Hủy
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting || confirmText !== requiredText}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {deleting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Đang xóa...
                  </>
                ) : (
                  'Xác Nhận Xóa'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
