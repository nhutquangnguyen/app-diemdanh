-- Step 1: Create class_sessions table only
CREATE TABLE IF NOT EXISTS public.class_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,

  -- Session details
  name TEXT NOT NULL,
  description TEXT,
  subject TEXT,

  -- Timing
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  day_of_week INTEGER, -- 0=Sunday, 1=Monday, etc. (NULL = one-time session)

  -- Settings
  color TEXT DEFAULT '#3B82F6',
  grace_period_minutes INTEGER DEFAULT 15,

  -- Metadata
  deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_time_range CHECK (end_time > start_time),
  CONSTRAINT valid_day_of_week CHECK (day_of_week IS NULL OR (day_of_week >= 0 AND day_of_week <= 6)),
  CONSTRAINT valid_grace_period CHECK (grace_period_minutes >= 0)
);

-- Verify it was created
SELECT 'class_sessions created successfully' as status;
