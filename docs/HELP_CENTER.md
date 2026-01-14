# Trung Tâm Trợ Giúp DiemDanh

## Tổng Quan

Hệ thống trợ giúp đầy đủ với các bài viết hướng dẫn chi tiết bằng tiếng Việt.

## Cấu Trúc

```
/help                    → Trang chủ trung tâm trợ giúp
/help/[slug]             → Các bài viết chi tiết
```

## Bài Viết Hiện Có

### 1. Bắt Đầu (`/help/bat-dau`)
- Hướng dẫn toàn diện cho người dùng mới
- Các bước: Tạo cửa hàng → Thêm nhân viên → Tạo ca → Xếp lịch → Điểm danh
- Thời gian đọc: 5 phút

### 2. Hướng Dẫn Điểm Danh (`/help/diem-danh`)
- 3 cách điểm danh: QR Code, App, GPS
- Xử lý các tình huống thường gặp
- Tính năng đặc biệt: Sớm/muộn, offline, ghi chú
- Thời gian đọc: 3 phút

### 3. Xếp Lịch AI (`/help/xep-lich-ai`)
- Hướng dẫn sử dụng AI để xếp lịch tự động
- Giải thích thuật toán
- Xử lý các trường hợp đặc biệt
- Thời gian đọc: 4 phút

### 4. Cài Đặt PWA (`/help/cai-dat-app`)
- Hướng dẫn cài đặt trên iPhone, Android, máy tính
- So sánh PWA vs App Native
- Khắc phục sự cố
- Thời gian đọc: 2 phút

## Tính Năng

### Trang Chủ Trợ Giúp
- ✅ Thanh tìm kiếm
- ✅ Phần "Bài Viết Phổ Biến"
- ✅ Nhóm theo danh mục
- ✅ Icon và emoji cho dễ nhìn
- ✅ Thông tin liên hệ hỗ trợ

### Trang Bài Viết
- ✅ Breadcrumb navigation
- ✅ Thời gian đọc ước tính
- ✅ Định dạng MDX đẹp với syntax highlighting
- ✅ Nút "Có hữu ích không?"
- ✅ Bài viết liên quan
- ✅ Responsive mobile/desktop

### Styling
- ✅ Gradient headers
- ✅ Hover effects
- ✅ Shadow và borders
- ✅ Typography hierarchy rõ ràng
- ✅ Code blocks với màu nền
- ✅ Tables responsive
- ✅ Emoji và icons

## Thêm Bài Viết Mới

### Bước 1: Tạo File MDX

```bash
content/help/ten-bai-viet.mdx
```

### Bước 2: Viết Nội Dung

```markdown
# Tiêu Đề Bài Viết

**Thời gian đọc:** X phút

## Bạn Sẽ Học Được Gì
- Điểm 1
- Điểm 2

## Nội dung...
```

### Bước 3: Thêm Metadata

Sửa file `lib/help-articles.ts`:

```typescript
{
  slug: 'ten-bai-viet',
  title: 'Tiêu Đề',
  description: 'Mô tả ngắn',
  category: 'features', // hoặc 'getting-started', 'advanced', 'faq'
  icon: '🎯',
  readTime: 3,
  popular: true, // tùy chọn
}
```

### Bước 4: Build & Deploy

```bash
npm run build
git add .
git commit -m "Add new help article"
git push
vercel --prod
```

## Best Practices

### Viết Nội Dung
- ✅ Dùng ngôn ngữ đơn giản, dễ hiểu
- ✅ Chia thành các bước nhỏ
- ✅ Thêm ví dụ cụ thể
- ✅ Dùng emoji và icon (đừng lạm dụng)
- ✅ Highlight các mẹo với 💡
- ✅ Cảnh báo với ⚠️
- ✅ Success với ✅

### Cấu Trúc
- Bắt đầu với "Bạn Sẽ Học Được Gì"
- Chia thành H2, H3 rõ ràng
- Có phần "Mẹo Sử Dụng"
- Có phần "Câu Hỏi Thường Gặp"
- Kết thúc với "Bài Viết Liên Quan"
- Thêm thông tin liên hệ hỗ trợ

### Hình Ảnh (Tương Lai)
```markdown
![Alt text](/images/help/ten-hinh.png)
```

Đặt ảnh vào: `public/images/help/`

## Danh Mục

- **🎯 Bắt Đầu** (`getting-started`): Hướng dẫn cơ bản
- **✨ Tính Năng** (`features`): Hướng dẫn sử dụng tính năng
- **⚙️ Nâng Cao** (`advanced`): Tính năng và cài đặt nâng cao
- **❓ FAQ** (`faq`): Câu hỏi thường gặp

## Navigation

Help link được thêm vào header (components/Header.tsx):
- Luôn hiển thị (cả khi chưa đăng nhập)
- Icon dấu hỏi (?)
- Hover effect màu xanh

## SEO

Mỗi bài viết có:
- Title tag: `${article.title} - Trợ Giúp DiemDanh`
- Meta description từ article.description
- Breadcrumb navigation
- Structured content với proper headings

## Tương Lai

### Tính năng có thể thêm:
- [ ] Tìm kiếm full-text
- [ ] Video hướng dẫn nhúng
- [ ] Comment/feedback system
- [ ] Đa ngôn ngữ (English)
- [ ] Analytics (most viewed articles)
- [ ] In-app help tooltips
- [ ] Chatbot AI
- [ ] PDF export
- [ ] Print-friendly version
- [ ] Dark mode

### Bài viết có thể thêm:
- [ ] Quản lý nhân viên
- [ ] Xem báo cáo
- [ ] Quản lý ca làm việc
- [ ] Cài đặt thông báo
- [ ] Phân quyền
- [ ] Backup và restore
- [ ] Xuất/nhập dữ liệu
- [ ] API documentation
- [ ] Troubleshooting guide
- [ ] Security best practices

## Files Liên Quan

```
app/help/page.tsx              → Trang chủ trợ giúp
app/help/[slug]/page.tsx       → Trang bài viết động
lib/help-articles.ts           → Metadata bài viết
content/help/*.mdx             → Nội dung bài viết
components/Header.tsx          → Navigation với help link
```

## Dependencies

```json
{
  "next-mdx-remote": "^5.x" // MDX rendering
}
```

## Demo URLs

- Trang chủ: https://diemdanh.net/help
- Bắt đầu: https://diemdanh.net/help/bat-dau
- Điểm danh: https://diemdanh.net/help/diem-danh
- Xếp lịch AI: https://diemdanh.net/help/xep-lich-ai
- Cài đặt app: https://diemdanh.net/help/cai-dat-app
