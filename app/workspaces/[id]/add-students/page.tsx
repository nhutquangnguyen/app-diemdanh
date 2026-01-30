'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { getCurrentUser } from '@/lib/auth';
import Header from '@/components/Header';
import { useToast } from '@/components/Toast';

export default function AddStudents() {
  const params = useParams();
  const router = useRouter();
  const classId = params.id as string;
  const toast = useToast();

  const [user, setUser] = useState<any>(null);
  const [classroom, setClassroom] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [emails, setEmails] = useState('');
  const [results, setResults] = useState<any[]>([]);

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      router.push('/auth/login');
      return;
    }
    setUser(currentUser);
    loadClassroom();
  }

  async function loadClassroom() {
    try {
      const { data, error } = await supabase
        .from('stores')
        .select('*')
        .eq('id', classId)
        .single();

      if (error) throw error;
      setClassroom(data);
    } catch (error) {
      console.error('Error loading classroom:', error);
      toast.error('Không tìm thấy lớp học');
      router.push('/owner');
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setResults([]);

    try {
      // Parse emails - support comma-separated and newline-separated
      const emailList = emails
        .split(/[,\n]/)
        .map(e => e.trim())
        .filter(e => e.length > 0);

      if (emailList.length === 0) {
        toast.error('Vui lòng nhập ít nhất một email');
        setLoading(false);
        return;
      }

      // Call API to add students
      const response = await fetch('/api/students/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          classId,
          emails: emailList,
          courseName: classroom?.name || 'Lớp học'
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Có lỗi xảy ra');
      }

      setResults(data.results);

      // Count successes
      const addedCount = data.results.filter((r: any) => r.status === 'added').length;
      const invitedCount = data.results.filter((r: any) => r.status === 'invited').length;
      const errorCount = data.results.filter((r: any) => r.status === 'error' || r.status === 'already_exists').length;

      // Show summary
      if (addedCount > 0) {
        toast.success(`✅ Đã thêm ${addedCount} học sinh`);
      }
      if (invitedCount > 0) {
        toast.success(`📧 Đã gửi lời mời đến ${invitedCount} email`);
      }
      if (errorCount > 0) {
        toast.warning(`⚠️ ${errorCount} email không thể xử lý`);
      }

      // If all successful, redirect after 2 seconds
      if (errorCount === 0 && data.results.length > 0) {
        setTimeout(() => {
          router.push(`/owner/workspaces/${classId}`);
        }, 2000);
      }
    } catch (error: any) {
      console.error('Error adding students:', error);
      toast.error('Lỗi: ' + error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <Header />

      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              📚 Mời Học Sinh qua Email
            </h2>
            <p className="text-gray-600">
              Thêm một hoặc nhiều email học sinh. Nếu email chưa có tài khoản, hệ thống sẽ tự động gửi lời mời.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Email học sinh (một hoặc nhiều) *
              </label>
              <textarea
                required
                value={emails}
                onChange={(e) => setEmails(e.target.value)}
                rows={8}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent font-mono text-sm"
                placeholder="student1@university.edu, student2@university.edu
hoặc mỗi email một dòng:
student3@university.edu
student4@university.edu"
              />
              <p className="text-sm text-gray-500 mt-2">
                💡 Nhập nhiều email cách nhau bởi dấu phẩy hoặc xuống dòng.
              </p>
              <p className="text-sm text-gray-500 mt-1">
                ✉️ Email đã có tài khoản sẽ được thêm ngay, email chưa có sẽ nhận lời mời qua email.
              </p>
            </div>

            <div className="flex gap-4">
              <Link href={`/owner/workspaces/${classId}`} className="flex-1">
                <button
                  type="button"
                  className="w-full bg-gray-200 hover:bg-gray-300 text-gray-700 px-6 py-3 rounded-lg font-semibold transition-all"
                >
                  Hủy
                </button>
              </Link>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold transition-all disabled:opacity-50"
              >
                {loading ? 'Đang xử lý...' : 'Mời Học Sinh'}
              </button>
            </div>
          </form>

          {/* Results Display */}
          {results.length > 0 && (
            <div className="mt-8 pt-6 border-t border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Kết Quả</h3>
              <div className="space-y-2">
                {results.map((result, index) => (
                  <div
                    key={index}
                    className={`flex items-start gap-3 p-3 rounded-lg ${
                      result.status === 'added'
                        ? 'bg-green-50 border border-green-200'
                        : result.status === 'invited'
                        ? 'bg-blue-50 border border-blue-200'
                        : result.status === 'already_exists'
                        ? 'bg-yellow-50 border border-yellow-200'
                        : 'bg-red-50 border border-red-200'
                    }`}
                  >
                    <div className="flex-shrink-0 mt-0.5">
                      {result.status === 'added' && (
                        <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                      {result.status === 'invited' && (
                        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                      )}
                      {result.status === 'already_exists' && (
                        <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                      )}
                      {result.status === 'error' && (
                        <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">{result.email}</p>
                      <p className={`text-sm ${
                        result.status === 'added'
                          ? 'text-green-700'
                          : result.status === 'invited'
                          ? 'text-blue-700'
                          : result.status === 'already_exists'
                          ? 'text-yellow-700'
                          : 'text-red-700'
                      }`}>
                        {result.message}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Toast Container */}
      <toast.ToastContainer />
    </div>
  );
}
