-- Education Workspace System
-- Adds support for teacher-student attendance tracking alongside business features
-- Run this in Supabase SQL Editor

-- ============================================================================
-- 1. ADD WORKSPACE TYPE TO STORES
-- ============================================================================

-- Add workspace_type column to stores table
ALTER TABLE stores
ADD COLUMN IF NOT EXISTS workspace_type TEXT
DEFAULT 'business' NOT NULL
CHECK (workspace_type IN ('business', 'education'));

-- Set all existing stores to 'business'
UPDATE stores SET workspace_type = 'business' WHERE workspace_type IS NULL;

-- Add education-specific fields to stores
ALTER TABLE stores ADD COLUMN IF NOT EXISTS subject TEXT;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS grade_level TEXT;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS room_number TEXT;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS academic_year TEXT;

-- Make business-specific fields nullable (not required for education workspaces)
ALTER TABLE stores ALTER COLUMN latitude DROP NOT NULL;
ALTER TABLE stores ALTER COLUMN longitude DROP NOT NULL;

COMMENT ON COLUMN stores.workspace_type IS 'Type of workspace: business (store/staff) or education (class/students)';
COMMENT ON COLUMN stores.subject IS 'Subject taught (education workspaces only)';
COMMENT ON COLUMN stores.grade_level IS 'Grade level (education workspaces only)';
COMMENT ON COLUMN stores.room_number IS 'Classroom number (education workspaces only)';
COMMENT ON COLUMN stores.academic_year IS 'Academic year e.g., 2024-2025 (education workspaces only)';

-- ============================================================================
-- 2. CLASSES TABLE (Education Workspaces use stores table with workspace_type='education')
-- We'll use the stores table for classes to reuse existing infrastructure
-- ============================================================================

-- ============================================================================
-- 3. STUDENTS TABLE (Like staff, but for education)
-- ============================================================================

CREATE TABLE IF NOT EXISTS students (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  class_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- NULL if no account yet

  -- Basic Info
  full_name TEXT NOT NULL,
  student_id TEXT,                       -- School student ID (e.g., "SV001")
  email TEXT,
  phone TEXT,

  -- Parent/Guardian Info
  parent_name TEXT,
  parent_email TEXT,
  parent_phone TEXT,

  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'invited', 'inactive', 'withdrawn')),
  enrollment_date DATE DEFAULT CURRENT_DATE,

  -- Invitation System (reuse pattern from staff)
  invitation_token TEXT UNIQUE,
  invitation_expires_at TIMESTAMP WITH TIME ZONE,
  invited_at TIMESTAMP WITH TIME ZONE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_students_class_id ON students(class_id);
