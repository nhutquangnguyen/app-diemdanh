# Tổng Quan Dự Án - Simple Check-in System

## Mô Tả Tổng Quan

Hệ thống điểm danh hiện đại cho doanh nghiệp nhỏ tại Việt Nam. Giao diện hoàn toàn bằng tiếng Việt, dễ sử dụng cho cả chủ cửa hàng và nhân viên.

## Công Nghệ Stack

| Công nghệ | Phiên bản | Mục đích |
|-----------|-----------|----------|
| Next.js | 16.1.1 | React framework |
| React | 19.2.3 | UI library |
| TypeScript | 5.9.3 | Type safety |
| Tailwind CSS | 4.1.18 | Styling |
| Supabase | 2.89.0 | Backend, Database, Storage |
| react-qr-code | 2.0.18 | Tạo QR code |
| html5-qrcode | 2.3.8 | Quét QR code |
| react-webcam | 7.2.0 | Camera/Selfie |

## Kiến Trúc Hệ Thống

```
┌─────────────────────────────────────────────┐
│           Frontend (Next.js)                 │
│  ┌──────────────┐      ┌─────────────────┐  │
│  │  Owner App   │      │    Staff App    │  │
│  │  - Dashboard │      │  - QR Scanner   │  │
│  │  - QR Gen    │      │  - Selfie Cam   │  │
│  │  - Reports   │      │  - Check-in     │  │
│  └──────────────┘      └─────────────────┘  │
└───────────────┬─────────────────────────────┘
                │
                │ Supabase Client
                ▼
┌─────────────────────────────────────────────┐
│          Supabase Backend                    │
│  ┌──────────────────────────────────────┐   │
│  │  PostgreSQL Database                 │   │
│  │  - profiles                          │   │
│  │  - stores                            │   │
│  │  - staff                             │   │
│  │  - check_ins                         │   │
│  │  - time_slots                        │   │
│  └──────────────────────────────────────┘   │
│  ┌──────────────────────────────────────┐   │
│  │  Storage                             │   │
│  │  - selfies bucket                    │   │
│  └──────────────────────────────────────┘   │
│  ┌──────────────────────────────────────┐   │
│  │  Row Level Security (RLS)            │   │
│  │  - Access control policies           │   │
│  └──────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
```

## Database Schema

### profiles
Mở rộng từ `auth.users` của Supabase
- `id` (UUID, PK)
- `email` (TEXT, UNIQUE)
- `full_name` (TEXT)
- `phone` (TEXT)
- `role` (TEXT: 'owner' | 'staff')
- Timestamps

### stores
Thông tin cửa hàng
- `id` (UUID, PK)
- `owner_id` (UUID, FK -> profiles)
- `name` (TEXT)
- `address` (TEXT)
- `latitude` (DECIMAL)
- `longitude` (DECIMAL)
- `qr_code` (TEXT, UNIQUE)
- `radius_meters` (INTEGER, default: 50)
- Timestamps

### staff
Danh sách nhân viên
- `id` (UUID, PK)
- `user_id` (UUID, FK -> profiles)
- `store_id` (UUID, FK -> stores)
- `email` (TEXT)
- `full_name` (TEXT)
- `phone` (TEXT)
- `is_active` (BOOLEAN)
- Timestamps

### check_ins
Lịch sử điểm danh
- `id` (UUID, PK)
- `staff_id` (UUID, FK -> staff)
- `store_id` (UUID, FK -> stores)
- `check_in_time` (TIMESTAMP)
- `latitude` (DECIMAL)
- `longitude` (DECIMAL)
- `distance_meters` (DECIMAL)
- `selfie_url` (TEXT)
- `status` (TEXT: 'success' | 'late' | 'wrong_location')
- Timestamps

### time_slots
Ca làm việc (feature mở rộng)
- `id` (UUID, PK)
- `store_id` (UUID, FK -> stores)
- `name` (TEXT)
- `start_time` (TIME)
- `end_time` (TIME)
- `days_of_week` (INTEGER[])
- Timestamps

