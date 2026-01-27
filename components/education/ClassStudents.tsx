'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Store, Student } from '@/types';

interface Props {
  classId: string;
  classroom: Store;
}

interface StudentWithStats extends Student {
  attendance_percentage?: number;
  present_count?: number;
  total_sessions?: number;
}

export default function ClassStudents({ classId, classroom }: Props) {
  const [students, setStudents] = useState<StudentWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    full_name: '',
    student_id: '',
    email: '',
    phone: '',
    parent_name: '',
    parent_email: '',
    parent_phone: '',
  });

  useEffect(() => {
    loadStudents();
  }, [classId]);

  async function loadStudents() {
    try {
      const { data: studentsData, error: studentsError } = await supabase
        .from('students')
        .select('*')
        .eq('class_id', classId)
        .in('status', ['active', 'invited'])
        .order('full_name');

      if (studentsError) throw studentsError;

      // Load attendance stats for each student
      const studentsWithStats = await Promise.all(
        (studentsData || []).map(async (student) => {
          const { data: attendanceData } = await supabase
            .from('attendance_records')
            .select('status')
            .eq('student_id', student.id);

          const totalSessions = attendanceData?.length || 0;
          const presentCount = attendanceData?.filter(a => a.status === 'present').length || 0;
          const attendancePercentage = totalSessions > 0
            ? Math.round((presentCount / totalSessions) * 100)
            : 0;

          return {
            ...student,
            attendance_percentage: attendancePercentage,
            present_count: presentCount,
            total_sessions: totalSessions,
          };
        })
      );

      setStudents(studentsWithStats);
    } catch (error) {
      console.error('Error loading students:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    try {
      if (editingStudent) {
        // Update existing student
        const { error } = await supabase
          .from('students')
          .update(formData)
          .eq('id', editingStudent.id);

        if (error) throw error;
      } else {
        // Create new student
        const { error } = await supabase
          .from('students')
          .insert({
            ...formData,
            class_id: classId,
            status: 'active',
          });

        if (error) throw error;
      }

      setShowForm(false);
      setEditingStudent(null);
      resetForm();
      loadStudents();
    } catch (error) {
      console.error('Error saving student:', error);
      alert('Lỗi khi lưu học sinh');
    }
  }

  async function deleteStudent(id: string) {
    if (!confirm('Bạn có chắc muốn xóa học sinh này?')) return;

    try {
      const { error } = await supabase
        .from('students')
        .update({ status: 'withdrawn' })
        .eq('id', id);

      if (error) throw error;
      loadStudents();
    } catch (error) {
      console.error('Error deleting student:', error);
      alert('Lỗi khi xóa học sinh');
    }
  }

  function resetForm() {
    setFormData({
      full_name: '',
      student_id: '',
      email: '',
      phone: '',
      parent_name: '',
      parent_email: '',
      parent_phone: '',
    });
  }

  function editStudent(student: Student) {
    setEditingStudent(student);
    setFormData({
      full_name: student.full_name,
      student_id: student.student_id || '',
      email: student.email || '',
      phone: student.phone || '',
      parent_name: student.parent_name || '',
      parent_email: student.parent_email || '',
      parent_phone: student.parent_phone || '',
    });
    setShowForm(true);
  }

  const filteredStudents = students.filter(student =>
    student.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (student.student_id && student.student_id.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (student.email && student.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 py-6 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-gray-900">Danh Sách Học Sinh</h2>
          <p className="text-xs sm:text-sm text-gray-600 mt-1">{students.length} học sinh</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <button
            onClick={() => {
              resetForm();
              setEditingStudent(null);
              setShowForm(true);
            }}
            className="w-full sm:w-auto px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold flex items-center justify-center gap-2 text-sm sm:text-base"
          >
            <span>+</span>
            Thêm Học Sinh
          </button>
        </div>
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <div className="bg-white rounded-lg shadow p-4 sm:p-6">
          <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-4">
            {editingStudent ? 'Sửa Thông Tin Học Sinh' : 'Thêm Học Sinh Mới'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2">
                  Họ và Tên *
                </label>
                <input
                  type="text"
                  required
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 text-sm sm:text-base"
                  placeholder="Nguyễn Văn An"
                />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2">
                  MSSV
                </label>
                <input
                  type="text"
                  value={formData.student_id}
                  onChange={(e) => setFormData({ ...formData, student_id: e.target.value })}
                  className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 text-sm sm:text-base"
                  placeholder="SV001"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 text-sm sm:text-base"
                  placeholder="email@student.edu.vn"
                />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2">
                  Số Điện Thoại
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 text-sm sm:text-base"
                  placeholder="0912345678"
                />
              </div>
            </div>

            <div className="border-t pt-3 sm:pt-4 mt-3 sm:mt-4">
              <h4 className="text-xs sm:text-sm font-semibold text-gray-700 mb-3">Thông Tin Phụ Huynh</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                    Tên Phụ Huynh
                  </label>
                  <input
                    type="text"
                    value={formData.parent_name}
                    onChange={(e) => setFormData({ ...formData, parent_name: e.target.value })}
                    className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 text-sm sm:text-base"
                    placeholder="Nguyễn Văn Cha"
                  />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                    Email Phụ Huynh
                  </label>
                  <input
                    type="email"
                    value={formData.parent_email}
                    onChange={(e) => setFormData({ ...formData, parent_email: e.target.value })}
                    className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 text-sm sm:text-base"
                    placeholder="parent@email.com"
                  />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                    SĐT Phụ Huynh
                  </label>
                  <input
                    type="tel"
                    value={formData.parent_phone}
                    onChange={(e) => setFormData({ ...formData, parent_phone: e.target.value })}
                    className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 text-sm sm:text-base"
                    placeholder="0987654321"
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingStudent(null);
                  resetForm();
                }}
                className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-semibold text-sm sm:text-base"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold text-sm sm:text-base"
              >
                {editingStudent ? 'Cập Nhật' : 'Thêm'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Search */}
      <div className="bg-white rounded-lg shadow p-3 sm:p-4">
        <input
          type="text"
          placeholder="Tìm kiếm theo tên, MSSV, email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm sm:text-base"
        />
      </div>

      {/* Students Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-semibold text-gray-700">Họ Tên</th>
                <th className="hidden sm:table-cell px-4 py-3 text-left text-sm font-semibold text-gray-700">MSSV</th>
                <th className="hidden md:table-cell px-4 py-3 text-left text-sm font-semibold text-gray-700">Email</th>
                <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-semibold text-gray-700">Điểm Danh</th>
                <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-semibold text-gray-700">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredStudents.map(student => (
                <tr key={student.id} className="hover:bg-gray-50">
                  <td className="px-3 sm:px-4 py-2 sm:py-3">
                    <div className="text-xs sm:text-sm font-medium text-gray-900">
                      {student.full_name}
                    </div>
                    <div className="sm:hidden text-xs text-gray-500">
                      {student.student_id || '-'}
                    </div>
                  </td>
                  <td className="hidden sm:table-cell px-4 py-3 text-sm text-gray-600">
                    {student.student_id || '-'}
                  </td>
                  <td className="hidden md:table-cell px-4 py-3 text-sm text-gray-600">
                    {student.email || '-'}
                  </td>
                  <td className="px-3 sm:px-4 py-2 sm:py-3">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-1 sm:gap-2">
                      <div className={`
                        px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-semibold
                        ${(student.attendance_percentage || 0) >= 80 ? 'bg-green-100 text-green-700' :
                          (student.attendance_percentage || 0) >= 50 ? 'bg-yellow-100 text-yellow-700' :
                          'bg-red-100 text-red-700'}
                      `}>
                        {student.attendance_percentage || 0}%
                      </div>
                      <span className="text-xs text-gray-500">
                        ({student.present_count}/{student.total_sessions})
                      </span>
                    </div>
                  </td>
                  <td className="px-3 sm:px-4 py-2 sm:py-3">
                    <div className="flex gap-1 sm:gap-2">
                      <button
                        onClick={() => editStudent(student)}
                        className="p-1 sm:p-2 text-blue-600 hover:bg-blue-50 rounded text-sm"
                        title="Sửa"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => deleteStudent(student.id)}
                        className="p-1 sm:p-2 text-red-600 hover:bg-red-50 rounded text-sm"
                        title="Xóa"
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredStudents.length === 0 && (
            <div className="p-6 sm:p-8 text-center text-gray-500 text-sm sm:text-base">
              {searchTerm ? 'Không tìm thấy học sinh nào' : 'Chưa có học sinh nào'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
