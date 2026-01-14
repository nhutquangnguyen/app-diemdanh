-- Migration: Add staff invitation system
-- Run this in Supabase SQL Editor

-- Add new columns to staff table for invitation system
ALTER TABLE public.staff
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'invited', 'expired', 'inactive')),
ADD COLUMN IF NOT EXISTS invited_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS invitation_token VARCHAR(255) UNIQUE,
ADD COLUMN IF NOT EXISTS invitation_expires_at TIMESTAMP WITH TIME ZONE;

-- Make user_id nullable (for invited users who haven't signed up yet)
ALTER TABLE public.staff ALTER COLUMN user_id DROP NOT NULL;

-- Make full_name nullable initially (will be populated when they sign up)
ALTER TABLE public.staff ALTER COLUMN full_name DROP NOT NULL;

-- Add index for invitation token lookups
CREATE INDEX IF NOT EXISTS idx_staff_invitation_token ON public.staff(invitation_token);

-- Add index for status filtering
CREATE INDEX IF NOT EXISTS idx_staff_status ON public.staff(status);

-- Update existing staff records to have 'active' status
UPDATE public.staff
SET status = 'active'
WHERE status IS NULL AND user_id IS NOT NULL;

-- Add comment
COMMENT ON COLUMN public.staff.status IS 'Staff status: active (working), invited (pending signup), expired (invitation expired), inactive (deactivated)';
COMMENT ON COLUMN public.staff.invitation_token IS 'Unique token for invitation acceptance';
COMMENT ON COLUMN public.staff.invited_at IS 'Timestamp when invitation was sent';
COMMENT ON COLUMN public.staff.invitation_expires_at IS 'Timestamp when invitation expires';
