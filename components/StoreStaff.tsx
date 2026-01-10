import Link from 'next/link';
import { Staff } from '@/types';

interface StoreStaffProps {
  storeId: string;
  staff: Staff[];
  swipeState: Record<string, number>;
  swipeStart: { staffId: string; x: number } | null;
  editingStaffId: string | null;
  editHourRate: string;
  editName: string;
  setSwipeState: (state: Record<string, number> | ((prev: Record<string, number>) => Record<string, number>)) => void;
  setEditingStaffId: (id: string | null) => void;
  setEditHourRate: (rate: string) => void;
  setEditName: (name: string) => void;
  handleStaffTouchStart: (e: React.TouchEvent, staffId: string) => void;
  handleStaffTouchMove: (e: React.TouchEvent, staffId: string) => void;
  handleStaffTouchEnd: (staffId: string) => void;
  deleteStaff: (staffId: string) => void;
  updateStaffInfo: (staffId: string) => void;
}

export default function StoreStaff({
  storeId,
  staff,
  swipeState,
  swipeStart,
  editingStaffId,
  editHourRate,
  editName,
  setSwipeState,
  setEditingStaffId,
  setEditHourRate,
  setEditName,
  handleStaffTouchStart,
  handleStaffTouchMove,
  handleStaffTouchEnd,
  deleteStaff,
  updateStaffInfo,
}: StoreStaffProps) {
  return (
    <div className="px-4 sm:px-6 py-6">
      <div className="mb-6">
        <Link href={`/owner/stores/${storeId}/add-staff`}>
          <button className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 min-h-[48px]">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Thêm Nhân Viên
          </button>
        </Link>
      </div>

      {staff.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          Chưa có nhân viên nào
        </div>
      ) : (
        <div className="space-y-4">
          {staff.map((member) => {
            const swipeOffset = swipeState[member.id] || 0;
            return (
            <div key={member.id} className="relative overflow-hidden rounded-lg shadow-sm">
              {/* Delete Button (revealed on swipe) */}
              <div className="absolute right-0 top-0 bottom-0 w-20 bg-red-600 flex items-center justify-center">
                <button
                  onClick={() => {
                    deleteStaff(member.id);
                    setSwipeState(prev => ({ ...prev, [member.id]: 0 }));
                  }}
                  className="w-full h-full flex flex-col items-center justify-center text-white"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  <span className="text-xs font-semibold mt-1">Xóa</span>
                </button>
              </div>

              {/* Staff Card (swipeable) */}
              <div
                className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-all touch-pan-y"
                style={{
                  transform: `translateX(${swipeOffset}px)`,
                  transition: swipeStart?.staffId === member.id ? 'none' : 'transform 0.3s ease-out'
                }}
                onTouchStart={(e) => handleStaffTouchStart(e, member.id)}
                onTouchMove={(e) => handleStaffTouchMove(e, member.id)}
                onTouchEnd={() => handleStaffTouchEnd(member.id)}
              >
              <div className="flex items-start gap-3 mb-3">
                <div className="w-12 h-12 sm:w-10 sm:h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold shadow flex-shrink-0">
                  {(member.name || member.full_name)?.split(' ').slice(-2).map(n => n[0]).join('').toUpperCase() || '??'}
                </div>
                <div className="flex-1 min-w-0">
                  {editingStaffId === member.id ? (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Tên hiển thị</label>
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Tên gợi nhớ (tùy chọn)"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Lương giờ</label>
                        <div className="relative">
                          <input
                            type="number"
                            min="0"
                            step="1000"
                            value={editHourRate}
                            onChange={(e) => setEditHourRate(e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="VNĐ/giờ"
                          />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => updateStaffInfo(member.id)}
                          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm font-semibold transition-all"
                        >
                          Lưu
                        </button>
                        <button
                          onClick={() => {
                            setEditingStaffId(null);
                            setEditHourRate('');
                            setEditName('');
                          }}
                          className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2 rounded text-sm font-semibold transition-all"
                        >
                          Hủy
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {member.name && (
                        <p className="font-semibold text-gray-800 text-base">{member.name}</p>
                      )}
                      <p className={member.name ? "text-sm text-gray-600" : "font-semibold text-gray-800 text-base"}>{member.full_name}</p>
                      <p className="text-sm text-gray-600 break-all">{member.email}</p>
                      {member.phone && (
                        <p className="text-sm text-gray-500">{member.phone}</p>
                      )}
                      <p className="text-sm font-medium text-green-600 mt-1">
                        {new Intl.NumberFormat('vi-VN').format(member.hour_rate || 0)} VNĐ/giờ
                      </p>
                    </>
                  )}
                </div>
              </div>
              {editingStaffId !== member.id && (
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setEditingStaffId(member.id);
                      setEditHourRate(String(member.hour_rate || 0));
                      setEditName(member.name || '');
                    }}
                    className="flex-1 sm:flex-none text-blue-600 hover:text-blue-800 font-semibold px-4 py-2 rounded-lg hover:bg-blue-50 transition-all text-sm"
                  >
                    Sửa thông tin
                  </button>
                  <button
                    onClick={() => deleteStaff(member.id)}
                    className="flex-1 sm:flex-none text-red-600 hover:text-red-800 font-semibold px-4 py-2 rounded-lg hover:bg-red-50 transition-all text-sm"
                  >
                    Xóa
                  </button>
                </div>
              )}
              </div>
              {/* End of swipeable card */}
            </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