## Tính Năng Chính

### 1. Owner Features (Chủ Cửa Hàng)

#### Tạo Cửa Hàng
- Form nhập thông tin cơ bản
- Lấy GPS tự động từ vị trí hiện tại
- Tạo mã QR tự động
- Thiết lập bán kính cho phép (10-500m)

**Files**:
- `/app/owner/create-store/page.tsx`
- `/utils/location.ts`

#### Dashboard
- Xem danh sách cửa hàng
- Quick access tới từng cửa hàng
- Statistics overview

**Files**:
- `/app/owner/page.tsx`

#### Chi Tiết Cửa Hàng
**Tab 1: Mã QR**
- Hiển thị QR code lớn
- Download QR as PNG
- In mã QR để dán tại cửa hàng

**Tab 2: Lịch Sử Điểm Danh**
- Xem 50 check-in gần nhất
- Hiển thị selfie thumbnail
- Thời gian, khoảng cách
- Status badge (success/late/wrong_location)

**Tab 3: Quản Lý Nhân Viên**
- Danh sách nhân viên
- Thêm/Xóa nhân viên
- View thông tin chi tiết

**Files**:
- `/app/owner/stores/[id]/page.tsx`

### 2. Staff Features (Nhân Viên)

#### QR Scanner
- Camera interface dễ dùng
- Tự động scan và chuyển trang
- Error handling khi scan fail

**Files**:
- `/app/staff/page.tsx`

#### Check-in Flow
**Step 1: Thông tin nhân viên**
- Nhập họ tên, email, số điện thoại
- Validate input
- Hiển thị thông tin cửa hàng

**Step 2: Chụp Selfie**
- Webcam interface
- Preview trước khi submit
- Chụp lại nếu không hài lòng

**Step 3: Xử lý**
- Lấy GPS location
- Tính khoảng cách đến cửa hàng
- Kiểm tra trong bán kính
- Upload selfie to Supabase Storage
- Tạo check-in record

**Step 4: Kết quả**
- Success: Hiển thị thông báo thành công
- Error: Hiển thị lỗi cụ thể (GPS, khoảng cách, upload, etc.)

**Files**:
- `/app/staff/checkin/page.tsx`

## Utilities

### Location Utils (`/utils/location.ts`)

#### calculateDistance()
Tính khoảng cách giữa 2 điểm GPS theo công thức Haversine
```typescript
calculateDistance(lat1, lon1, lat2, lon2): number
```
Returns: Khoảng cách tính bằng mét

#### isWithinRadius()
Kiểm tra vị trí có trong bán kính
```typescript
isWithinRadius(currentLat, currentLon, storeLat, storeLon, radius): boolean
```

#### getCurrentLocation()
Lấy vị trí GPS hiện tại
```typescript
getCurrentLocation(): Promise<{latitude, longitude} | null>
```

## Security

### Row Level Security (RLS)

1. **profiles**: Users chỉ xem/sửa profile của mình
2. **stores**: Owners chỉ xem/sửa stores của mình
3. **staff**: Owners xem staff của stores mình sở hữu
4. **check_ins**:
   - Owners xem check-ins của stores mình
   - Staff tạo check-ins cho chính mình

### Storage Policies

1. **selfies bucket**:
   - Staff upload được selfies
   - Owners xem được tất cả selfies
   - Private bucket (không public)

## UI/UX Design

### Design System

