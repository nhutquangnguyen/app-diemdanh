-- Add DELETE policy for staff table
-- Run this in Supabase SQL Editor

CREATE POLICY "Store owners can delete staff" ON public.staff
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.stores
      WHERE stores.id = staff.store_id
      AND stores.owner_id = auth.uid()
    )
  );
