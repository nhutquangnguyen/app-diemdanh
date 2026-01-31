'use client';

import { useState } from 'react';

interface Person {
  id: string;
  full_name: string;
  email?: string;
  phone?: string;
  status: string;
  [key: string]: any;
}

interface PeopleListViewProps {
  people: Person[];
  config: any;
  onRefresh: () => void;
}

export default function PeopleListView({ people, config, onRefresh }: PeopleListViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);

  const peopleLabel = config.peopleLabel || 'Người';

  // Filter people
  const filteredPeople = people.filter((person) => {
    const matchesSearch = person.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         person.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         person.phone?.includes(searchTerm);
    const matchesStatus = statusFilter === 'all' || person.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Count by status
  const statusCounts = people.reduce((acc, person) => {
    acc[person.status] = (acc[person.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-700';
      case 'inactive':
        return 'bg-gray-100 text-gray-700';
      case 'pending':
        return 'bg-yellow-100 text-yellow-700';
      case 'rejected':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active':
        return 'Đang hoạt động';
      case 'inactive':
        return 'Ngừng hoạt động';
      case 'pending':
        return 'Chờ duyệt';
      case 'rejected':
        return 'Đã từ chối';
      default:
        return status;
    }
  };

  return (
    <div className="space-y-4 p-4 sm:p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-800">
          {peopleLabel}
        </h2>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold text-sm transition-all flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            <span>Thêm {peopleLabel}</span>
          </button>
          <button
            onClick={onRefresh}
            className="text-blue-600 hover:text-blue-700 text-sm font-semibold"
          >
            Làm mới
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="text-2xl font-bold text-blue-600">
            {people.length}
          </div>
          <div className="text-sm text-gray-600">
            Tổng số
          </div>
        </div>
        <div className="bg-green-50 rounded-lg p-4">
          <div className="text-2xl font-bold text-green-600">
            {statusCounts.active || 0}
          </div>
          <div className="text-sm text-gray-600">
            Đang hoạt động
          </div>
        </div>
        <div className="bg-yellow-50 rounded-lg p-4">
          <div className="text-2xl font-bold text-yellow-600">
            {statusCounts.pending || 0}
          </div>
          <div className="text-sm text-gray-600">
            Chờ duyệt
          </div>
        </div>
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="text-2xl font-bold text-gray-600">
            {statusCounts.inactive || 0}
          </div>
          <div className="text-sm text-gray-600">
            Ngừng
          </div>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder={`Tìm kiếm ${peopleLabel.toLowerCase()}...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">Tất cả trạng thái</option>
          <option value="active">Đang hoạt động</option>
          <option value="pending">Chờ duyệt</option>
          <option value="inactive">Ngừng hoạt động</option>
          <option value="rejected">Đã từ chối</option>
        </select>
      </div>

      {/* People List */}
      {filteredPeople.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
          <p className="text-gray-500">
            {searchTerm || statusFilter !== 'all'
              ? 'Không tìm thấy kết quả phù hợp'
              : `Chưa có ${peopleLabel.toLowerCase()} nào`
            }
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredPeople.map((person) => (
            <div
              key={person.id}
              className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-all"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-gray-800">
                      {person.full_name}
                    </h3>
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${getStatusColor(person.status)}`}>
                      {getStatusLabel(person.status)}
                    </span>
                  </div>
                  <div className="mt-2 space-y-1 text-sm text-gray-600">
                    {person.email && (
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        <span>{person.email}</span>
                      </div>
                    )}
                    {person.phone && (
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                        <span>{person.phone}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Result count */}
      {filteredPeople.length > 0 && (
        <div className="text-sm text-gray-500 text-center">
          Hiển thị {filteredPeople.length} / {people.length} {peopleLabel.toLowerCase()}
        </div>
      )}

      {/* Add Member Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              {/* Modal Header */}
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-gray-800">
                  Thêm {peopleLabel}
                </h3>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Modal Content */}
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <svg className="w-6 h-6 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <h4 className="font-semibold text-blue-900 mb-1">Nhập danh sách email</h4>
                      <p className="text-sm text-blue-700">
                        Nhập email của {peopleLabel.toLowerCase()}, mỗi email một dòng.
                        Email đã có tài khoản sẽ được thêm ngay, email chưa có sẽ nhận lời mời qua email.
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Danh sách Email
                  </label>
                  <textarea
                    placeholder={`student1@example.com\nstudent2@example.com\nstudent3@example.com`}
                    rows={10}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    Mỗi email một dòng. Hỗ trợ nhiều định dạng phân tách.
                  </p>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex gap-4 mt-6">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 px-6 py-3 rounded-lg font-semibold transition-all"
                >
                  Hủy
                </button>
                <button
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-all"
                >
                  Thêm {peopleLabel}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
