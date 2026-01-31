-- ==========================================
-- CREATE EDUCATION-SPECIFIC TABLES
-- ==========================================
-- This migration creates dedicated tables for education workspaces
-- Replaces the need for class_id columns in business tables
--
-- Education workspace structure:
-- stores (workspace_type = 'education')
--   ├── students (instead of staff)
--   ├── class_sessions (instead of shift_templates)
--   ├── attendance_records (instead of check_ins)
--   └── session_schedules (instead of staff_schedules)
-- ==========================================

-- ==========================================
-- 0. ENSURE PREREQUISITE COLUMNS EXIST
-- ==========================================
-- Add deleted_at columns to stores and students if they don't exist
-- These are needed for RLS policies below

-- Stores table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'stores'
    AND column_name = 'deleted_at'
  ) THEN
    ALTER TABLE public.stores ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;
  END IF;
END $$;

-- Students table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'students'
    AND column_name = 'deleted_at'
  ) THEN
    ALTER TABLE public.students ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;
  END IF;
END $$;

-- ==========================================
-- 1. CLASS SESSIONS (replaces shift_templates for education)
-- ==========================================
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

-- Indexes
CREATE INDEX IF NOT EXISTS idx_class_sessions_class_id ON public.class_sessions(class_id);
CREATE INDEX IF NOT EXISTS idx_class_sessions_deleted_at ON public.class_sessions(deleted_at);
CREATE INDEX IF NOT EXISTS idx_class_sessions_day_of_week ON public.class_sessions(day_of_week);

-- Comments
COMMENT ON TABLE public.class_sessions IS 'Class session templates for education workspaces (equivalent to shift_templates for business)';
COMMENT ON COLUMN public.class_sessions.class_id IS 'Reference to the class (stores table with workspace_type=education)';
COMMENT ON COLUMN public.class_sessions.day_of_week IS '0=Sunday, 1=Monday, ..., 6=Saturday. NULL for one-time sessions';

-- ==========================================
-- 2. ATTENDANCE RECORDS (replaces check_ins for education)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.attendance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  session_id UUID REFERENCES public.class_sessions(id) ON DELETE SET NULL,

  -- Check-in details
  check_in_time TIMESTAMP WITH TIME ZONE NOT NULL,
  check_out_time TIMESTAMP WITH TIME ZONE,

  -- Status
  status TEXT DEFAULT 'present', -- present, late, absent, excused
  is_late BOOLEAN DEFAULT FALSE,

  -- Location & verification
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  selfie_url TEXT,

  -- Notes
  notes TEXT,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_status CHECK (status IN ('present', 'late', 'absent', 'excused')),
  CONSTRAINT valid_checkout CHECK (check_out_time IS NULL OR check_out_time > check_in_time)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_attendance_records_class_id ON public.attendance_records(class_id);
