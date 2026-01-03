# Quick Setup - Simplified Version

## 🚀 Setup trong 3 bước:

### 1. Setup Database
Vào Supabase Dashboard → SQL Editor → Chạy file `SIMPLE_SCHEMA.sql`

### 2. Test app
```bash
npm run dev
```

### 3. Workflow:
1. **Đăng ký**: http://localhost:3000/auth/signup
   - Nhập tên, email, mật khẩu
   - Không cần chọn role!

2. **Đăng nhập**: http://localhost:3000/auth/login

3. **Tạo sự kiện**:
   - Dashboard → Tạo Cửa Hàng Mới
   - Lấy GPS → Tải mã QR

4. **Điểm danh**:
   - Trang chủ → Điểm Danh
   - Quét QR → Nhập thông tin → Selfie

## ✨ Thay đổi:
- ✅ Không có role (owner/staff)
- ✅ Không có bảng profiles
- ✅ Ai cũng có thể tạo sự kiện
- ✅ Ai cũng có thể điểm danh
- ✅ Đơn giản hơn nhiều!

## 🔒 Security:
- Chỉ xem được stores của mình
- Chỉ xem được check-ins của stores mình tạo
- Auth bắt buộc để tạo store
- Check-in không cần auth (linh hoạt hơn)
