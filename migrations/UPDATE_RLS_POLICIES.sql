-- ================================================================
-- UPDATE RLS POLICIES FOR CHECK-IN SYSTEM
-- Run this in Supabase SQL Editor
-- ================================================================

-- ================================================================
-- STORES TABLE POLICIES
-- Allow anyone to read stores (for QR code check-in)
-- Only owner can modify their stores
-- ================================================================

-- Drop existing policies for stores if they exist
DROP POLICY IF EXISTS "Anyone can read stores" ON public.stores;
DROP POLICY IF EXISTS "Users can read stores" ON public.stores;
DROP POLICY IF EXISTS "Only owner can read stores" ON public.stores;
DROP POLICY IF EXISTS "Only owner can insert stores" ON public.stores;
DROP POLICY IF EXISTS "Only owner can update stores" ON public.stores;
DROP POLICY IF EXISTS "Only owner can delete stores" ON public.stores;

-- Allow any authenticated user to read stores (needed for check-in via QR code)
CREATE POLICY "Anyone can read stores"
ON public.stores
FOR SELECT
TO authenticated
USING (true);

-- Only owner can insert their own stores
CREATE POLICY "Only owner can insert stores"
ON public.stores
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = owner_id);

-- Only owner can update their stores
CREATE POLICY "Only owner can update stores"
ON public.stores
FOR UPDATE
TO authenticated
USING (auth.uid() = owner_id)
WITH CHECK (auth.uid() = owner_id);

-- Only owner can delete their stores
CREATE POLICY "Only owner can delete stores"
ON public.stores
FOR DELETE
TO authenticated
USING (auth.uid() = owner_id);

-- ================================================================
-- STAFF TABLE POLICIES
-- Allow anyone to read staff (to check if email is authorized)
-- Only store owner can modify staff
-- ================================================================

-- Drop existing policies for staff if they exist
DROP POLICY IF EXISTS "Anyone can read staff" ON public.staff;
DROP POLICY IF EXISTS "Users can read staff" ON public.staff;
DROP POLICY IF EXISTS "Only store owner can read staff" ON public.staff;
DROP POLICY IF EXISTS "Only store owner can insert staff" ON public.staff;
DROP POLICY IF EXISTS "Only store owner can update staff" ON public.staff;
DROP POLICY IF EXISTS "Only store owner can delete staff" ON public.staff;

-- Allow any authenticated user to read staff (needed to verify authorization)
CREATE POLICY "Anyone can read staff"
ON public.staff
FOR SELECT
TO authenticated
USING (true);

-- Only store owner can insert staff
CREATE POLICY "Only store owner can insert staff"
ON public.staff
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.stores
    WHERE stores.id = staff.store_id
    AND stores.owner_id = auth.uid()
  )
);

-- Only store owner can update staff
CREATE POLICY "Only store owner can update staff"
ON public.staff
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.stores
    WHERE stores.id = staff.store_id
    AND stores.owner_id = auth.uid()
  )
);

-- Only store owner can delete staff
CREATE POLICY "Only store owner can delete staff"
ON public.staff
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.stores
    WHERE stores.id = staff.store_id
    AND stores.owner_id = auth.uid()
  )
);

-- ================================================================
-- CHECK_INS TABLE POLICIES
-- Store owner can read all check-ins for their stores
-- Staff can insert their own check-ins
-- Staff can read their own check-ins
-- ================================================================

-- Drop existing policies for check_ins if they exist
DROP POLICY IF EXISTS "Store owner can read check-ins" ON public.check_ins;
DROP POLICY IF EXISTS "Staff can read own check-ins" ON public.check_ins;
DROP POLICY IF EXISTS "Staff can insert check-ins" ON public.check_ins;
DROP POLICY IF EXISTS "Staff can update own check-ins" ON public.check_ins;

-- Store owner can read all check-ins for their stores
CREATE POLICY "Store owner can read check-ins"
ON public.check_ins
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.stores
    WHERE stores.id = check_ins.store_id
    AND stores.owner_id = auth.uid()
  )
);

-- Staff can read their own check-ins
CREATE POLICY "Staff can read own check-ins"
ON public.check_ins
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.staff
    WHERE staff.id = check_ins.staff_id
    AND staff.email = auth.email()
  )
);

-- Anyone can insert check-ins (will be validated by staff table)
CREATE POLICY "Staff can insert check-ins"
ON public.check_ins
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Staff can update their own check-ins (for check-out)
CREATE POLICY "Staff can update own check-ins"
ON public.check_ins
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.staff
    WHERE staff.id = check_ins.staff_id
    AND staff.email = auth.email()
  )
);

-- ================================================================
-- VERIFICATION
-- ================================================================

-- Verify all policies are created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('stores', 'staff', 'check_ins')
ORDER BY tablename, policyname;