**Colors**:
- Primary: Blue (#0ea5e9 và variants)
- Success: Green (#10b981)
- Error: Red (#ef4444)
- Warning: Yellow (#f59e0b)

**Typography**:
- Font: System fonts (antialiased)
- Headings: Bold, 2xl-5xl
- Body: Regular, sm-lg

**Components**:
- Cards: Rounded-lg, shadow-lg, hover effects
- Buttons: Rounded-lg, font-semibold, transition-all
- Forms: Focus ring, border transitions
- Icons: Heroicons (stroke)

### Responsive Design
- Mobile-first approach
- Grid layout: md:grid-cols-2, lg:grid-cols-3
- Padding responsive: px-4 sm:px-6 lg:px-8

### Vietnamese Language
- Tất cả text đều tiếng Việt
- Có dấu đầy đủ
- Ngôn ngữ thân thiện, dễ hiểu

## File Structure

```
simple-checkin/
├── app/
│   ├── owner/
│   │   ├── page.tsx                    # Owner dashboard
│   │   ├── create-store/
│   │   │   └── page.tsx               # Create store form
│   │   └── stores/
│   │       └── [id]/
│   │           └── page.tsx           # Store detail with tabs
│   ├── staff/
│   │   ├── page.tsx                   # QR scanner
│   │   └── checkin/
│   │       └── page.tsx               # Check-in flow
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx                       # Homepage
├── lib/
│   └── supabase.ts                    # Supabase client
├── types/
│   └── index.ts                       # TypeScript types
├── utils/
│   └── location.ts                    # GPS utilities
├── DATABASE_SCHEMA.sql                # Database setup
├── SETUP_GUIDE.md                     # Setup instructions
├── README.md                          # Main documentation
└── PROJECT_SUMMARY.md                 # This file
```

## Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=              # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=         # Supabase anon key
```

## Deployment

### Development
```bash
npm run dev
# http://localhost:3000
```

### Production Build
```bash
npm run build
npm start
```

### Deploy to Vercel
1. Push to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy

## Tính Năng Cần Mở Rộng

1. **Authentication**
   - [ ] Supabase Auth integration
   - [ ] Email verification
   - [ ] Password reset
   - [ ] OAuth (Google, Facebook)

2. **Time Slots Management**
   - [ ] Tạo ca làm việc
   - [ ] Assign staff to shifts
   - [ ] Late detection based on shifts

3. **Reporting**
   - [ ] Daily/Weekly/Monthly reports
   - [ ] Export to Excel
   - [ ] Charts and graphs
   - [ ] Attendance statistics

4. **Notifications**
   - [ ] Email notifications
   - [ ] SMS notifications
   - [ ] Push notifications
   - [ ] Late alerts

5. **Advanced Features**
   - [ ] Face recognition
   - [ ] Multiple check-in/out per day
   - [ ] Overtime tracking
   - [ ] Leave management
   - [ ] Payroll integration

6. **Mobile Apps**
   - [ ] React Native app
   - [ ] Offline support
   - [ ] Better camera experience

## Performance Optimizations

1. **Implemented**:
   - Next.js App Router with server components
   - Image optimization ready
   - Tailwind CSS purging
   - TypeScript for type safety

2. **Recommended**:
   - Add Redis caching
   - CDN for static assets
   - Database query optimization
   - Image lazy loading

## Testing Checklist

- [ ] Owner can create store with GPS
- [ ] QR code generates and downloads
- [ ] Staff can scan QR code
- [ ] Camera/webcam works
- [ ] GPS location works
- [ ] Distance calculation accurate
- [ ] Selfie uploads to Supabase
- [ ] Check-in record created
- [ ] Check-in appears in owner dashboard
- [ ] RLS policies work correctly
- [ ] Mobile responsive
- [ ] Error handling works

## Known Limitations

1. **No Authentication**: Hiện tại chưa có login/register
2. **No Real-time**: Check-ins không update real-time
3. **No Offline**: Cần internet để hoạt động
4. **Browser Only**: Chưa có mobile app
5. **Basic Reports**: Chưa có reports chi tiết

## Credits

Built with:
- Next.js + React + TypeScript
- Tailwind CSS
- Supabase
- Various open-source libraries

---

Made for Vietnamese small businesses 🇻🇳