CREATE INDEX IF NOT EXISTS idx_attendance_records_student_id ON public.attendance_records(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_records_session_id ON public.attendance_records(session_id);
CREATE INDEX IF NOT EXISTS idx_attendance_records_check_in_time ON public.attendance_records(check_in_time);
CREATE INDEX IF NOT EXISTS idx_attendance_records_status ON public.attendance_records(status);

-- Comments
COMMENT ON TABLE public.attendance_records IS 'Student attendance records for education workspaces (equivalent to check_ins for business)';
COMMENT ON COLUMN public.attendance_records.status IS 'Attendance status: present, late, absent, excused';

-- ==========================================
-- 3. SESSION SCHEDULES (replaces staff_schedules for education)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.session_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES public.class_sessions(id) ON DELETE CASCADE,
  student_id UUID REFERENCES public.students(id) ON DELETE SET NULL,

  -- Schedule details
  scheduled_date DATE NOT NULL,

  -- Optional: Override session details for this specific schedule
  override_start_time TIME,
  override_end_time TIME,
  notes TEXT,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Prevent duplicate schedules
  CONSTRAINT unique_session_date_student UNIQUE (session_id, scheduled_date, student_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_session_schedules_class_id ON public.session_schedules(class_id);
CREATE INDEX IF NOT EXISTS idx_session_schedules_session_id ON public.session_schedules(session_id);
CREATE INDEX IF NOT EXISTS idx_session_schedules_student_id ON public.session_schedules(student_id);
CREATE INDEX IF NOT EXISTS idx_session_schedules_date ON public.session_schedules(scheduled_date);

-- Comments
COMMENT ON TABLE public.session_schedules IS 'Scheduled class sessions for education workspaces (equivalent to staff_schedules for business)';

-- ==========================================
-- 4. RLS POLICIES
-- ==========================================

-- Class Sessions RLS
ALTER TABLE public.class_sessions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Teachers can manage their class sessions" ON public.class_sessions;
DROP POLICY IF EXISTS "Students can view their class sessions" ON public.class_sessions;

CREATE POLICY "Teachers can manage their class sessions"
  ON public.class_sessions
  FOR ALL
  USING (
    class_id IN (
      SELECT id FROM stores WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Students can view their class sessions"
  ON public.class_sessions
  FOR SELECT
  USING (
    class_id IN (
      SELECT class_id FROM students WHERE user_id = auth.uid() AND status = 'active'
    )
    AND deleted_at IS NULL
  );

-- Attendance Records RLS
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Teachers can manage attendance records" ON public.attendance_records;
DROP POLICY IF EXISTS "Students can view their own attendance" ON public.attendance_records;
DROP POLICY IF EXISTS "Students can create their own attendance records" ON public.attendance_records;

CREATE POLICY "Teachers can manage attendance records"
  ON public.attendance_records
  FOR ALL
  USING (
    class_id IN (
      SELECT id FROM stores WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Students can view their own attendance"
  ON public.attendance_records
  FOR SELECT
  USING (
    student_id IN (
      SELECT id FROM students WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Students can create their own attendance records"
  ON public.attendance_records
  FOR INSERT
  WITH CHECK (
    student_id IN (
      SELECT id FROM students WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- Session Schedules RLS
ALTER TABLE public.session_schedules ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Teachers can manage session schedules" ON public.session_schedules;
DROP POLICY IF EXISTS "Students can view their schedules" ON public.session_schedules;

CREATE POLICY "Teachers can manage session schedules"
  ON public.session_schedules
  FOR ALL
  USING (
    class_id IN (
      SELECT id FROM stores WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Students can view their schedules"
  ON public.session_schedules
  FOR SELECT
  USING (
    student_id IN (
      SELECT id FROM students WHERE user_id = auth.uid() AND status = 'active'
    )
    OR student_id IS NULL -- Allow viewing class-wide schedules
  );

-- ==========================================
-- 5. TRIGGERS FOR updated_at
-- ==========================================

-- Class Sessions
CREATE OR REPLACE FUNCTION update_class_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_class_sessions_updated_at
  BEFORE UPDATE ON public.class_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_class_sessions_updated_at();

-- Attendance Records
CREATE OR REPLACE FUNCTION update_attendance_records_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_attendance_records_updated_at
  BEFORE UPDATE ON public.attendance_records
  FOR EACH ROW
  EXECUTE FUNCTION update_attendance_records_updated_at();

-- Session Schedules
CREATE OR REPLACE FUNCTION update_session_schedules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_session_schedules_updated_at
  BEFORE UPDATE ON public.session_schedules
  FOR EACH ROW
  EXECUTE FUNCTION update_session_schedules_updated_at();

-- ==========================================
-- 6. VERIFICATION QUERIES
-- ==========================================

-- Run these to verify the tables were created:

-- SELECT table_name, column_name, data_type
-- FROM information_schema.columns
-- WHERE table_name IN ('class_sessions', 'attendance_records', 'session_schedules')
--   AND table_schema = 'public'
-- ORDER BY table_name, ordinal_position;

-- SELECT
--   schemaname,
--   tablename,
--   policyname,
--   permissive,
--   roles,
--   cmd
-- FROM pg_policies
-- WHERE tablename IN ('class_sessions', 'attendance_records', 'session_schedules')
-- ORDER BY tablename, policyname;

-- ==========================================
-- DONE! Education tables are ready
-- ==========================================
