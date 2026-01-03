-- CHẠY FILE NÀY ĐỂ SỬA LỖI RLS (Row Level Security)
-- Nếu bạn gặp lỗi "new row violates row-level security policy"

-- Xóa tất cả policies cũ
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Owners can view their stores" ON public.stores;
DROP POLICY IF EXISTS "Owners can create stores" ON public.stores;
DROP POLICY IF EXISTS "Owners can update their stores" ON public.stores;
DROP POLICY IF EXISTS "Store owners can view their staff" ON public.staff;
DROP POLICY IF EXISTS "Store owners can manage staff" ON public.staff;
DROP POLICY IF EXISTS "Store owners can view check-ins" ON public.check_ins;
DROP POLICY IF EXISTS "Staff can create check-ins" ON public.check_ins;
DROP POLICY IF EXISTS "Staff can upload selfies" ON storage.objects;
DROP POLICY IF EXISTS "Store owners can view selfies" ON storage.objects;

-- Tạo policies mới cho phép tất cả (DEVELOPMENT MODE)
-- STORES
CREATE POLICY "Allow all on stores" ON public.stores
  FOR ALL USING (true) WITH CHECK (true);

-- STAFF
CREATE POLICY "Allow all on staff" ON public.staff
  FOR ALL USING (true) WITH CHECK (true);

-- CHECK-INS
CREATE POLICY "Allow all on check_ins" ON public.check_ins
  FOR ALL USING (true) WITH CHECK (true);

-- TIME SLOTS (nếu có)
DROP POLICY IF EXISTS "Allow all on time_slots" ON public.time_slots;
CREATE POLICY "Allow all on time_slots" ON public.time_slots
  FOR ALL USING (true) WITH CHECK (true);

-- PROFILES (nếu có)
DROP POLICY IF EXISTS "Allow all on profiles" ON public.profiles;
CREATE POLICY "Allow all on profiles" ON public.profiles
  FOR ALL USING (true) WITH CHECK (true);

-- STORAGE POLICIES
DROP POLICY IF EXISTS "Allow all uploads to selfies" ON storage.objects;
DROP POLICY IF EXISTS "Allow all to view selfies" ON storage.objects;
DROP POLICY IF EXISTS "Allow all to delete selfies" ON storage.objects;

CREATE POLICY "Allow all uploads to selfies" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'selfies');

CREATE POLICY "Allow all to view selfies" ON storage.objects
  FOR SELECT USING (bucket_id = 'selfies');

CREATE POLICY "Allow all to delete selfies" ON storage.objects
  FOR DELETE USING (bucket_id = 'selfies');

-- Đảm bảo bucket selfies là public để dễ xem ảnh
UPDATE storage.buckets SET public = true WHERE id = 'selfies';

-- HOÀN TẤT!
-- Policies hiện cho phép tất cả mọi người truy cập (không an toàn cho production)
-- Khi deploy production, cần thêm authentication!
