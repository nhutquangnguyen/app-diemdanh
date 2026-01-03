-- Hệ thống điểm danh cho doanh nghiệp nhỏ (PHIÊN BẢN ĐƠN GIẢN - KHÔNG CẦN AUTH)
-- Chạy các câu lệnh này trong Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Bảng stores (cửa hàng)
CREATE TABLE public.stores (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  qr_code TEXT UNIQUE NOT NULL,
  radius_meters INTEGER DEFAULT 50 NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Bảng staff (nhân viên)
CREATE TABLE public.staff (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE NOT NULL,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  UNIQUE(email, store_id)
);

-- Bảng time_slots (ca làm việc)
CREATE TABLE public.time_slots (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  days_of_week INTEGER[] NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Bảng check_ins (điểm danh)
CREATE TABLE public.check_ins (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  staff_id UUID REFERENCES public.staff(id) ON DELETE CASCADE NOT NULL,
  store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE NOT NULL,
  check_in_time TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  distance_meters DECIMAL(10, 2) NOT NULL,
  selfie_url TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('success', 'late', 'wrong_location')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Indexes để tăng hiệu suất
CREATE INDEX idx_staff_store ON public.staff(store_id);
CREATE INDEX idx_staff_email ON public.staff(email);
CREATE INDEX idx_check_ins_staff ON public.check_ins(staff_id);
CREATE INDEX idx_check_ins_store ON public.check_ins(store_id);
CREATE INDEX idx_check_ins_time ON public.check_ins(check_in_time);

-- Row Level Security (RLS) - BẬT NHƯNG CHO PHÉP TẤT CẢ (cho development/testing)
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.check_ins ENABLE ROW LEVEL SECURITY;

-- Policies cho phép tất cả mọi người (DEVELOPMENT MODE - KHÔNG AN TOÀN CHO PRODUCTION)
-- Stores
CREATE POLICY "Allow all on stores" ON public.stores FOR ALL USING (true) WITH CHECK (true);

-- Staff
CREATE POLICY "Allow all on staff" ON public.staff FOR ALL USING (true) WITH CHECK (true);

-- Time slots
CREATE POLICY "Allow all on time_slots" ON public.time_slots FOR ALL USING (true) WITH CHECK (true);

-- Check-ins
CREATE POLICY "Allow all on check_ins" ON public.check_ins FOR ALL USING (true) WITH CHECK (true);

-- Storage bucket cho selfies
INSERT INTO storage.buckets (id, name, public)
VALUES ('selfies', 'selfies', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies - CHO PHÉP TẤT CẢ
CREATE POLICY "Allow all uploads to selfies" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'selfies');

CREATE POLICY "Allow all to view selfies" ON storage.objects
  FOR SELECT USING (bucket_id = 'selfies');

CREATE POLICY "Allow all to delete selfies" ON storage.objects
  FOR DELETE USING (bucket_id = 'selfies');

-- QUAN TRỌNG: Đây là phiên bản đơn giản cho development/testing
-- Khi deploy production, cần thêm authentication và chỉnh lại policies!
