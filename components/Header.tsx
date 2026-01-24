'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser, getCurrentUserSync, signOut } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

export default function Header() {
  const router = useRouter();
  // Initialize with null to match server render, then hydrate with sync check
  const [user, setUser] = useState<any>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [hasStaffStores, setHasStaffStores] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Hydrate user state on mount (client-side only)
  useEffect(() => {
    setUser(getCurrentUserSync());
  }, []);

  useEffect(() => {
    let mounted = true;

    async function verifyAuth() {
      try {
        const startTime = performance.now();
        const currentUser = await getCurrentUser();
        const endTime = performance.now();
        console.log(`Header: Async verification took ${(endTime - startTime).toFixed(2)}ms`);

        if (mounted) {
          setUser(currentUser);
        }
      } catch (error) {
        console.error('Header auth verification failed:', error);
        if (mounted) {
          setUser(null);
        }
      }
    }

    // Verify in background
    verifyAuth();

    return () => {
      mounted = false;
    };
  }, []);

  // Check if user has staff stores
  useEffect(() => {
    async function checkStaffStores() {
      if (!user?.email) {
        setHasStaffStores(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('staff')
          .select('id')
          .eq('email', user.email)
          .limit(1);

        if (error) throw error;
        setHasStaffStores(data && data.length > 0);
      } catch (error) {
        console.error('Error checking staff stores:', error);
        setHasStaffStores(false);
      }
    }

    checkStaffStores();
  }, [user]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }

    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [dropdownOpen]);

  async function handleSignOut() {
    try {
      await signOut();
      setUser(null);
      setDropdownOpen(false);
      // Redirect to login page after logout
      window.location.href = '/auth/login';
    } catch (error) {
      console.error('Logout error:', error);
      // Even if logout fails, clear local state and redirect
      setUser(null);
      window.location.href = '/auth/login';
    }
  }

  function getInitial(email: string) {
    return email.charAt(0).toUpperCase();
  }

  return (
    <header className="bg-white shadow-sm sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
        <div className="flex justify-between items-center">
          <Link href="/" className="flex items-center gap-2 sm:gap-3 cursor-pointer">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-blue-500 to-green-500 rounded-full flex items-center justify-center shadow-md">
              <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-blue-600 truncate">
              diemdanh.net
            </h1>
          </Link>
          <div className="flex items-center gap-2 sm:gap-4">
            {user ? (
                  <>
                    {/* QR Code Button - Always show when logged in */}
                    <Link href="/checkin">
                      <button
                        className="p-2 bg-gray-700 hover:bg-gray-800 rounded-lg transition-all"
                        aria-label="Quét QR"
                        title="Quét QR"
                      >
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                        </svg>
                      </button>
                    </Link>

                    <div className="relative" ref={dropdownRef}>
                      {/* Avatar Button */}
                      <button
                        onClick={() => setDropdownOpen(!dropdownOpen)}
                        className="w-10 h-10 rounded-full bg-blue-600 text-white font-semibold flex items-center justify-center hover:bg-blue-700 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                      >
                        {getInitial(user.email)}
                      </button>

                    {/* Dropdown Menu */}
                    {dropdownOpen && (
                      <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                        <div className="px-4 py-3 border-b border-gray-200">
                          <p className="text-sm text-gray-500">Đăng nhập với</p>
                          <p className="text-sm font-semibold text-gray-800 truncate">
                            {user.email}
                          </p>
                        </div>
                        <Link
                          href="/history"
                          onClick={() => setDropdownOpen(false)}
                          className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-all flex items-center gap-2"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Lịch Sử Điểm Danh
                        </Link>
                        <Link
                          href="/owner"
                          onClick={() => setDropdownOpen(false)}
                          className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-all flex items-center gap-2"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                          </svg>
                          Quản Lý
                        </Link>
                        <Link
                          href="/settings"
                          onClick={() => setDropdownOpen(false)}
                          className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-all flex items-center gap-2"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          Cài Đặt
                        </Link>
                        <button
                          onClick={handleSignOut}
                          className="w-full text-left px-4 py-3 text-sm text-red-600 hover:bg-gray-50 transition-all flex items-center gap-2"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                          </svg>
                          Đăng Xuất
                        </button>
                      </div>
                    )}
                    </div>
                  </>
                ) : (
                  <Link href="/auth/login">
                    <button className="bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white px-4 sm:px-6 py-2 rounded-lg font-semibold text-sm sm:text-base transition-all">
                      Đăng Nhập
                    </button>
                  </Link>
                )}
          </div>
        </div>
      </div>
    </header>
  );
}
