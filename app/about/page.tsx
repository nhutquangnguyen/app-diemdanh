import Link from 'next/link';
import Header from '@/components/Header';

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <Header />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        {/* Hero Section with CTA */}
        <div className="text-center mb-16">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-gray-800 mb-6 leading-tight">
            Hệ Thống Chấm Công<br />Cho Thời Đại Số
          </h1>
          <p className="text-lg sm:text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Quên máy chấm công vân tay đắt tiền. Diemdanh.net giúp bạn quản lý nhân viên<br />
            <span className="font-semibold text-blue-600">chính xác, nhanh chóng và tiết kiệm</span>
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-6">
            <Link href="/auth/signup">
              <button className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white px-10 py-4 rounded-lg font-bold text-lg transition-all shadow-xl hover:shadow-2xl">
                Dùng Thử Miễn Phí 7 Ngày
              </button>
            </Link>
            <Link href="/auth/login">
              <button className="w-full sm:w-auto bg-white hover:bg-gray-50 text-gray-800 border-2 border-gray-300 px-10 py-4 rounded-lg font-semibold text-lg transition-all">
                Đăng Nhập
              </button>
            </Link>
          </div>
          <p className="text-sm text-gray-600">
            Miễn phí 100% trong giai đoạn Beta • Không cần thẻ tín dụng
          </p>
        </div>

        {/* How it works - Visual Steps */}
        <section className="mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-800 mb-3 text-center">
            Chỉ 3 Bước Để Bắt Đầu
          </h2>
          <p className="text-center text-gray-600 mb-10">Thiết lập trong vòng 5 phút. Không cần kỹ thuật viên.</p>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Step 1 */}
            <div className="bg-white rounded-2xl shadow-lg p-8 text-center hover:shadow-xl transition-all">
              <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center mx-auto mb-4 font-bold text-lg">
                1
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-3">
                Tạo Cửa Hàng
              </h3>
              <p className="text-gray-600">
                Đăng ký tài khoản, tạo cửa hàng và thiết lập vị trí GPS. Hệ thống tự động tạo mã QR.
              </p>
            </div>

            {/* Step 2 */}
            <div className="bg-white rounded-2xl shadow-lg p-8 text-center hover:shadow-xl transition-all">
              <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <div className="w-10 h-10 bg-purple-600 text-white rounded-full flex items-center justify-center mx-auto mb-4 font-bold text-lg">
                2
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-3">
                Thêm Nhân Viên
              </h3>
              <p className="text-gray-600">
                Nhập email nhân viên vào hệ thống. Chỉ những người được phép mới điểm danh được.
              </p>
            </div>

            {/* Step 3 */}
            <div className="bg-white rounded-2xl shadow-lg p-8 text-center hover:shadow-xl transition-all">
              <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div className="w-10 h-10 bg-green-600 text-white rounded-full flex items-center justify-center mx-auto mb-4 font-bold text-lg">
                3
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-3">
                Bắt Đầu Điểm Danh
              </h3>
              <p className="text-gray-600">
                Nhân viên quét QR, chụp selfie và điểm danh. Toàn bộ quá trình chỉ 5 giây!
              </p>
            </div>
          </div>
        </section>

        {/* Features Grid - Benefit Focused */}
        <section className="mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-800 mb-3 text-center">
            Tại Sao Chọn Diemdanh.net?
          </h2>
          <p className="text-center text-gray-600 mb-10">So sánh với máy chấm công truyền thống</p>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
            <div className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-all border-2 border-transparent hover:border-blue-500">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="font-bold text-gray-800 mb-2 text-lg">Tiết kiệm chi phí</h3>
              <p className="text-gray-600 text-sm">
                Không cần mua máy chấm công 5-20 triệu. Chỉ từ <span className="font-semibold text-blue-600">79K/tháng</span>
              </p>
            </div>

            <div className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-all border-2 border-transparent hover:border-blue-500">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h3 className="font-bold text-gray-800 mb-2 text-lg">Xác thực GPS</h3>
              <p className="text-gray-600 text-sm">
                Đảm bảo nhân viên có mặt tại địa điểm. Chống gian lận điểm danh từ xa.
              </p>
            </div>

            <div className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-all border-2 border-transparent hover:border-blue-500">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h3 className="font-bold text-gray-800 mb-2 text-lg">Selfie xác thực</h3>
              <p className="text-gray-600 text-sm">
                Chụp ảnh khuôn mặt mỗi lần điểm danh. Không thể nhờ người khác quẹt thay.
              </p>
            </div>

            <div className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-all border-2 border-transparent hover:border-blue-500">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="font-bold text-gray-800 mb-2 text-lg">Cực kỳ nhanh</h3>
              <p className="text-gray-600 text-sm">
                Điểm danh chỉ 5 giây. Không xếp hàng chờ quẹt thẻ giờ cao điểm.
              </p>
            </div>

            <div className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-all border-2 border-transparent hover:border-blue-500">
              <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="font-bold text-gray-800 mb-2 text-lg">Báo cáo chi tiết</h3>
              <p className="text-gray-600 text-sm">
                Xem lịch sử, thống kê giờ làm. Xuất báo cáo tính lương dễ dàng.
              </p>
            </div>

            <div className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-all border-2 border-transparent hover:border-blue-500">
              <div className="w-12 h-12 bg-pink-100 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-pink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="font-bold text-gray-800 mb-2 text-lg">Không cài app</h3>
              <p className="text-gray-600 text-sm">
                Nhân viên dùng trình duyệt web. Không chiếm bộ nhớ điện thoại.
              </p>
            </div>
          </div>
        </section>

        {/* Pricing - More Prominent */}
        <section className="mb-16">
          <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-3xl shadow-2xl p-8 sm:p-12 text-white text-center mb-8">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Đặc Biệt: Miễn Phí 100%
            </h2>
            <p className="text-xl mb-6 text-blue-100">
              Đang trong giai đoạn Beta - Sử dụng hoàn toàn miễn phí
            </p>
            <div className="bg-white/10 backdrop-blur rounded-xl p-6 max-w-2xl mx-auto mb-6">
              <p className="text-sm text-blue-50 mb-2">
                ✓ Không giới hạn số lượng điểm danh
              </p>
              <p className="text-sm text-blue-50 mb-2">
                ✓ Tất cả tính năng cao cấp
              </p>
              <p className="text-sm text-blue-50">
                ✓ Không cần thẻ tín dụng
              </p>
            </div>
            <Link href="/auth/signup">
              <button className="bg-white hover:bg-gray-100 text-blue-600 px-12 py-4 rounded-lg font-bold text-lg transition-all shadow-xl hover:shadow-2xl">
                Đăng Ký Miễn Phí Ngay
              </button>
            </Link>
          </div>

          <h3 className="text-2xl font-bold text-gray-800 mb-6 text-center">
            Bảng Giá
          </h3>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Basic */}
            <div className="bg-white rounded-2xl shadow-lg p-8 border-2 border-gray-200">
              <h4 className="text-xl font-bold text-gray-800 mb-2">Cơ Bản</h4>
              <div className="mb-6">
                <span className="text-4xl font-bold text-gray-800">79K</span>
                <span className="text-gray-600">/tháng</span>
              </div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-gray-700">1 cửa hàng</span>
                </li>
                <li className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-gray-700">10 nhân viên</span>
                </li>
                <li className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-gray-700">Tất cả tính năng</span>
                </li>
              </ul>
              <button className="w-full bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold">
                Phù hợp cửa hàng nhỏ
              </button>
            </div>

            {/* Standard - Popular */}
            <div className="bg-white rounded-2xl shadow-2xl p-8 border-4 border-blue-600 relative transform scale-105">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                <span className="bg-blue-600 text-white px-4 py-1 rounded-full text-sm font-bold">
                  Phổ Biến Nhất
                </span>
              </div>
              <h4 className="text-xl font-bold text-gray-800 mb-2">Tiêu Chuẩn</h4>
              <div className="mb-6">
                <span className="text-4xl font-bold text-blue-600">149K</span>
                <span className="text-gray-600">/tháng</span>
              </div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-gray-700">1 cửa hàng</span>
                </li>
                <li className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-gray-700 font-semibold">30 nhân viên</span>
                </li>
                <li className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-gray-700">Tất cả tính năng</span>
                </li>
                <li className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-gray-700">Hỗ trợ ưu tiên</span>
                </li>
              </ul>
              <button className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-bold">
                Lựa chọn tốt nhất
              </button>
            </div>

            {/* Enterprise */}
            <div className="bg-white rounded-2xl shadow-lg p-8 border-2 border-gray-200">
              <h4 className="text-xl font-bold text-gray-800 mb-2">Nhiều Chi Nhánh</h4>
              <div className="mb-6">
                <span className="text-4xl font-bold text-gray-800">249K</span>
                <span className="text-gray-600">/tháng</span>
              </div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-gray-700 font-semibold">3 cửa hàng</span>
                </li>
                <li className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-gray-700">50 nhân viên</span>
                </li>
                <li className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-gray-700">Tất cả tính năng</span>
                </li>
                <li className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-gray-700">Hỗ trợ ưu tiên</span>
                </li>
              </ul>
              <button className="w-full bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold">
                Cho chuỗi cửa hàng
              </button>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <div className="bg-white rounded-2xl shadow-xl p-8 sm:p-12 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-800 mb-4">
            Sẵn Sàng Bắt Đầu?
          </h2>
          <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
            Hàng trăm doanh nghiệp đã tin tưởng. Đăng ký ngay hôm nay và trải nghiệm sự khác biệt.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-6">
            <Link href="/auth/signup">
              <button className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white px-12 py-4 rounded-lg font-bold text-lg transition-all shadow-lg hover:shadow-xl">
                Dùng Thử Miễn Phí
              </button>
            </Link>
            <Link href="/">
              <button className="w-full sm:w-auto bg-white hover:bg-gray-50 text-gray-700 border-2 border-gray-300 px-12 py-4 rounded-lg font-semibold text-lg transition-all">
                Về Trang Chủ
              </button>
            </Link>
          </div>
          <p className="text-sm text-gray-500">
            Có câu hỏi? <a href="mailto:support@diemdanh.net" className="text-blue-600 hover:underline font-semibold">Liên hệ với chúng tôi</a>
          </p>
        </div>
      </div>
    </main>
  );
}
