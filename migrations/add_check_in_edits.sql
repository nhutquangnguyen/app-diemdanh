-- Migration: Add check_in_edits table for audit trail
-- Run this in Supabase SQL Editor
-- This script is idempotent and safe to run multiple times

-- Create check_in_edits table (if not exists)
CREATE TABLE IF NOT EXISTS public.check_in_edits (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  check_in_id UUID REFERENCES public.check_ins(id) ON DELETE CASCADE NOT NULL,
  field_changed TEXT NOT NULL CHECK (field_changed IN ('check_in_time', 'check_out_time', 'both')),
  old_check_in_time TIMESTAMP WITH TIME ZONE,
  new_check_in_time TIMESTAMP WITH TIME ZONE,
  old_check_out_time TIMESTAMP WITH TIME ZONE,
  new_check_out_time TIMESTAMP WITH TIME ZONE,
  reason TEXT NOT NULL,
  photo_proof_url TEXT,
  edited_by UUID REFERENCES auth.users(id) NOT NULL,
  edited_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Add indexes for performance (if not exists)
CREATE INDEX IF NOT EXISTS idx_check_in_edits_check_in ON public.check_in_edits(check_in_id);
CREATE INDEX IF NOT EXISTS idx_check_in_edits_edited_by ON public.check_in_edits(edited_by);

-- Enable RLS
ALTER TABLE public.check_in_edits ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Store owners can view check-in edits" ON public.check_in_edits;
DROP POLICY IF EXISTS "Store owners can create check-in edits" ON public.check_in_edits;

-- RLS Policy: Store owners can view edit history for their stores
CREATE POLICY "Store owners can view check-in edits" ON public.check_in_edits
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.check_ins
      JOIN public.stores ON stores.id = check_ins.store_id
      WHERE check_ins.id = check_in_edits.check_in_id
      AND stores.owner_id = auth.uid()
    )
  );

-- RLS Policy: Store owners can create edit records
CREATE POLICY "Store owners can create check-in edits" ON public.check_in_edits
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.check_ins
      JOIN public.stores ON stores.id = check_ins.store_id
      WHERE check_ins.id = check_in_edits.check_in_id
      AND stores.owner_id = auth.uid()
    )
  );

-- Add is_edited flag to check_ins table for quick lookup
ALTER TABLE public.check_ins ADD COLUMN IF NOT EXISTS is_edited BOOLEAN DEFAULT false;
ALTER TABLE public.check_ins ADD COLUMN IF NOT EXISTS edit_reason TEXT;
ALTER TABLE public.check_ins ADD COLUMN IF NOT EXISTS edited_by UUID REFERENCES auth.users(id);
ALTER TABLE public.check_ins ADD COLUMN IF NOT EXISTS edited_at TIMESTAMP WITH TIME ZONE;

-- Create index for edited check-ins (if not exists)
CREATE INDEX IF NOT EXISTS idx_check_ins_edited ON public.check_ins(is_edited) WHERE is_edited = true;
