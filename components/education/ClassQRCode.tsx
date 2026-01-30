'use client';

import { useState } from 'react';
import QRCode from 'react-qr-code';
import { Store } from '@/types';

interface Props {
  classroom: Store;
}

export default function ClassQRCode({ classroom }: Props) {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const checkinUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/student/checkin?class=${classroom.id}`
    : `https://app.diemdanh.net/student/checkin?class=${classroom.id}`;

  async function copyUrl() {
    try {
      await navigator.clipboard.writeText(checkinUrl);
      setCopiedField('url');
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }

  function downloadQRCode() {
    const svg = document.getElementById('qr-code');
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        canvas.toBlob((blob) => {
          if (blob) {
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `qr-${classroom.name.replace(/\s+/g, '-').toLowerCase()}.png`;
            link.click();
            URL.revokeObjectURL(url);
          }
        });
      }
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  }

  function printQRCode() {
    const printWindow = window.open('', '', 'width=800,height=600');
    if (!printWindow) return;

    const svg = document.getElementById('qr-code');
    if (!svg) return;

    const svgClone = svg.cloneNode(true) as SVGElement;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>QR Code - ${classroom.name}</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 100vh;
              margin: 0;
              padding: 20px;
            }
            .container {
              text-align: center;
              max-width: 600px;
            }
            h1 {
              font-size: 24px;
              margin-bottom: 8px;
              color: #1f2937;
            }
            .subtitle {
              font-size: 14px;
              color: #6b7280;
              margin-bottom: 32px;
            }
            .qr-container {
              background: white;
              padding: 32px;
              border: 4px solid #16a34a;
              border-radius: 16px;
              display: inline-block;
              margin: 0 auto 24px;
            }
            .instructions {
              background: #dcfce7;
              padding: 16px;
              border-radius: 8px;
              margin-top: 24px;
            }
            .instructions h3 {
              font-size: 14px;
              font-weight: 600;
              color: #15803d;
              margin: 0 0 12px 0;
            }
            .instructions ol {
              text-align: left;
              font-size: 13px;
              color: #166534;
              margin: 0;
              padding-left: 20px;
            }
            .instructions li {
              margin-bottom: 6px;
            }
            @media print {
              body {
                padding: 0;
              }
              .instructions {
                page-break-before: avoid;
              }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>${classroom.name}</h1>
            ${classroom.subject || classroom.grade_level ? `
              <p class="subtitle">
                ${classroom.subject || ''} ${classroom.grade_level ? '• ' + classroom.grade_level : ''} ${classroom.room_number ? '• Phòng ' + classroom.room_number : ''}
              </p>
            ` : ''}
            <div class="qr-container">
              ${svgClone.outerHTML}
            </div>
            <div class="instructions">
              <h3>Hướng dẫn điểm danh cho học sinh:</h3>
              <ol>
                <li>Học sinh quét mã QR bằng camera điện thoại</li>
                <li>Hoặc truy cập link để mở trang điểm danh</li>
                <li>Đăng nhập và hoàn tất điểm danh</li>
              </ol>
            </div>
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.print();
      printWindow.onafterprint = () => {
        printWindow.close();
      };
    };
  }

  return (
    <div className="px-3 sm:px-6 py-4 sm:py-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-4 sm:mb-6">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2">Mã QR Điểm Danh</h2>
          <p className="text-sm sm:text-base text-gray-600">
            In hoặc chia sẻ mã QR này để học sinh có thể điểm danh dễ dàng
          </p>
        </div>

        {/* QR Code Display */}
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-8 border-2 border-gray-200">
          <div className="text-center">
            {/* Class Name */}
            <div className="mb-4 sm:mb-6">
              <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-1">{classroom.name}</h3>
              <p className="text-xs sm:text-sm text-gray-600">
                {classroom.subject && `${classroom.subject} `}
                {classroom.grade_level && `• ${classroom.grade_level} `}
                {classroom.room_number && `• Phòng ${classroom.room_number}`}
              </p>
            </div>

            {/* QR Code */}
            <div className="bg-white p-4 sm:p-8 rounded-xl inline-block border-2 sm:border-4 border-green-500 shadow-xl max-w-full">
              <QRCode
                id="qr-code"
                value={checkinUrl}
                size={200}
                level="H"
                className="w-full h-auto max-w-[200px] sm:max-w-[256px]"
              />
            </div>

            {/* URL Display */}
            <div className="mt-4 sm:mt-6 bg-gray-50 rounded-lg p-3 sm:p-4">
              <p className="text-xs sm:text-sm text-gray-600 font-medium mb-2">Link điểm danh:</p>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-white border border-gray-300 rounded-lg px-3 py-2 text-xs sm:text-sm text-gray-700 font-mono overflow-x-auto">
                  {checkinUrl}
                </div>
                <button
                  onClick={copyUrl}
                  className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-all flex-shrink-0"
                  title="Copy URL"
                >
                  {copiedField === 'url' ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Instructions */}
            <div className="mt-4 sm:mt-6 bg-green-50 rounded-lg p-3 sm:p-4">
              <p className="text-xs sm:text-sm text-green-800 font-medium mb-2">Hướng dẫn sử dụng:</p>
              <ol className="text-xs sm:text-sm text-green-700 text-left space-y-1 max-w-md mx-auto">
                <li>1. Học sinh quét mã QR bằng camera điện thoại</li>
                <li>2. Hoặc nhấn vào link để mở trang điểm danh</li>
                <li>3. Đăng nhập và hoàn tất điểm danh</li>
              </ol>
            </div>

            {/* Action Buttons */}
            <div className="mt-4 sm:mt-6 flex flex-col sm:flex-row flex-wrap gap-2 sm:gap-3 justify-center">
              <button
                type="button"
                onClick={downloadQRCode}
                className="bg-green-600 hover:bg-green-700 text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all shadow-md text-sm sm:text-base"
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Tải xuống QR
              </button>

              <button
                type="button"
                onClick={printQRCode}
                className="bg-white hover:bg-gray-50 text-gray-700 border-2 border-gray-300 px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all shadow-md text-sm sm:text-base"
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                In mã QR
              </button>
            </div>
          </div>
        </div>

        {/* Additional Info */}
        <div className="mt-4 sm:mt-6 bg-blue-50 rounded-lg p-3 sm:p-4 border border-blue-200">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="text-xs sm:text-sm text-blue-800">
              <p className="font-semibold mb-1">Lưu ý:</p>
              <ul className="space-y-1 list-disc list-inside">
                <li>Học sinh cần đăng nhập để điểm danh</li>
                <li>Mã QR này chỉ hoạt động cho lớp học này</li>
                <li>Bạn có thể in và dán mã QR tại lớp học</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
