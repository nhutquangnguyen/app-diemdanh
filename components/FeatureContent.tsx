import Link from 'next/link';

export default function FeatureContent() {
  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Hero Section */}
      <div className="text-center mb-16">
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-gray-800 mb-6 leading-tight">
          Giải Pháp Điểm Danh<br />
          <span className="text-blue-600">Thông Minh & Hiện Đại</span>
        </h1>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
          Quên máy chấm công cồng kềnh. Chỉ cần 1 link, nhân viên điểm danh trong 5 giây.<br />
          Không cần cài app. Không cần đầu tư thiết bị đắt tiền.
        </p>
        <div className="flex justify-center">
          <Link href="/auth/signup">
            <button className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-lg font-bold text-lg transition-all shadow-lg hover:shadow-xl">
              Dùng Thử Miễn Phí 7 Ngày
            </button>
          </Link>
        </div>
      </div>

      {/* Benefits Section */}
      <div className="mb-20">
        <h2 className="text-3xl sm:text-4xl font-bold text-center text-gray-800 mb-12">
          Tại Sao Chọn Diemdanh.net?
        </h2>
        <div className="grid md:grid-cols-3 gap-8">
          <div className="text-center">
            <div className="text-5xl mb-4">💰</div>
            <h3 className="text-xl font-bold text-gray-800 mb-3">Tiết Kiệm Chi Phí</h3>
            <p className="text-gray-600">
              Không cần mua máy chấm công đắt tiền. Không cần bảo trì thiết bị. Chỉ từ 79K/tháng.
            </p>
          </div>
          <div className="text-center">
            <div className="text-5xl mb-4">⚡</div>
            <h3 className="text-xl font-bold text-gray-800 mb-3">Dễ Dàng & Nhanh Chóng</h3>
            <p className="text-gray-600">
              Thiết lập trong 5 phút. Nhân viên điểm danh chỉ trong 5 giây. Không cần đào tạo phức tạp.
            </p>
          </div>
          <div className="text-center">
            <div className="text-5xl mb-4">🔒</div>
            <h3 className="text-xl font-bold text-gray-800 mb-3">An Toàn & Chính Xác</h3>
            <p className="text-gray-600">
              GPS + Selfie đảm bảo đúng người đúng nơi. Dữ liệu được mã hóa và backup tự động.
            </p>
          </div>
        </div>
      </div>

      {/* How It Works */}
      <div className="mb-20">
        <h2 className="text-3xl sm:text-4xl font-bold text-center text-gray-800 mb-12">
          Cách Hoạt Động
        </h2>
        <div className="max-w-4xl mx-auto">
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-blue-200 hidden md:block"></div>

            <div className="space-y-8">
              {/* Step 1 */}
              <div className="flex gap-6 items-start">
                <div className="flex-shrink-0 w-16 h-16 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-xl shadow-lg z-10">
                  1
                </div>
                <div className="flex-1 bg-white rounded-xl shadow-lg p-6">
                  <h3 className="text-xl font-bold text-gray-800 mb-2">Đăng Ký & Tạo Cửa Hàng</h3>
                  <p className="text-gray-600">
                    Đăng ký tài khoản miễn phí, thêm thông tin cửa hàng, và thiết lập GPS radius.
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex gap-6 items-start">
                <div className="flex-shrink-0 w-16 h-16 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-xl shadow-lg z-10">
                  2
                </div>
                <div className="flex-1 bg-white rounded-xl shadow-lg p-6">
                  <h3 className="text-xl font-bold text-gray-800 mb-2">Thêm Nhân Viên</h3>
                  <p className="text-gray-600">
                    Gửi link hoặc mã QR cho nhân viên. Họ đăng ký và tự động được thêm vào cửa hàng.
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex gap-6 items-start">
                <div className="flex-shrink-0 w-16 h-16 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-xl shadow-lg z-10">
                  3
                </div>
                <div className="flex-1 bg-white rounded-xl shadow-lg p-6">
                  <h3 className="text-xl font-bold text-gray-800 mb-2">Nhân Viên Điểm Danh</h3>
                  <p className="text-gray-600">
                    Nhân viên mở link trên điện thoại, check-in/out với GPS + Selfie. Siêu nhanh!
                  </p>
                </div>
              </div>

              {/* Step 4 */}
              <div className="flex gap-6 items-start">
                <div className="flex-shrink-0 w-16 h-16 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-xl shadow-lg z-10">
                  4
                </div>
                <div className="flex-1 bg-white rounded-xl shadow-lg p-6">
                  <h3 className="text-xl font-bold text-gray-800 mb-2">Xem Báo Cáo & Tính Lương</h3>
                  <p className="text-gray-600">
                    Chủ cửa hàng xem báo cáo thời gian thực, xuất dữ liệu, và tính lương chính xác.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* AI Scheduling Feature Highlight */}
      <div className="mb-20">
        <div className="bg-gradient-to-br from-purple-600 to-blue-600 rounded-3xl shadow-2xl p-8 sm:p-12 text-white">
          <div className="max-w-5xl mx-auto">
            <div className="flex flex-col md:flex-row items-center gap-8">
              <div className="flex-1">
                <div className="inline-block bg-yellow-400 text-purple-900 px-4 py-2 rounded-full text-sm font-bold mb-4 animate-pulse">
                  ✨ MỚI: Tính năng AI
                </div>
                <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                  Sếp lịch AI 🤖
                </h2>
                <p className="text-xl text-blue-100 mb-6">
                  Xếp lịch làm việc tự động, công bằng và thông minh chỉ trong vài giây
                </p>
                <ul className="space-y-3 mb-6">
                  <li className="flex items-start gap-3">
                    <svg className="w-6 h-6 text-green-300 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-lg">Tiết kiệm <strong>90% thời gian</strong> xếp lịch (từ 2-3 giờ xuống 5-10 phút)</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <svg className="w-6 h-6 text-green-300 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-lg">Phân bổ <strong>công bằng</strong> dựa trên 5+ yếu tố (giờ, ca, ngày nghỉ, cuối tuần...)</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <svg className="w-6 h-6 text-green-300 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-lg">Độ phủ cao hơn - AI tìm được cách xếp tối ưu mà bạn có thể bỏ lỡ</span>
                  </li>
                </ul>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Link
                    href="/sep-lich-ai"
                    className="inline-block bg-white hover:bg-gray-100 text-purple-600 px-8 py-4 rounded-lg font-bold text-lg transition-all shadow-lg text-center"
                  >
                    Tìm hiểu thêm
                  </Link>
                  <Link
                    href="/auth/signup"
                    className="inline-block bg-yellow-400 hover:bg-yellow-500 text-purple-900 px-8 py-4 rounded-lg font-bold text-lg transition-all shadow-lg text-center"
                  >
                    Dùng thử ngay
                  </Link>
                </div>
              </div>
              <div className="flex-shrink-0">
                <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-2xl p-6 border border-white border-opacity-20">
                  <div className="text-6xl mb-4 text-center">🤖</div>
                  <div className="grid grid-cols-2 gap-3 text-center">
                    <div className="bg-white bg-opacity-20 rounded-lg p-3">
                      <div className="text-2xl font-bold">98%</div>
                      <div className="text-xs text-blue-100">Độ phủ</div>
                    </div>
                    <div className="bg-white bg-opacity-20 rounded-lg p-3">
                      <div className="text-2xl font-bold">95/100</div>
                      <div className="text-xs text-blue-100">Công bằng</div>
                    </div>
                    <div className="bg-white bg-opacity-20 rounded-lg p-3">
                      <div className="text-2xl font-bold">3s</div>
                      <div className="text-xs text-blue-100">Xếp lịch</div>
                    </div>
                    <div className="bg-white bg-opacity-20 rounded-lg p-3">
                      <div className="text-2xl font-bold">5+</div>
                      <div className="text-xs text-blue-100">Yếu tố</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Core Features */}
      <div className="mb-20">
        <h2 className="text-3xl sm:text-4xl font-bold text-center text-gray-800 mb-12">
          Tính Năng Nổi Bật
        </h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* Feature 1: GPS */}
          <div className="bg-white rounded-2xl shadow-lg p-8 hover:shadow-xl transition-all">
            <div className="w-16 h-16 bg-blue-100 rounded-xl flex items-center justify-center mb-6">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-3">
              Xác Thực Vị Trí GPS
            </h3>
            <p className="text-gray-600 mb-4">
              Đảm bảo nhân viên điểm danh đúng vị trí cửa hàng. Tùy chỉnh bán kính từ 10-500m.
            </p>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-start gap-2">
                <svg className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Độ chính xác cao đến từng mét</span>
              </li>
              <li className="flex items-start gap-2">
                <svg className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Chống gian lận điểm danh từ xa</span>
              </li>
              <li className="flex items-start gap-2">
                <svg className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Hiển thị khoảng cách thời gian thực</span>
              </li>
            </ul>
          </div>

          {/* Feature 2: Selfie */}
          <div className="bg-white rounded-2xl shadow-lg p-8 hover:shadow-xl transition-all">
            <div className="w-16 h-16 bg-purple-100 rounded-xl flex items-center justify-center mb-6">
              <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-3">
              Selfie Xác Thực
            </h3>
            <p className="text-gray-600 mb-4">
              Chụp ảnh khuôn mặt mỗi lần điểm danh. Đảm bảo đúng người, đúng giờ.
            </p>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-start gap-2">
                <svg className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Lưu ảnh vào/ra từng ca làm việc</span>
              </li>
              <li className="flex items-start gap-2">
                <svg className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Chuyển đổi camera trước/sau dễ dàng</span>
              </li>
              <li className="flex items-start gap-2">
                <svg className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Tùy chọn bật/tắt cho từng cửa hàng</span>
              </li>
            </ul>
          </div>

          {/* Feature 3: QR Code */}
          <div className="bg-white rounded-2xl shadow-lg p-8 hover:shadow-xl transition-all">
            <div className="w-16 h-16 bg-green-100 rounded-xl flex items-center justify-center mb-6">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-3">
              Quét Mã QR
            </h3>
            <p className="text-gray-600 mb-4">
              Mỗi cửa hàng có mã QR riêng. Nhân viên quét là điểm danh ngay.
            </p>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-start gap-2">
                <svg className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Tự động tạo mã QR cho mỗi cửa hàng</span>
              </li>
              <li className="flex items-start gap-2">
                <svg className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>In mã QR để dán tại cửa hàng</span>
              </li>
              <li className="flex items-start gap-2">
                <svg className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Nhanh chóng, không cần gõ gì</span>
              </li>
            </ul>
          </div>

          {/* Feature 4: Multi-shift */}
          <div className="bg-white rounded-2xl shadow-lg p-8 hover:shadow-xl transition-all">
            <div className="w-16 h-16 bg-orange-100 rounded-xl flex items-center justify-center mb-6">
              <svg className="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-3">
              Hỗ Trợ Nhiều Ca
            </h3>
            <p className="text-gray-600 mb-4">
              Nhân viên làm nhiều ca trong ngày? Không sao cả. Hệ thống hỗ trợ không giới hạn.
            </p>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-start gap-2">
                <svg className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Tự động tính số ca trong ngày</span>
              </li>
              <li className="flex items-start gap-2">
                <svg className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Sửa giờ ra nếu quên check-out</span>
              </li>
              <li className="flex items-start gap-2">
                <svg className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Tính tổng thời gian làm việc chính xác</span>
              </li>
            </ul>
          </div>

          {/* Feature 5: Real-time monitoring */}
          <div className="bg-white rounded-2xl shadow-lg p-8 hover:shadow-xl transition-all">
            <div className="w-16 h-16 bg-red-100 rounded-xl flex items-center justify-center mb-6">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-3">
              Giám Sát Thời Gian Thực
            </h3>
            <p className="text-gray-600 mb-4">
              Chủ cửa hàng xem được ai đang làm việc, ai đã về. Cập nhật liên tục.
            </p>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-start gap-2">
                <svg className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Hiển thị số nhân viên đang làm việc</span>
              </li>
              <li className="flex items-start gap-2">
                <svg className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Xem chi tiết từng ca làm việc</span>
              </li>
              <li className="flex items-start gap-2">
                <svg className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Dashboard trực quan, dễ sử dụng</span>
              </li>
            </ul>
          </div>

          {/* Feature 6: Reports */}
          <div className="bg-white rounded-2xl shadow-lg p-8 hover:shadow-xl transition-all">
            <div className="w-16 h-16 bg-indigo-100 rounded-xl flex items-center justify-center mb-6">
              <svg className="w-8 h-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-3">
              Báo Cáo Chi Tiết
            </h3>
            <p className="text-gray-600 mb-4">
              Xuất báo cáo công chi tiết theo ngày, tuần, tháng. Dễ dàng tính lương.
            </p>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-start gap-2">
                <svg className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Lịch sử điểm danh đầy đủ</span>
              </li>
              <li className="flex items-start gap-2">
                <svg className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Hiển thị ảnh selfie từng lần check-in</span>
              </li>
              <li className="flex items-start gap-2">
                <svg className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Tính tổng giờ làm tự động</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="mb-20">
        <h2 className="text-3xl sm:text-4xl font-bold text-center text-gray-800 mb-12">
          Câu Hỏi Thường Gặp
        </h2>
        <div className="max-w-3xl mx-auto space-y-4">
          <div className="bg-white rounded-xl shadow-md p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-2">
              ❓ Có cần cài đặt app không?
            </h3>
            <p className="text-gray-600">
              Không! Diemdanh.net hoạt động 100% trên trình duyệt web. Nhân viên chỉ cần mở link trên điện thoại là có thể điểm danh ngay.
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-2">
              ❓ GPS có chính xác không?
            </h3>
            <p className="text-gray-600">
              GPS trên điện thoại thông minh có độ chính xác 5-20m. Bạn có thể tùy chỉnh bán kính từ 10-500m để phù hợp với cửa hàng.
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-2">
              ❓ Dữ liệu có an toàn không?
            </h3>
            <p className="text-gray-600">
              Tất cả dữ liệu được mã hóa và lưu trữ trên Supabase (hạ tầng cấp doanh nghiệp). Backup tự động hàng ngày.
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-2">
              ❓ Thời gian dùng thử có giới hạn tính năng không?
            </h3>
            <p className="text-gray-600">
              Không! Bạn được trải nghiệm 100% tính năng trong 7 ngày miễn phí. Không cần thẻ tín dụng.
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-2">
              ❓ Có thể hủy bất cứ lúc nào không?
            </h3>
            <p className="text-gray-600">
              Có! Bạn có thể hủy bất cứ lúc nào. Không có hợp đồng ràng buộc. Dữ liệu của bạn vẫn được giữ nguyên.
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-2">
              ❓ Có hỗ trợ khách hàng không?
            </h3>
            <p className="text-gray-600">
              Có! Chúng tôi hỗ trợ qua email và chat. Thời gian hỗ trợ: 9AM - 6PM (T2-T6).
            </p>
          </div>
        </div>
      </div>

      {/* Final CTA */}
      <div className="text-center">
        <h2 className="text-3xl sm:text-4xl font-bold text-gray-800 mb-6">
          Sẵn Sàng Thử Ngay?
        </h2>
        <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
          Tham gia <strong>500+ Chủ Quán Đã Tin Dùng</strong> - quản lý nhân sự hiệu quả hơn với diemdanh.net.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Link href="/auth/signup">
            <button className="bg-blue-600 hover:bg-blue-700 text-white px-10 py-5 rounded-lg font-bold text-xl transition-all shadow-xl hover:shadow-2xl">
              Dùng Thử Miễn Phí 7 Ngày
            </button>
          </Link>
          <Link href="/pricing">
            <button className="bg-white hover:bg-gray-50 text-blue-600 border-2 border-blue-600 px-10 py-5 rounded-lg font-bold text-xl transition-all shadow-lg hover:shadow-xl">
              Xem Chi Tiết Bảng Giá
            </button>
          </Link>
        </div>
        <p className="mt-4 text-gray-500">
          Không cần thẻ tín dụng • Thiết lập trong 5 phút
        </p>
      </div>
    </main>
  );
}