CREATE INDEX IF NOT EXISTS idx_students_user_id ON students(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_students_email ON students(email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_students_student_id ON students(student_id) WHERE student_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_students_status ON students(status);

-- Comments
COMMENT ON TABLE students IS 'Students enrolled in education workspaces (classes)';
COMMENT ON COLUMN students.class_id IS 'References stores table where workspace_type=education';
COMMENT ON COLUMN students.user_id IS 'Linked user account (NULL if student has not created account)';
COMMENT ON COLUMN students.student_id IS 'School-issued student ID number';
COMMENT ON COLUMN students.status IS 'active: enrolled, invited: pending signup, inactive: temporarily disabled, withdrawn: left class';

-- ============================================================================
-- 4. CLASS SESSIONS TABLE (Like shift_templates, but for weekly recurring classes)
-- ============================================================================

CREATE TABLE IF NOT EXISTS class_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  class_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,

  -- Session Info
  name TEXT NOT NULL,                    -- "Period 1", "Monday Morning", etc.
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0=Sunday, 1=Monday, ..., 6=Saturday
  start_time TIME NOT NULL,              -- 09:00
  end_time TIME NOT NULL,                -- 10:30

  -- UI
  color TEXT DEFAULT '#3b82f6',          -- Hex color for calendar

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_time_range CHECK (end_time > start_time)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_class_sessions_class_id ON class_sessions(class_id);
CREATE INDEX IF NOT EXISTS idx_class_sessions_day ON class_sessions(day_of_week);

-- Comments
COMMENT ON TABLE class_sessions IS 'Recurring weekly class sessions (like shift templates for education)';
COMMENT ON COLUMN class_sessions.day_of_week IS '0=Sunday, 1=Monday, 2=Tuesday, 3=Wednesday, 4=Thursday, 5=Friday, 6=Saturday';
COMMENT ON COLUMN class_sessions.name IS 'Session name shown to students (e.g., Period 1, Morning Class)';

-- ============================================================================
-- 5. ATTENDANCE RECORDS TABLE (Core attendance tracking for students)
-- ============================================================================

CREATE TABLE IF NOT EXISTS attendance_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  session_id UUID REFERENCES public.class_sessions(id) ON DELETE SET NULL,

  -- Date & Time
  attendance_date DATE NOT NULL,         -- YYYY-MM-DD (which day)
  marked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(), -- When was it marked
  check_in_time TIME,                    -- Actual check-in time (if self-checkin)

  -- Status
  status TEXT NOT NULL DEFAULT 'present' CHECK (status IN ('present', 'absent', 'late', 'excused')),

  -- Who marked it
  marked_by TEXT DEFAULT 'teacher' CHECK (marked_by IN ('teacher', 'student', 'system')),
  marked_by_user_id UUID REFERENCES auth.users(id), -- Which teacher/student marked it

  -- Notes
  note TEXT,                             -- "Sick", "Family emergency", etc.

  -- Edit tracking
  is_edited BOOLEAN DEFAULT false,
  edited_at TIMESTAMP WITH TIME ZONE,
  edited_by UUID REFERENCES auth.users(id),
  edit_reason TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Prevent duplicates: one record per student per day per session
  CONSTRAINT unique_attendance_record UNIQUE (student_id, attendance_date, session_id)
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_attendance_student_id ON attendance_records(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_class_id ON attendance_records(class_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance_records(attendance_date);
CREATE INDEX IF NOT EXISTS idx_attendance_date_class ON attendance_records(class_id, attendance_date);
CREATE INDEX IF NOT EXISTS idx_attendance_status ON attendance_records(status);

-- Comments
COMMENT ON TABLE attendance_records IS 'Daily attendance records for students';
COMMENT ON COLUMN attendance_records.status IS 'present: attended on time, absent: did not attend, late: attended late, excused: excused absence';
COMMENT ON COLUMN attendance_records.marked_by IS 'teacher: marked by teacher, student: self-check-in, system: auto-generated';
COMMENT ON COLUMN attendance_records.check_in_time IS 'Actual time student checked in (for self-check-in mode)';

-- ============================================================================
-- 6. STUDENT NOTES TABLE (Optional - for teacher observations)
-- ============================================================================

CREATE TABLE IF NOT EXISTS student_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  note TEXT NOT NULL,
  note_date DATE DEFAULT CURRENT_DATE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_student_notes_student_id ON student_notes(student_id);
CREATE INDEX IF NOT EXISTS idx_student_notes_class_id ON student_notes(class_id);
CREATE INDEX IF NOT EXISTS idx_student_notes_date ON student_notes(note_date);

COMMENT ON TABLE student_notes IS 'Teacher notes and observations about students';

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_notes ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STUDENTS TABLE RLS
-- ============================================================================

-- Teachers can manage students in their classes
CREATE POLICY "Teachers can view students in their classes"
  ON students FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM stores
      WHERE stores.id = students.class_id
      AND stores.owner_id = auth.uid()
      AND stores.workspace_type = 'education'
    )
  );

CREATE POLICY "Teachers can insert students in their classes"
  ON students FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM stores
      WHERE stores.id = students.class_id
      AND stores.owner_id = auth.uid()
      AND stores.workspace_type = 'education'
    )
  );

CREATE POLICY "Teachers can update students in their classes"
  ON students FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM stores
      WHERE stores.id = students.class_id
      AND stores.owner_id = auth.uid()
      AND stores.workspace_type = 'education'
    )
  );

CREATE POLICY "Teachers can delete students from their classes"
  ON students FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM stores
      WHERE stores.id = students.class_id
      AND stores.owner_id = auth.uid()
      AND stores.workspace_type = 'education'
    )
  );

-- Students can view themselves
CREATE POLICY "Students can view their own profile"
  ON students FOR SELECT
  USING (user_id = auth.uid());

-- ============================================================================
-- CLASS_SESSIONS TABLE RLS
-- ============================================================================

-- Teachers manage sessions in their classes
CREATE POLICY "Teachers can view sessions in their classes"
  ON class_sessions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM stores
      WHERE stores.id = class_sessions.class_id
      AND stores.owner_id = auth.uid()
      AND stores.workspace_type = 'education'
    )
  );

CREATE POLICY "Teachers can insert sessions in their classes"
  ON class_sessions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM stores
      WHERE stores.id = class_sessions.class_id
      AND stores.owner_id = auth.uid()
      AND stores.workspace_type = 'education'
    )
  );

