# Hệ Thống Điểm Danh - Simple Check-in System

Hệ thống điểm danh hiện đại cho doanh nghiệp nhỏ với giao diện tiếng Việt, sử dụng Next.js và Supabase.

## Tính Năng

### Dành cho Chủ Cửa Hàng
- ✅ Tạo cửa hàng nhanh chóng với vị trí GPS hiện tại
- ✅ Tạo mã QR điểm danh tự động
- ✅ Quản lý nhân viên
- ✅ Xem lịch sử điểm danh với ảnh selfie
- ✅ Thiết lập bán kính cho phép điểm danh (10-500m)
- ✅ Dashboard trực quan

### Dành cho Nhân Viên
- ✅ Quét mã QR nhanh chóng
- ✅ Chụp ảnh selfie xác thực
- ✅ Tự động kiểm tra vị trí GPS
- ✅ Giao diện đơn giản, dễ sử dụng
- ✅ Phản hồi ngay lập tức

## Công Nghệ Sử Dụng

- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Storage, Auth)
- **QR Code**: react-qr-code, html5-qrcode
- **Camera**: react-webcam
- **Geolocation**: Browser Geolocation API

## Cài Đặt

### 1. Clone Repository

\`\`\`bash
git clone <repository-url>
cd simple-checkin
\`\`\`

### 2. Cài Đặt Dependencies

\`\`\`bash
npm install
\`\`\`

### 3. Cấu Hình Supabase

#### Bước 3.1: Tạo Project Supabase
1. Truy cập [https://supabase.com](https://supabase.com)
2. Tạo tài khoản mới hoặc đăng nhập
3. Tạo project mới

#### Bước 3.2: Chạy Database Schema
1. Mở Supabase Dashboard
2. Vào **SQL Editor**
3. Copy nội dung file `DATABASE_SCHEMA.sql`
4. Paste vào SQL Editor và chạy

#### Bước 3.3: Cấu Hình Storage
1. Vào **Storage** trong Supabase Dashboard
2. Tạo bucket mới tên `selfies`
3. Cấu hình bucket là **Private**

#### Bước 3.4: Lấy API Keys
1. Vào **Settings** > **API**
2. Copy `Project URL` và `anon public` key

### 4. Cấu Hình Environment Variables

Tạo file `.env.local` từ `.env.example`:

\`\`\`bash
cp .env.example .env.local
\`\`\`

Điền thông tin Supabase vào `.env.local`:

\`\`\`env
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
\`\`\`

### 5. Chạy Development Server

\`\`\`bash
npm run dev
\`\`\`

Mở trình duyệt và truy cập [http://localhost:3000](http://localhost:3000)

## Cấu Trúc Thư Mục

\`\`\`
simple-checkin/
├── app/                      # Next.js App Router
│   ├── owner/               # Trang chủ cửa hàng
│   │   ├── create-store/    # Tạo cửa hàng mới
│   │   └── stores/[id]/     # Chi tiết cửa hàng
│   ├── staff/               # Trang nhân viên
│   │   └── checkin/         # Quy trình điểm danh
│   ├── globals.css          # CSS toàn cục
│   ├── layout.tsx           # Layout chính
│   └── page.tsx             # Trang chủ
├── components/              # React components
├── lib/                     # Thư viện và utilities
│   └── supabase.ts         # Supabase client
├── types/                   # TypeScript type definitions
│   └── index.ts
├── utils/                   # Utility functions
│   └── location.ts         # GPS utilities
├── DATABASE_SCHEMA.sql      # Database schema
└── README.md
\`\`\`

## Hướng Dẫn Sử Dụng

### Cho Chủ Cửa Hàng

1. **Tạo Cửa Hàng**
   - Truy cập trang chủ và chọn "Chủ Cửa Hàng"
   - Click "Tạo Cửa Hàng Mới"
   - Nhập thông tin cửa hàng
   - Click "Lấy Vị Trí Hiện Tại" để lấy GPS
   - Thiết lập bán kính cho phép (mặc định 50m)
   - Click "Tạo Cửa Hàng"

2. **Tải Mã QR**
   - Vào chi tiết cửa hàng
   - Tab "Mã QR Điểm Danh"
   - Click "Tải Mã QR"
   - In mã QR và dán tại cửa hàng

3. **Xem Lịch Sử**
   - Tab "Lịch Sử Điểm Danh" để xem các lần điểm danh
   - Xem ảnh selfie, thời gian, khoảng cách

4. **Quản Lý Nhân Viên**
   - Tab "Nhân Viên" để xem danh sách
   - Thêm nhân viên mới nếu cần

### Cho Nhân Viên

1. **Điểm Danh**
   - Truy cập trang chủ và chọn "Nhân Viên"
   - Click "Bắt Đầu Quét"
   - Quét mã QR tại cửa hàng
   - Nhập thông tin cá nhân (lần đầu)
   - Chụp ảnh selfie
   - Xác nhận điểm danh

2. **Lưu Ý**
   - Phải bật GPS trên thiết bị
   - Phải cho phép truy cập camera
   - Phải ở trong bán kính cho phép

## Database Schema

### Tables

#### profiles
- Lưu thông tin người dùng (owner, staff)

#### stores
- Thông tin cửa hàng, vị trí GPS, mã QR

#### staff
- Danh sách nhân viên theo cửa hàng

#### check_ins
- Lịch sử điểm danh với selfie và GPS

#### time_slots
- Ca làm việc (tính năng mở rộng)

## Tính Năng Mở Rộng

- [ ] Authentication với Supabase Auth
- [ ] Quản lý ca làm việc (time slots)
- [ ] Báo cáo thống kê
- [ ] Xuất dữ liệu Excel
- [ ] Thông báo qua email/SMS
- [ ] Tích hợp nhận diện khuôn mặt
- [ ] Mobile app với React Native

## Xử Lý Lỗi Thường Gặp

### Lỗi: "Không thể lấy vị trí"
- Kiểm tra đã bật GPS/Location trên thiết bị
- Cho phép trình duyệt truy cập vị trí
- Sử dụng HTTPS (localhost được tự động cho phép)

### Lỗi: "Không thể truy cập camera"
- Cho phép trình duyệt truy cập camera
- Kiểm tra không có ứng dụng nào đang dùng camera
- Sử dụng HTTPS (localhost được tự động cho phép)

### Lỗi: Storage/Upload
- Kiểm tra đã tạo bucket "selfies" trong Supabase
- Kiểm tra RLS policies đã được thiết lập đúng
- Kiểm tra API keys trong .env.local

## Deploy

### Vercel (Khuyến nghị)

\`\`\`bash
npm install -g vercel
vercel
\`\`\`

Nhớ thêm environment variables trong Vercel Dashboard.

### Các Platform Khác
- Netlify
- AWS Amplify
- Google Cloud Run

## Bảo Mật

- ✅ Row Level Security (RLS) được bật
- ✅ Storage policies được cấu hình
- ✅ HTTPS required cho production
- ✅ Environment variables được bảo vệ
- ⚠️ Nên thêm authentication cho production

## License

MIT License

## Hỗ Trợ

Nếu gặp vấn đề, vui lòng tạo issue trên GitHub.

---

Made with ❤️ for small businesses in Vietnam
