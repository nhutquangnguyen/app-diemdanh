-- Restore proper RLS policies WITH authentication
-- Run this after setting up auth

-- Drop all permissive policies
DROP POLICY IF EXISTS "Allow all on stores" ON public.stores;
DROP POLICY IF EXISTS "Allow all on staff" ON public.staff;
DROP POLICY IF EXISTS "Allow all on check_ins" ON public.check_ins;
DROP POLICY IF EXISTS "Allow all on time_slots" ON public.time_slots;
DROP POLICY IF EXISTS "Allow all on profiles" ON public.profiles;

-- PROFILES policies
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- STORES policies
CREATE POLICY "Owners can view their stores" ON public.stores
  FOR SELECT USING (auth.uid() = owner_id);

CREATE POLICY "Owners can create stores" ON public.stores
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners can update their stores" ON public.stores
  FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "Owners can delete their stores" ON public.stores
  FOR DELETE USING (auth.uid() = owner_id);

-- STAFF policies
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

-- CHECK-INS policies
CREATE POLICY "Store owners can view check-ins" ON public.check_ins
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.stores
      WHERE stores.id = check_ins.store_id
      AND stores.owner_id = auth.uid()
    )
  );

CREATE POLICY "Anyone can create check-ins" ON public.check_ins
  FOR INSERT WITH CHECK (true);

-- TIME SLOTS policies (if needed)
CREATE POLICY "Store owners can manage time slots" ON public.time_slots
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.stores
      WHERE stores.id = time_slots.store_id
      AND stores.owner_id = auth.uid()
    )
  );

-- STORAGE policies remain permissive for now
-- (You can tighten these later based on your needs)