CREATE POLICY "Teachers can update sessions in their classes"
  ON class_sessions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM stores
      WHERE stores.id = class_sessions.class_id
      AND stores.owner_id = auth.uid()
      AND stores.workspace_type = 'education'
    )
  );

CREATE POLICY "Teachers can delete sessions from their classes"
  ON class_sessions FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM stores
      WHERE stores.id = class_sessions.class_id
      AND stores.owner_id = auth.uid()
      AND stores.workspace_type = 'education'
    )
  );

-- Students can view sessions in their classes
CREATE POLICY "Students can view sessions in their classes"
  ON class_sessions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM students
      JOIN stores ON stores.id = students.class_id
      WHERE students.user_id = auth.uid()
      AND class_sessions.class_id = stores.id
      AND stores.workspace_type = 'education'
    )
  );

-- ============================================================================
-- ATTENDANCE_RECORDS TABLE RLS
-- ============================================================================

-- Teachers can manage attendance for their classes
CREATE POLICY "Teachers can view attendance for their classes"
  ON attendance_records FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM stores
      WHERE stores.id = attendance_records.class_id
      AND stores.owner_id = auth.uid()
      AND stores.workspace_type = 'education'
    )
  );

CREATE POLICY "Teachers can insert attendance for their classes"
  ON attendance_records FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM stores
      WHERE stores.id = attendance_records.class_id
      AND stores.owner_id = auth.uid()
      AND stores.workspace_type = 'education'
    )
  );

CREATE POLICY "Teachers can update attendance for their classes"
  ON attendance_records FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM stores
      WHERE stores.id = attendance_records.class_id
      AND stores.owner_id = auth.uid()
      AND stores.workspace_type = 'education'
    )
  );

CREATE POLICY "Teachers can delete attendance for their classes"
  ON attendance_records FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM stores
      WHERE stores.id = attendance_records.class_id
      AND stores.owner_id = auth.uid()
      AND stores.workspace_type = 'education'
    )
  );

-- Students can view their own attendance
CREATE POLICY "Students can view their own attendance"
  ON attendance_records FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM students
      WHERE students.id = attendance_records.student_id
      AND students.user_id = auth.uid()
    )
  );

-- Allow student self-check-in if class allows it
CREATE POLICY "Students can check-in if allowed"
  ON attendance_records FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM students
      JOIN stores ON stores.id = students.class_id
      WHERE students.id = attendance_records.student_id
      AND students.user_id = auth.uid()
      AND stores.selfie_required = false -- Reusing this field to indicate allow_self_checkin
    )
  );

-- ============================================================================
-- STUDENT_NOTES TABLE RLS
-- ============================================================================

-- Teachers can manage notes for their students
CREATE POLICY "Teachers can view notes for their students"
  ON student_notes FOR SELECT
  USING (teacher_id = auth.uid());

CREATE POLICY "Teachers can insert notes for their students"
  ON student_notes FOR INSERT
  WITH CHECK (
    teacher_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM stores
      WHERE stores.id = student_notes.class_id
      AND stores.owner_id = auth.uid()
      AND stores.workspace_type = 'education'
    )
  );

CREATE POLICY "Teachers can update their notes"
  ON student_notes FOR UPDATE
  USING (teacher_id = auth.uid());

CREATE POLICY "Teachers can delete their notes"
  ON student_notes FOR DELETE
  USING (teacher_id = auth.uid());

-- ============================================================================
-- CONFIGURATION FIELDS FOR EDUCATION WORKSPACES
-- ============================================================================

-- Add allow_self_checkin flag (we'll reuse selfie_required field)
-- For education: selfie_required = false means students can self-check-in
-- For business: it means what it says (selfie not required)

-- Add late_threshold_minutes for education (reuse grace_period_minutes from shift_templates concept)
ALTER TABLE stores ADD COLUMN IF NOT EXISTS late_threshold_minutes INTEGER DEFAULT 15;

COMMENT ON COLUMN stores.late_threshold_minutes IS 'For education: minutes after session start to mark as late (default 15)';

-- ============================================================================
-- DONE!
-- ============================================================================

-- Verify tables were created
DO $$
BEGIN
  RAISE NOTICE 'Education workspace migration completed successfully!';
  RAISE NOTICE 'Tables created: students, class_sessions, attendance_records, student_notes';
  RAISE NOTICE 'Updated: stores table with workspace_type and education fields';
END $$;
