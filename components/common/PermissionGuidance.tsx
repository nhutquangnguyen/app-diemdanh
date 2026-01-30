'use client';

import { useRouter } from 'next/navigation';
import Header from '@/components/Header';

export type PermissionType = 'camera' | 'location' | 'both';
export type WorkspaceType = 'store' | 'class';

interface Props {
  type: PermissionType;
  workspaceType: WorkspaceType;
  onRetry?: () => void;
  showHeader?: boolean;
}

export default function PermissionGuidance({
  type,
  workspaceType,
  onRetry,
  showHeader = true
}: Props) {
  const router = useRouter();

  // Determine icon based on permission type
  const getIcon = () => {
    if (type === 'camera') {
      return (
        <svg
          className="mx-auto h-16 w-16 text-red-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 3l18 18"
          />
        </svg>
      );
    } else if (type === 'location') {
      return (
        <svg
          className="mx-auto h-16 w-16 text-red-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 3l18 18"
          />
        </svg>
      );
    } else {
      // both
      return (
        <svg
          className="mx-auto h-16 w-16 text-red-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      );
    }
  };

  // Get title based on permission type
  const getTitle = () => {
    if (type === 'camera') {
      return 'Không thể truy cập Camera';
    } else if (type === 'location') {
      return 'Không thể truy cập Vị trí';
    } else {
      return 'Không thể truy cập Camera và Vị trí';
    }
  };

  // Get description based on permission type and workspace type
  const getDescription = () => {
    const workspaceName = workspaceType === 'store' ? 'cửa hàng' : 'lớp học';

    if (type === 'camera') {
      return `Bạn đã từ chối quyền truy cập camera. Vui lòng cho phép truy cập camera trong cài đặt trình duyệt để ${workspaceType === 'store' ? 'điểm danh và chụp selfie' : 'điểm danh'}.`;
    } else if (type === 'location') {
      return `Bạn đã từ chối quyền truy cập vị trí. Vui lòng cho phép truy cập vị trí trong cài đặt trình duyệt để xác nhận bạn đang ở ${workspaceName}.`;
    } else {
      return `Bạn đã từ chối quyền truy cập camera và vị trí. Vui lòng cho phép truy cập trong cài đặt trình duyệt để điểm danh tại ${workspaceName}.`;
    }
  };

  // Get guide URL based on permission type
  const getGuideUrl = () => {
    if (type === 'camera') {
      return 'https://app.diemdanh.net/help/cap-quyen-camera';
    } else if (type === 'location') {
      return 'https://app.diemdanh.net/help/cap-quyen-vi-tri';
    } else {
      return 'https://app.diemdanh.net/help/cap-quyen';
    }
  };

  // Get guide button text
  const getGuideButtonText = () => {
    if (type === 'camera') {
      return 'Hướng dẫn cấp quyền Camera';
    } else if (type === 'location') {
      return 'Hướng dẫn cấp quyền Vị trí';
    } else {
      return 'Hướng dẫn cấp quyền';
    }
  };

  const content = (
    <div className="bg-white rounded-lg shadow-lg p-6 sm:p-8">
      <div className="text-center">
        <div className="mb-6">
          {getIcon()}
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4">
          {getTitle()}
        </h2>
        <p className="text-sm sm:text-base text-gray-600 mb-6">
          {getDescription()}
        </p>

        {/* Steps to grant permission */}
        <div className="bg-blue-50 rounded-lg p-4 mb-6 text-left">
          <h3 className="text-sm font-semibold text-blue-900 mb-3">Cách cấp quyền:</h3>
          <ol className="text-xs sm:text-sm text-blue-800 space-y-2">
            {type === 'camera' || type === 'both' ? (
              <>
                <li className="flex items-start gap-2">
                  <span className="bg-blue-100 text-blue-800 rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0 text-xs font-semibold">1</span>
                  <span>Nhấn vào biểu tượng khóa hoặc thông tin trang ở thanh địa chỉ</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="bg-blue-100 text-blue-800 rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0 text-xs font-semibold">2</span>
                  <span>Tìm và cho phép quyền Camera{type === 'both' && ' và Vị trí'}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="bg-blue-100 text-blue-800 rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0 text-xs font-semibold">3</span>
                  <span>Tải lại trang và thử lại</span>
                </li>
              </>
            ) : (
              <>
                <li className="flex items-start gap-2">
                  <span className="bg-blue-100 text-blue-800 rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0 text-xs font-semibold">1</span>
                  <span>Nhấn vào biểu tượng khóa ở thanh địa chỉ</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="bg-blue-100 text-blue-800 rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0 text-xs font-semibold">2</span>
                  <span>Cho phép quyền Vị trí</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="bg-blue-100 text-blue-800 rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0 text-xs font-semibold">3</span>
                  <span>Tải lại trang và thử lại</span>
                </li>
              </>
            )}
          </ol>
        </div>

        {/* Action buttons */}
        <div className="space-y-3">
          <a
            href={getGuideUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full px-4 sm:px-6 py-2.5 sm:py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors duration-200 text-center text-sm sm:text-base"
          >
            {getGuideButtonText()}
          </a>
          {onRetry && (
            <button
              onClick={onRetry}
              className="w-full px-4 sm:px-6 py-2.5 sm:py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors duration-200 text-sm sm:text-base"
            >
              Thử lại
            </button>
          )}
          <button
            onClick={() => router.push('/')}
            className="w-full px-4 sm:px-6 py-2.5 sm:py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-lg transition-colors duration-200 text-sm sm:text-base"
          >
            Quay về Trang chủ
          </button>
        </div>
      </div>
    </div>
  );

  if (!showHeader) {
    return content;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100">
      <Header />
      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {content}
      </main>
    </div>
  );
}
