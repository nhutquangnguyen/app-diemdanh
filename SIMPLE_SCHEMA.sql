-- SIMPLIFIED SCHEMA - No roles, no profiles table
-- Everyone can create stores and check-in

-- Drop old tables if they exist
DROP TABLE IF EXISTS public.check_ins CASCADE;
DROP TABLE IF EXISTS public.time_slots CASCADE;
DROP TABLE IF EXISTS public.staff CASCADE;
DROP TABLE IF EXISTS public.stores CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Bảng stores (cửa hàng/sự kiện)
CREATE TABLE public.stores (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  qr_code TEXT UNIQUE NOT NULL,
  radius_meters INTEGER DEFAULT 50 NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Bảng staff (nhân viên - tự động tạo khi check-in lần đầu)
CREATE TABLE public.staff (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE NOT NULL,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  UNIQUE(email, store_id)
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

-- Indexes
CREATE INDEX idx_stores_owner ON public.stores(owner_id);
CREATE INDEX idx_staff_store ON public.staff(store_id);
CREATE INDEX idx_staff_email ON public.staff(email);
CREATE INDEX idx_check_ins_staff ON public.check_ins(staff_id);
CREATE INDEX idx_check_ins_store ON public.check_ins(store_id);
CREATE INDEX idx_check_ins_time ON public.check_ins(check_in_time);

-- Enable RLS
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.check_ins ENABLE ROW LEVEL SECURITY;

-- STORES policies - ai cũng có thể tạo và xem stores của mình
CREATE POLICY "Anyone can create stores" ON public.stores
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners can view their stores" ON public.stores
  FOR SELECT USING (auth.uid() = owner_id);

CREATE POLICY "Owners can update their stores" ON public.stores
  FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "Owners can delete their stores" ON public.stores
  FOR DELETE USING (auth.uid() = owner_id);

-- STAFF policies - permissive để ai cũng có thể check-in
CREATE POLICY "Anyone can view staff" ON public.staff
  FOR SELECT USING (true);

CREATE POLICY "Anyone can create staff record" ON public.staff
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Store owners can update staff" ON public.staff
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.stores
      WHERE stores.id = staff.store_id
      AND stores.owner_id = auth.uid()
    )
  );

CREATE POLICY "Store owners can delete staff" ON public.staff
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.stores
      WHERE stores.id = staff.store_id
      AND stores.owner_id = auth.uid()
    )
  );

-- CHECK-INS policies
CREATE POLICY "Anyone can create check-ins" ON public.check_ins
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Store owners can view check-ins" ON public.check_ins
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.stores
      WHERE stores.id = check_ins.store_id
      AND stores.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can view their own check-ins" ON public.check_ins
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.staff
      WHERE staff.id = check_ins.staff_id
      AND staff.user_id = auth.uid()
    )
  );

-- Storage bucket cho selfies
INSERT INTO storage.buckets (id, name, public)
VALUES ('selfies', 'selfies', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Storage policies
DROP POLICY IF EXISTS "Anyone can upload selfies" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view selfies" ON storage.objects;

CREATE POLICY "Anyone can upload selfies" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'selfies');

CREATE POLICY "Anyone can view selfies" ON storage.objects
  FOR SELECT USING (bucket_id = 'selfies');
