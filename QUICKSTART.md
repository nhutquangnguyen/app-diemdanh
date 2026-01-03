# Quick Start - 5 Phút Để Bắt Đầu

## Cài Đặt Nhanh

### 1. Install Dependencies (1 phút)
```bash
npm install
```

### 2. Setup Supabase (2 phút)

**Tạo project:**
1. Vào https://supabase.com → Sign up/Login
2. "New Project" → Điền tên → Chọn region Singapore
3. Đợi 2-3 phút

**Setup database:**
1. SQL Editor → New query
2. Copy & paste toàn bộ file `DATABASE_SCHEMA.sql`
3. Run (Ctrl+Enter)

**Lấy keys:**
1. Settings → API
2. Copy `Project URL` và `anon public` key

### 3. Configure Environment (30 giây)
```bash
cp .env.example .env.local
```

Mở `.env.local` và paste:
```env
NEXT_PUBLIC_SUPABASE_URL=<your-project-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
```

### 4. Run (30 giây)
```bash
npm run dev
```

Mở http://localhost:3000

## Demo Flow

### Test Owner (Chủ Cửa Hàng)
1. Click "Chủ Cửa Hàng"
2. "Tạo Cửa Hàng Mới"
3. Điền form → "Lấy Vị Trí Hiện Tại" → Tạo
4. Xem mã QR → Download

### Test Staff (Nhân Viên)
1. Mở trên điện thoại: `http://<your-ip>:3000`
2. Click "Nhân Viên" → "Bắt Đầu Quét"
3. Quét QR từ màn hình
4. Điền thông tin → Chụp selfie → Xác nhận

## Gặp Lỗi?

**"relation does not exist"**
→ Chưa chạy SQL schema (Bước 2)

**"Invalid API key"**
→ Sai key trong .env.local

**GPS không hoạt động**
→ Phải dùng HTTPS hoặc localhost

**Camera không hoạt động**
→ Cho phép camera trong browser settings

## Files Quan Trọng

- `DATABASE_SCHEMA.sql` - Chạy trong Supabase SQL Editor
- `.env.local` - Cấu hình keys (tạo từ .env.example)
- `README.md` - Docs đầy đủ
- `SETUP_GUIDE.md` - Hướng dẫn chi tiết
- `PROJECT_SUMMARY.md` - Tổng quan kỹ thuật

## Next Steps

1. ✅ Test basic flow
2. 📱 Test trên mobile
3. 🚀 Deploy to Vercel
4. 🔐 Thêm authentication
5. 📊 Thêm reports

Enjoy! 🎉
