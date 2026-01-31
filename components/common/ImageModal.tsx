'use client';

interface ImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  title: string;
  metadata?: {
    time?: string;
    distance?: string;
    checkOut?: string;
    checkOutPhoto?: string;
  };
}

export function ImageModal({ isOpen, onClose, imageUrl, title, metadata }: ImageModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div
        className="absolute inset-0"
        onClick={onClose}
      />

      <div className="relative bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Main Image */}
          <img
            src={imageUrl}
            alt={title}
            className="w-full rounded-lg shadow-lg mb-4"
          />

          {/* Metadata */}
          {metadata && (
            <div className="space-y-2 text-sm text-gray-600">
              {metadata.time && (
                <div className="flex items-center gap-2">
                  <span className="font-medium">Thời gian:</span>
                  <span>{new Date(metadata.time).toLocaleString('vi-VN')}</span>
                </div>
              )}
              {metadata.distance && (
                <div className="flex items-center gap-2">
                  <span className="font-medium">Khoảng cách:</span>
                  <span>{metadata.distance}</span>
                </div>
              )}
              {metadata.checkOut && (
                <div className="flex items-center gap-2">
                  <span className="font-medium">Check-out:</span>
                  <span>{new Date(metadata.checkOut).toLocaleString('vi-VN')}</span>
                </div>
              )}
            </div>
          )}

          {/* Check-out Photo */}
          {metadata?.checkOutPhoto && (
            <div className="mt-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Ảnh Check-out:</h4>
              <img
                src={metadata.checkOutPhoto}
                alt="Check-out"
                className="w-full rounded-lg shadow-lg"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
