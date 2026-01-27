'use client';

import { Student, Store } from '@/types';

interface Props {
  student: Student;
  classroom: Store;
}

export default function StudentProfile({ student, classroom }: Props) {
  return (
    <div className="px-4 sm:px-6 py-6 space-y-4">
      <h3 className="text-lg font-bold text-gray-800 px-2">👤 Hồ sơ học sinh</h3>

      {/* Student Info Card */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="bg-gradient-to-r from-green-500 to-green-600 p-6 text-white">
          <div className="text-center">
            <div className="w-20 h-20 bg-white rounded-full mx-auto mb-3 flex items-center justify-center">
              <svg className="w-12 h-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold">{student.full_name}</h2>
            {student.student_id && (
              <p className="text-sm opacity-90 mt-1">MSSV: {student.student_id}</p>
            )}
          </div>
        </div>

        <div className="p-6 space-y-4">
          {/* Contact Info */}
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-3">Thông tin liên hệ</h4>
            <div className="space-y-3">
              {student.email && (
                <div className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <span className="text-sm text-gray-900">{student.email}</span>
                </div>
              )}
              {student.phone && (
                <div className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  <span className="text-sm text-gray-900">{student.phone}</span>
                </div>
              )}
              {!student.email && !student.phone && (
                <p className="text-sm text-gray-500">Chưa có thông tin liên hệ</p>
              )}
            </div>
          </div>

          {/* Parent Info */}
          {(student.parent_name || student.parent_email || student.parent_phone) && (
            <div className="border-t pt-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-3">Thông tin phụ huynh</h4>
              <div className="space-y-3">
                {student.parent_name && (
                  <div className="flex items-center gap-3">
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <span className="text-sm text-gray-900">{student.parent_name}</span>
                  </div>
                )}
                {student.parent_email && (
                  <div className="flex items-center gap-3">
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <span className="text-sm text-gray-900">{student.parent_email}</span>
                  </div>
                )}
                {student.parent_phone && (
                  <div className="flex items-center gap-3">
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    <span className="text-sm text-gray-900">{student.parent_phone}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Class Info */}
          <div className="border-t pt-4">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">Thông tin lớp học</h4>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Lớp:</span>
                <span className="text-sm font-semibold text-gray-900">{classroom.name}</span>
              </div>
              {classroom.subject && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Môn học:</span>
                  <span className="text-sm font-semibold text-gray-900">{classroom.subject}</span>
                </div>
              )}
              {classroom.grade_level && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Khối:</span>
                  <span className="text-sm font-semibold text-gray-900">{classroom.grade_level}</span>
                </div>
              )}
              {classroom.room_number && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Phòng:</span>
                  <span className="text-sm font-semibold text-gray-900">{classroom.room_number}</span>
                </div>
              )}
              {classroom.academic_year && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Năm học:</span>
                  <span className="text-sm font-semibold text-gray-900">{classroom.academic_year}</span>
                </div>
              )}
            </div>
          </div>

          {/* Status */}
          <div className="border-t pt-4">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">Trạng thái</h4>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-semibold">
              <span className="w-2 h-2 bg-green-600 rounded-full"></span>
              {student.status === 'active' && 'Đang học'}
              {student.status === 'invited' && 'Đang chờ xác nhận'}
              {student.status === 'withdrawn' && 'Đã thôi học'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
