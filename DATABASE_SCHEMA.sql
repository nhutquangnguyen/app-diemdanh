-- Hệ thống điểm danh cho doanh nghiệp nhỏ
-- Chạy các câu lệnh này trong Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Bảng users (mở rộng từ auth.users của Supabase)
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  role TEXT NOT NULL CHECK (role IN ('owner', 'staff')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Bảng stores (cửa hàng)
CREATE TABLE public.stores (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  owner_id UUID REFERENCES public.profiles(id) NOT NULL,
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
  user_id UUID REFERENCES public.profiles(id),
  store_id UUID REFERENCES public.stores(id) NOT NULL,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Bảng time_slots (ca làm việc)
CREATE TABLE public.time_slots (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  store_id UUID REFERENCES public.stores(id) NOT NULL,
  name TEXT NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  days_of_week INTEGER[] NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Bảng check_ins (điểm danh)
CREATE TABLE public.check_ins (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  staff_id UUID REFERENCES public.staff(id) NOT NULL,
  store_id UUID REFERENCES public.stores(id) NOT NULL,
  check_in_time TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  distance_meters DECIMAL(10, 2) NOT NULL,
  selfie_url TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('success', 'late', 'wrong_location')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Indexes để tăng hiệu suất
CREATE INDEX idx_stores_owner ON public.stores(owner_id);
CREATE INDEX idx_staff_store ON public.staff(store_id);
CREATE INDEX idx_staff_user ON public.staff(user_id);
CREATE INDEX idx_check_ins_staff ON public.check_ins(staff_id);
CREATE INDEX idx_check_ins_store ON public.check_ins(store_id);
CREATE INDEX idx_check_ins_time ON public.check_ins(check_in_time);

-- Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.check_ins ENABLE ROW LEVEL SECURITY;

-- RLS Policies cho profiles
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- RLS Policies cho stores
CREATE POLICY "Owners can view their stores" ON public.stores
  FOR SELECT USING (auth.uid() = owner_id);

CREATE POLICY "Owners can create stores" ON public.stores
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners can update their stores" ON public.stores
  FOR UPDATE USING (auth.uid() = owner_id);

-- RLS Policies cho staff
CREATE POLICY "Store owners can view their staff" ON public.staff
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.stores
      WHERE stores.id = staff.store_id
      AND stores.owner_id = auth.uid()
    )
  );

CREATE POLICY "Store owners can manage staff" ON public.staff
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.stores
      WHERE stores.id = staff.store_id
      AND stores.owner_id = auth.uid()
    )
  );

-- RLS Policies cho check_ins
CREATE POLICY "Store owners can view check-ins" ON public.check_ins
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.stores
      WHERE stores.id = check_ins.store_id
      AND stores.owner_id = auth.uid()
    )
  );

CREATE POLICY "Staff can create check-ins" ON public.check_ins
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.staff
      WHERE staff.id = check_ins.staff_id
      AND staff.user_id = auth.uid()
    )
  );

-- Storage bucket cho selfies
INSERT INTO storage.buckets (id, name, public)
VALUES ('selfies', 'selfies', false);

-- Storage policies
CREATE POLICY "Staff can upload selfies" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'selfies' AND
    auth.role() = 'authenticated'
  );

CREATE POLICY "Store owners can view selfies" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'selfies'
  );
