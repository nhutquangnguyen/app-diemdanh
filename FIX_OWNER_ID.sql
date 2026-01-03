-- Fix owner_id constraint - make it optional since we don't have auth
ALTER TABLE public.stores ALTER COLUMN owner_id DROP NOT NULL;

-- Or if you want to remove the column entirely:
-- ALTER TABLE public.stores DROP COLUMN IF EXISTS owner_id;
