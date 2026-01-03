# Hướng Dẫn Cài Đặt Chi Tiết

## Bước 1: Cài Đặt Dependencies

```bash
npm install
```

## Bước 2: Thiết Lập Supabase

### 2.1. Tạo Project Supabase

1. Truy cập [https://supabase.com](https://supabase.com)
2. Đăng ký tài khoản hoặc đăng nhập
3. Click "New Project"
4. Chọn Organization (hoặc tạo mới)
5. Điền thông tin:
   - Project Name: `simple-checkin` (hoặc tên bạn muốn)
   - Database Password: Tạo password mạnh (lưu lại)
   - Region: Chọn `Southeast Asia (Singapore)` hoặc gần nhất
6. Click "Create new project"
7. Đợi 2-3 phút để Supabase tạo project

### 2.2. Chạy Database Schema

1. Trong Supabase Dashboard, click **SQL Editor** ở sidebar trái
2. Click "New query"
3. Mở file `DATABASE_SCHEMA.sql` trong project
4. Copy toàn bộ nội dung
5. Paste vào SQL Editor
6. Click "Run" hoặc nhấn Ctrl+Enter
7. Đợi cho đến khi thấy thông báo "Success. No rows returned"

### 2.3. Cấu Hình Storage

Bucket "selfies" sẽ được tạo tự động từ SQL schema. Kiểm tra:

1. Click **Storage** ở sidebar
2. Kiểm tra có bucket tên `selfies`
3. Nếu chưa có, tạo bucket mới:
   - Click "Create a new bucket"
   - Bucket Name: `selfies`
   - Public bucket: **TẮT** (private)
   - Click "Create bucket"

### 2.4. Lấy API Keys

1. Click **Settings** ở sidebar (icon bánh răng)
2. Click **API** trong menu Settings
3. Trong phần "Project API keys":
   - Copy `Project URL` (ví dụ: https://xxxxx.supabase.co)
   - Copy `anon public` key (chuỗi dài bắt đầu bằng `eyJ...`)

## Bước 3: Cấu Hình Environment Variables

1. Tạo file `.env.local`:

```bash
cp .env.example .env.local
```

2. Mở file `.env.local` và điền thông tin:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Thay thế:
- `https://your-project.supabase.co` bằng Project URL của bạn
- `eyJhbGciOi...` bằng anon key của bạn

## Bước 4: Chạy Development Server

```bash
npm run dev
```

Mở trình duyệt và truy cập: [http://localhost:3000](http://localhost:3000)

## Bước 5: Kiểm Tra Hoạt Động

### Test Chức Năng Owner (Chủ Cửa Hàng)

1. Truy cập http://localhost:3000
2. Click "Chủ Cửa Hàng"
3. Click "Tạo Cửa Hàng Mới"
4. Điền thông tin:
   - Tên: "Cửa Hàng Test"
   - Địa chỉ: "123 Test Street"
   - Click "Lấy Vị Trí Hiện Tại" (cho phép truy cập vị trí)
   - Bán kính: 50 (hoặc giá trị từ 10-500)
5. Click "Tạo Cửa Hàng"
6. Bạn sẽ thấy trang chi tiết với mã QR

### Test Chức Năng Staff (Nhân Viên)

**Lưu ý**: Để test đầy đủ, bạn cần:
- Thiết bị di động hoặc webcam
- Cho phép truy cập camera và vị trí

1. Mở điện thoại, truy cập http://YOUR_IP:3000 (thay YOUR_IP bằng IP máy tính)
2. Click "Nhân Viên"
3. Click "Bắt Đầu Quét"
4. Cho phép truy cập camera
5. Quét mã QR từ màn hình máy tính
6. Điền thông tin nhân viên
7. Chụp selfie
8. Xác nhận điểm danh

## Xử Lý Lỗi

### Lỗi: "Invalid API key"
- Kiểm tra lại `NEXT_PUBLIC_SUPABASE_ANON_KEY` trong `.env.local`
- Đảm bảo copy đúng key từ Supabase Dashboard
- Restart server: Ctrl+C rồi `npm run dev` lại

### Lỗi: "relation does not exist"
- Chưa chạy SQL schema
- Quay lại Bước 2.2 và chạy file `DATABASE_SCHEMA.sql`

### Lỗi: "Failed to upload selfie"
- Kiểm tra bucket "selfies" đã được tạo
- Kiểm tra Storage policies trong SQL schema
- Kiểm tra RLS (Row Level Security) đã được enable

### Lỗi GPS/Camera
- Sử dụng HTTPS hoặc localhost
- Cho phép truy cập trong browser
- Kiểm tra không có app khác đang dùng camera

## Deploy lên Production

### Deploy lên Vercel

1. Push code lên GitHub:

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin YOUR_GITHUB_REPO
git push -u origin main
```

2. Truy cập [vercel.com](https://vercel.com)
3. Import project từ GitHub
4. Thêm Environment Variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. Deploy

### Cấu Hình Supabase cho Production

1. Vào Supabase Dashboard > **Authentication** > **URL Configuration**
2. Thêm production URL vào:
   - Site URL: `https://your-app.vercel.app`
   - Redirect URLs: `https://your-app.vercel.app/**`

## Bảo Mật Production

⚠️ **QUAN TRỌNG**: Hệ thống hiện tại chưa có authentication. Để sử dụng production:

1. **Thêm Authentication**:
   - Tích hợp Supabase Auth
   - Yêu cầu đăng nhập cho owners
   - Xác thực email staff

2. **Bảo Mật API**:
   - Thêm rate limiting
   - Xác thực requests
   - Validate input data

3. **HTTPS Only**:
   - Bắt buộc HTTPS
   - Secure cookies
   - CORS configuration

## Hỗ Trợ

Nếu gặp vấn đề:
1. Kiểm tra console log trong browser (F12)
2. Kiểm tra terminal log của Next.js
3. Kiểm tra Supabase Dashboard > Logs
4. Tạo issue trên GitHub

---

Chúc bạn cài đặt thành công! 🎉
