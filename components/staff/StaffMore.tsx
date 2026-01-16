import { useRouter } from 'next/navigation';
import { Staff } from '@/types';
import { signOut } from '@/lib/auth';

interface StaffMoreProps {
  storeId: string;
  staffId: string;
  staffMember: Staff;
}

export default function StaffMore({ storeId, staffId, staffMember }: StaffMoreProps) {
  const router = useRouter();

  async function handleSignOut() {
    const confirmed = confirm('Bạn có chắc chắn muốn đăng xuất?');
    if (confirmed) {
      await signOut();
      router.push('/auth/login');
    }
  }

  return (
    <div className="px-4 py-6 space-y-4">
      {/* Profile Card */}
      <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-lg p-6 text-white">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-2xl font-bold">
            {staffMember.display_name.split(' ').slice(-2).map(n => n[0]).join('').toUpperCase()}
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold">{staffMember.display_name}</h2>
            <p className="text-sm opacity-90">{staffMember.email}</p>
            {staffMember.hour_rate && (
              <p className="text-xs opacity-75 mt-1">
                {staffMember.hour_rate.toLocaleString()}đ/giờ
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Menu Items */}
      <div className="bg-white rounded-2xl shadow-md overflow-hidden">
        {/* Profile Info */}
        <button
          onClick={() => router.push(`/stores/${storeId}/staff/profile`)}
          className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-all border-b border-gray-100"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div className="text-left">
              <div className="font-semibold text-gray-800">Thông Tin Cá Nhân</div>
              <div className="text-xs text-gray-500">Tên, vai trò, liên hệ</div>
            </div>
          </div>
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>

        {/* Settings */}
        <button
          onClick={() => router.push('/settings')}
          className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-all border-b border-gray-100"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div className="text-left">
              <div className="font-semibold text-gray-800">Cài Đặt</div>
              <div className="text-xs text-gray-500">Thông báo, ngôn ngữ</div>
            </div>
          </div>
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>

        {/* Help */}
        <a
          href="https://www.diemdanh.net/help"
          target="_blank"
          rel="noopener noreferrer"
          className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-all"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="text-left">
              <div className="font-semibold text-gray-800">Trợ Giúp</div>
              <div className="text-xs text-gray-500">Hướng dẫn sử dụng</div>
            </div>
          </div>
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
      </div>

      {/* Sign Out */}
      <button
        onClick={handleSignOut}
        className="w-full bg-red-50 hover:bg-red-100 text-red-600 px-6 py-4 rounded-2xl font-semibold transition-all flex items-center justify-center gap-2 shadow-md"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
        </svg>
        Đăng Xuất
      </button>

      {/* App Info */}
      <div className="text-center text-xs text-gray-500 pt-4">
        <p>© 2026 diemdanh.net</p>
        <p className="mt-1">Phiên bản 1.0.0</p>
      </div>
    </div>
  );
}
