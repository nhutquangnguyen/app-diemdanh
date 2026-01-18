import Link from 'next/link';
import Header from '@/components/Header';

export default function SepLichAIPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <Header />

      <main className="max-w-6xl mx-auto px-4 py-12 sm:py-20">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <div className="inline-block mb-4">
            <span className="text-6xl">🤖</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
            Xếp lịch AI
          </h1>
          <p className="text-xl sm:text-2xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Xếp lịch làm việc tự động, công bằng và thông minh chỉ trong vài giây
          </p>
          <Link
            href="/auth/signup"
            className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-lg font-semibold text-lg transition-all shadow-lg hover:shadow-xl"
          >
            Dùng thử miễn phí
          </Link>
        </div>

        {/* Problem Section */}
        <div className="mb-20 bg-white rounded-2xl shadow-lg p-8 sm:p-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-6 text-center">
            Đau đầu với việc xếp lịch?
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center p-6 bg-red-50 rounded-xl">
              <div className="text-4xl mb-3">⏰</div>
              <h3 className="font-semibold text-gray-900 mb-2">Mất thời gian</h3>
              <p className="text-gray-600 text-sm">
                Xếp lịch thủ công cho 10 nhân viên mất 2-3 giờ mỗi tuần
              </p>
            </div>
            <div className="text-center p-6 bg-orange-50 rounded-xl">
              <div className="text-4xl mb-3">⚖️</div>
              <h3 className="font-semibold text-gray-900 mb-2">Không công bằng</h3>
              <p className="text-gray-600 text-sm">
                Nhân viên phàn nàn vì người làm nhiều, người làm ít
              </p>
            </div>
            <div className="text-center p-6 bg-yellow-50 rounded-xl">
              <div className="text-4xl mb-3">😰</div>
              <h3 className="font-semibold text-gray-900 mb-2">Thiếu người</h3>
              <p className="text-gray-600 text-sm">
                Quên xếp ca, phát hiện thiếu người khi sắp đến giờ làm
              </p>
            </div>
          </div>
        </div>

        {/* Solution Section */}
        <div className="mb-20">
          <h2 className="text-3xl font-bold text-gray-900 mb-12 text-center">
            Xếp lịch AI giải quyết tất cả
          </h2>
          <div className="space-y-12">
            {/* Feature 1 - NOW: Availability */}
            <div className="flex flex-col md:flex-row items-center gap-8 bg-white rounded-2xl shadow-lg p-8">
              <div className="flex-1">
                <div className="inline-block bg-blue-100 text-blue-600 px-4 py-2 rounded-full text-sm font-semibold mb-4">
                  Bước 1
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">
                  Chọn nhân viên rảnh - Dễ dàng
                </h3>
                <p className="text-gray-600 mb-4">
                  Đánh dấu nhân viên có thể làm ca nào. Giao diện gấp/mở giúp bạn xử lý nhanh từng người.
                </p>
                <ul className="space-y-2">
                  <li className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-gray-700">Nút "Tất cả", "Ngày thường", "Cuối tuần"</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-gray-700">Thanh tiến độ hiển thị % sẵn sàng</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-gray-700">Giao diện card thu gọn, mở rộng linh hoạt</span>
                  </li>
                </ul>
              </div>
              <div className="flex-1 bg-gray-100 rounded-xl p-6 text-center">
                <div className="text-6xl mb-2">✅</div>
                <p className="text-sm text-gray-600">Card nhân viên thông minh<br/>Điền nhanh với các nút tắt</p>
              </div>
            </div>

            {/* Feature 2 - NOW: Staff Numbers */}
            <div className="flex flex-col md:flex-row-reverse items-center gap-8 bg-white rounded-2xl shadow-lg p-8">
              <div className="flex-1">
                <div className="inline-block bg-purple-100 text-purple-600 px-4 py-2 rounded-full text-sm font-semibold mb-4">
                  Bước 2
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">
                  Nhập yêu cầu - Siêu nhanh
                </h3>
                <p className="text-gray-600 mb-4">
                  Chỉ cần nhập số người cần cho mỗi ca. Dùng "Áp dụng cho tất cả" để điền hàng loạt, tiết kiệm thời gian.
                </p>
                <ul className="space-y-2">
                  <li className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-gray-700">Nhấp vào số để thay đổi nhanh</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-gray-700">Áp dụng hàng loạt trong 1 click</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-gray-700">Giao diện tối ưu cho mobile</span>
                  </li>
                </ul>
              </div>
              <div className="flex-1 bg-gray-100 rounded-xl p-6 text-center">
                <div className="text-6xl mb-2">📱</div>
                <p className="text-sm text-gray-600">Bảng nhập số liệu gọn nhẹ<br/>Hiển thị đủ 7 ngày trên mobile</p>
              </div>
            </div>

            {/* Feature 3 */}
            <div className="flex flex-col md:flex-row items-center gap-8 bg-white rounded-2xl shadow-lg p-8">
              <div className="flex-1">
                <div className="inline-block bg-green-100 text-green-600 px-4 py-2 rounded-full text-sm font-semibold mb-4">
                  Bước 3
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">
                  AI xếp lịch - Công bằng & Thông minh
                </h3>
                <p className="text-gray-600 mb-4">
                  Thuật toán AI phân tích và tạo lịch tối ưu dựa trên nhiều yếu tố, đảm bảo công bằng cho mọi người.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-blue-50 rounded-lg p-3">
                    <div className="text-2xl font-bold text-blue-600">98%</div>
                    <div className="text-xs text-gray-600">Độ phủ trung bình</div>
                  </div>
                  <div className="bg-green-50 rounded-lg p-3">
                    <div className="text-2xl font-bold text-green-600">95/100</div>
                    <div className="text-xs text-gray-600">Điểm công bằng</div>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-3">
                    <div className="text-2xl font-bold text-purple-600">3 giây</div>
                    <div className="text-xs text-gray-600">Thời gian xếp lịch</div>
                  </div>
                  <div className="bg-orange-50 rounded-lg p-3">
                    <div className="text-2xl font-bold text-orange-600">5+ yếu tố</div>
                    <div className="text-xs text-gray-600">Được cân nhắc</div>
                  </div>
                </div>
              </div>
              <div className="flex-1 bg-gradient-to-br from-blue-100 to-purple-100 rounded-xl p-6">
                <h4 className="font-bold text-gray-900 mb-3">AI cân nhắc:</h4>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                    Cân bằng số giờ làm việc
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                    Phân bổ đều số ca
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-purple-600 rounded-full"></div>
                    Tránh làm liên tục nhiều ngày
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-orange-600 rounded-full"></div>
                    Luân phiên ca cuối tuần
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-red-600 rounded-full"></div>
                    Ưu tiên ca khó xếp trước
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Benefits Section */}
        <div className="mb-20 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl shadow-xl p-8 sm:p-12 text-white">
          <h2 className="text-3xl font-bold mb-8 text-center">
            Lợi ích rõ ràng
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="flex gap-4">
              <div className="text-3xl">⚡</div>
              <div>
                <h3 className="font-bold text-lg mb-2">Tiết kiệm 90% thời gian</h3>
                <p className="text-blue-100">Từ 2-3 giờ xuống còn 5-10 phút mỗi tuần</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="text-3xl">😊</div>
              <div>
                <h3 className="font-bold text-lg mb-2">Nhân viên hài lòng hơn</h3>
                <p className="text-blue-100">Lịch công bằng, ít phàn nàn, tinh thần tốt hơn</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="text-3xl">📊</div>
              <div>
                <h3 className="font-bold text-lg mb-2">Minh bạch & Kiểm soát</h3>
                <p className="text-blue-100">Xem trước, thống kê rõ ràng trước khi áp dụng</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="text-3xl">🎯</div>
              <div>
                <h3 className="font-bold text-lg mb-2">Độ phủ cao hơn</h3>
                <p className="text-blue-100">AI tìm được cách xếp mà bạn có thể bỏ lỡ</p>
              </div>
            </div>
          </div>
        </div>

        {/* How It Works Visually */}
        <div className="mb-20">
          <h2 className="text-3xl font-bold text-gray-900 mb-12 text-center">
            Cách hoạt động
          </h2>
          <div className="relative">
            <div className="absolute left-1/2 top-0 bottom-0 w-1 bg-blue-200 hidden md:block"></div>
            <div className="space-y-8">
              {[
                { num: "1", title: "Đánh dấu sẵn sàng", desc: "Chọn nhân viên rảnh cho từng ca", time: "2-3 phút" },
                { num: "2", title: "Nhập yêu cầu", desc: "Số người cần cho mỗi ca, mỗi ngày", time: "30 giây" },
                { num: "3", title: "AI xếp lịch", desc: "Thuật toán tính toán lịch tối ưu", time: "3 giây" },
                { num: "4", title: "Xem trước & Áp dụng", desc: "Kiểm tra thống kê, cảnh báo, rồi chấp nhận", time: "1-2 phút" }
              ].map((step, idx) => (
                <div key={idx} className="flex items-center gap-8 relative">
                  <div className={`flex-1 ${idx % 2 === 0 ? 'md:text-right' : 'md:order-2'}`}>
                    <div className="bg-white rounded-xl shadow-lg p-6 inline-block max-w-md">
                      <h3 className="font-bold text-xl text-gray-900 mb-2">{step.title}</h3>
                      <p className="text-gray-600 mb-2">{step.desc}</p>
                      <div className="inline-block bg-blue-100 text-blue-600 px-3 py-1 rounded-full text-sm font-semibold">
                        {step.time}
                      </div>
                    </div>
                  </div>
                  <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-xl z-10 flex-shrink-0">
                    {step.num}
                  </div>
                  <div className="flex-1 hidden md:block"></div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center bg-white rounded-2xl shadow-xl p-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Sẵn sàng thử Xếp lịch AI?
          </h2>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Tham gia cùng hàng trăm quản lý đang tiết kiệm thời gian và tạo lịch công bằng hơn
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/auth/signup"
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-lg font-semibold text-lg transition-all shadow-lg hover:shadow-xl"
            >
              Dùng thử miễn phí
            </Link>
            <Link
              href="/pricing"
              className="bg-white hover:bg-gray-50 text-blue-600 border-2 border-blue-600 px-8 py-4 rounded-lg font-semibold text-lg transition-all"
            >
              Xem bảng giá
            </Link>
          </div>
          <p className="text-sm text-gray-500 mt-4">
            Không cần thẻ tín dụng • Miễn phí 14 ngày
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300 py-12 mt-20">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <p className="mb-4">© 2026 DiemDanh.net - Hệ thống chấm công thông minh</p>
          <div className="flex justify-center gap-6 text-sm">
            <Link href="/about" className="hover:text-white transition-colors">Về chúng tôi</Link>
            <Link href="/pricing" className="hover:text-white transition-colors">Bảng giá</Link>
            <Link href="/auth/login" className="hover:text-white transition-colors">Đăng nhập</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
