# Cách Xóa Cache Khi Không Truy Cập Được App

## Vấn Đề
Một số điện thoại vẫn lưu phiên bản cũ của app trong bộ nhớ cache, dẫn đến lỗi "ERR_ADDRESS_UNREACHABLE" hoặc không thể truy cập.

## Giải Pháp Đã Triển Khai

### 1. Tự Động Phát Hiện Phiên Bản Mới
- App sẽ tự động kiểm tra phiên bản mới mỗi 5 phút
- Khi có bản cập nhật, sẽ hiện thông báo yêu cầu tải lại
- Người dùng chỉ cần nhấn "Tải lại ngay"

### 2. Headers Chống Cache
- Đã cấu hình server không cache HTML pages
- Chỉ cache các file tĩnh (images, fonts) với hash trong tên file

## Hướng Dẫn Người Dùng Cuối

### Trên Android Chrome/Samsung Internet:

1. **Cách 1: Hard Reload (Khuyến nghị)**
   - Mở app: `https://app.diemdanh.net`
   - Nhấn vào menu 3 chấm ⋮
   - Chọn "Cài đặt" (Settings)
   - Chọn "Quyền riêng tư và bảo mật"
   - Chọn "Xóa dữ liệu duyệt web"
   - Tick chọn: "Hình ảnh và tệp được lưu trong bộ nhớ cache"
   - Nhấn "Xóa dữ liệu"
   - Đóng tab và mở lại app

2. **Cách 2: Xóa Cache Riêng Cho Site**
   - Mở app
   - Nhấn vào icon khóa 🔒 trên thanh địa chỉ
   - Chọn "Cài đặt trang web"
   - Chọn "Xóa và đặt lại"
   - Xác nhận
   - Tải lại trang

3. **Cách 3: Force Reload**
   - Mở app
   - Kéo xuống để refresh
   - Nếu vẫn lỗi, đóng tab hoàn toàn
   - Mở tab mới và truy cập lại

### Trên iOS Safari:

1. **Xóa Cache Safari**
   - Vào "Cài đặt" (Settings)
   - Chọn "Safari"
   - Kéo xuống chọn "Xóa lịch sử và dữ liệu trang web"
   - Xác nhận
   - Mở lại Safari và truy cập app

2. **Hard Reload**
   - Mở app trong Safari
   - Nhấn và giữ nút Refresh ⟳
   - Chọn "Reload Without Content Blockers"

### Trên Zalo In-App Browser:

1. **Xóa Cache Zalo**
   - Vào "Cá nhân" trong Zalo
   - Chọn "Cài đặt" ⚙️
   - Chọn "Quyền riêng tư"
   - Chọn "Xóa dữ liệu duyệt web"
   - Chọn "Xóa"

2. **Mở Bằng Trình Duyệt Ngoài**
   - Khi mở link trong Zalo
   - Nhấn menu 3 chấm
   - Chọn "Mở bằng Chrome" hoặc "Mở bằng Safari"

## Cho Admin

### Cách Buộc Tất Cả User Refresh

1. **Thay Đổi Version**
   ```bash
   # Deploy lên Vercel
   git push

   # Hoặc thay đổi biến môi trường
   NEXT_PUBLIC_APP_VERSION=v2.0.1
   ```

2. **Component VersionChecker Sẽ:**
   - Phát hiện version mới
   - Hiện popup yêu cầu reload
   - Tự động xóa cache khi user nhấn "Tải lại"

### Kiểm Tra Version Hiện Tại

```bash
# API endpoint
curl https://app.diemdanh.net/api/version

# Response
{
  "version": "7ab3be5",
  "buildId": "xxx",
  "timestamp": "2026-01-23T10:00:00.000Z"
}
```

## Ngăn Chặn Vấn Đề Trong Tương Lai

### 1. Next.js Đã Tự Động:
- ✅ Hash file names cho JS/CSS (e.g., `main-abc123.js`)
- ✅ Mỗi lần build tạo hash mới
- ✅ Browser tự động tải file mới khi hash thay đổi

### 2. Đã Thêm:
- ✅ Cache-Control headers cho HTML (no-cache)
- ✅ Meta tags chống cache
- ✅ Version checker component
- ✅ Version API endpoint

### 3. Users Sẽ:
- ✅ Nhận thông báo tự động khi có bản cập nhật
- ✅ Có nút "Tải lại ngay" dễ dùng
- ✅ Cache được xóa tự động khi reload

## Debug

### Kiểm Tra Cache Headers

```bash
curl -I https://app.diemdanh.net

# Should see:
Cache-Control: no-cache, no-store, must-revalidate
Pragma: no-cache
Expires: 0
```

### Kiểm Tra Version Checker

1. Mở Console trong browser (F12)
2. Filter logs by "Version"
3. Sẽ thấy: "Version check..." mỗi 5 phút

### Force Trigger Version Check

```javascript
// Trong console
localStorage.setItem('app_version', 'old_version');
location.reload();
// Sẽ thấy popup yêu cầu reload
```

## Contact

Nếu vẫn gặp vấn đề, liên hệ:
- Email: support@diemdanh.net
- Zalo: [số điện thoại]

---

**Lưu ý**: Sau khi deploy bản cập nhật này, khuyến nghị gửi thông báo cho users:

> "🎉 Ứng dụng DiemDanh đã được cập nhật!
>
> Nếu bạn gặp lỗi không truy cập được app, vui lòng:
> 1. Xóa cache trình duyệt
> 2. Hoặc đóng app và mở lại
> 3. Hoặc nhấn nút 'Tải lại' khi có thông báo
>
> Cảm ơn bạn đã sử dụng DiemDanh! 💙"
