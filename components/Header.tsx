'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser, signOut } from '@/lib/auth';

export default function Header() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    const currentUser = await getCurrentUser();
    setUser(currentUser);
    setLoading(false);
  }

  async function handleSignOut() {
    await signOut();
    setUser(null);
    router.push('/');
  }

  return (
    <header className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex justify-between items-center">
          <Link href="/">
            <h1 className="text-2xl font-bold text-blue-600 cursor-pointer">
              Hệ Thống Điểm Danh
            </h1>
          </Link>
          <div className="flex items-center gap-4">
            {!loading && (
              <>
                {user ? (
                  <>
                    <span className="text-gray-600">{user.email}</span>
                    <button
                      onClick={handleSignOut}
                      className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-lg font-semibold transition-all"
                    >
                      Đăng Xuất
                    </button>
                  </>
                ) : (
                  <>
                    <Link href="/auth/login">
                      <button className="text-gray-700 hover:text-blue-600 font-semibold">
                        Đăng Nhập
                      </button>
                    </Link>
                    <Link href="/auth/signup">
                      <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-semibold transition-all">
                        Đăng Ký
                      </button>
                    </Link>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
