-- Add soft delete support to stores table
-- Run this in Supabase SQL Editor

-- Add deleted_at column to stores table
ALTER TABLE public.stores
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Add index for better query performance when filtering out deleted stores
CREATE INDEX IF NOT EXISTS idx_stores_deleted_at ON public.stores(deleted_at);

-- Update RLS policies to exclude soft-deleted stores
-- Drop old policies
DROP POLICY IF EXISTS "Owners can view their stores" ON public.stores;
DROP POLICY IF EXISTS "Staff can view their store via QR" ON public.stores;

-- Recreate policies with deleted_at filter
CREATE POLICY "Owners can view their stores" ON public.stores
  FOR SELECT USING (auth.uid() = owner_id AND deleted_at IS NULL);

CREATE POLICY "Staff can view their store via QR" ON public.stores
  FOR SELECT USING (deleted_at IS NULL);

-- Note: Keep INSERT, UPDATE, DELETE policies unchanged as they already check ownership
