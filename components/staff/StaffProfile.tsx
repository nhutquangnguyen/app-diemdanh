import { useRouter } from 'next/navigation';
import { Staff } from '@/types';
import { signOut } from '@/lib/auth';

interface StaffProfileProps {
  storeId: string;
  staffId: string;
  staffMember: Staff;
}

export default function StaffProfile({ storeId, staffId, staffMember }: StaffProfileProps) {
  const router = useRouter();

  async function handleSignOut() {
    const confirmed = confirm('Bạn có chắc chắn muốn đăng xuất?');
    if (confirmed) {
      await signOut();
      router.push('/auth/login');
    }
  }

  // Format join date
  const joinDate = staffMember.created_at
    ? new Date(staffMember.created_at).toLocaleDateString('vi-VN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    : 'Không rõ';

  return (
    <div className="px-4 py-6 pb-32 space-y-6">
      {/* Profile Header */}
      <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-lg p-6 text-white">
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-3xl font-bold">
            {staffMember.display_name.split(' ').slice(-2).map(n => n[0]).join('').toUpperCase()}
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold">{staffMember.display_name}</h2>
            <p className="text-sm opacity-90 mt-1">Nhân viên</p>
          </div>
        </div>
      </div>

      {/* Profile Information */}
      <div className="bg-white rounded-2xl shadow-md overflow-hidden">
        <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
          <h3 className="font-bold text-gray-800">Thông tin cá nhân</h3>
        </div>

        {/* Name */}
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div className="flex-1">
              <div className="text-xs text-gray-500">Họ và tên</div>
              <div className="font-semibold text-gray-800">{staffMember.display_name}</div>
            </div>
          </div>
        </div>

        {/* Email */}
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="flex-1">
              <div className="text-xs text-gray-500">Email</div>
              <div className="font-semibold text-gray-800 text-sm break-all">{staffMember.email}</div>
            </div>
          </div>
        </div>

        {/* Join Date */}
        <div className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="flex-1">
              <div className="text-xs text-gray-500">Ngày tham gia</div>
              <div className="font-semibold text-gray-800">{joinDate}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Help Link */}
      <div className="bg-white rounded-2xl shadow-md overflow-hidden">
        <a
          href="https://www.diemdanh.net/help"
          target="_blank"
          rel="noopener noreferrer"
          className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-all"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
