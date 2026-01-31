# Implementation Guide: Separate Tables for Education Workspaces

## ✅ What Was Done

### 1. Created Education-Specific Tables
- **`class_sessions`** - Replaces `shift_templates` for education
- **`attendance_records`** - Replaces `check_ins` for education
- **`session_schedules`** - Replaces `staff_schedules` for education
- **`students`** - Already existed, now dedicated to education

### 2. Updated Plugin Adapters
- ✅ **Education Adapter** - Now uses `class_id` and education tables
- ✅ **Business Adapter** - Explicitly uses `store_id` and business tables

### 3. Updated AttendanceFeature
- ✅ Now reads `workspaceIdField` from adapter
- ✅ Dynamically uses correct field name based on workspace type

---

## 🚀 How to Implement

### Step 1: Run the Migration

Open **Supabase SQL Editor** and run:

```sql
-- File: migrations/create_education_tables.sql
```

Or copy the contents from `/migrations/create_education_tables.sql`

**What this does:**
- Creates 3 new tables: `class_sessions`, `attendance_records`, `session_schedules`
- Adds indexes for performance
- Sets up RLS policies
- Adds triggers for `updated_at`

**Time:** ~1 minute

---

### Step 2: Run the Soft Delete Migration (If Not Done)

```sql
-- Add soft delete to existing tables
ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;
CREATE INDEX IF NOT EXISTS idx_staff_deleted_at ON public.staff(deleted_at);

ALTER TABLE public.shift_templates ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;
CREATE INDEX IF NOT EXISTS idx_shift_templates_deleted_at ON public.shift_templates(deleted_at);

ALTER TABLE public.students ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;
CREATE INDEX IF NOT EXISTS idx_students_deleted_at ON public.students(deleted_at);
```

---

### Step 3: Test Your App

1. **Reload your app**
2. **Test Business Workspace:**
   - Open a business workspace
   - Go to "Today" tab
   - Should load staff from `staff` table with `store_id`
   - Should load shifts from `shift_templates` table

3. **Test Education Workspace:**
   - Open an education workspace
   - Go to "Today" tab
   - Should load students from `students` table with `class_id`
   - Should load sessions from `class_sessions` table

---

## 📊 Database Structure

### Business Workspace

```
stores (id: abc-123, workspace_type: 'business')
│
├── staff (store_id: abc-123)
│   └── John Doe, Jane Smith...
│
├── shift_templates (store_id: abc-123)
│   └── Morning Shift 8AM-5PM, Evening Shift...
│
├── check_ins (store_id: abc-123)
│   └── John checked in at 8:05 AM...
│
└── staff_schedules (store_id: abc-123)
    └── John scheduled for Morning Shift on 2026-02-01
```

### Education Workspace

```
stores (id: xyz-456, workspace_type: 'education')
│
├── students (class_id: xyz-456)
│   └── Student A, Student B...
│
├── class_sessions (class_id: xyz-456)
│   └── Math 101 9AM-10AM, Physics 102...
│
├── attendance_records (class_id: xyz-456)
│   └── Student A checked in at 9:05 AM...
│
└── session_schedules (class_id: xyz-456)
    └── Student A scheduled for Math 101 on 2026-02-01
```

---

## 🔍 How It Works

### Plugin Adapters

**Business Adapter:**
```tsx
{
  tables: {
    people: 'staff',
    checkIns: 'check_ins',
    shifts: 'shift_templates',
    schedules: 'staff_schedules',
  },
  fields: {
    personId: 'staff_id',
    workspaceId: 'store_id',  // ← Uses store_id
    sessionId: 'shift_id',
  }
}
```

**Education Adapter:**
```tsx
{
  tables: {
    people: 'students',
    checkIns: 'attendance_records',
    shifts: 'class_sessions',
    schedules: 'session_schedules',
  },
  fields: {
    personId: 'student_id',
    workspaceId: 'class_id',  // ← Uses class_id
    sessionId: 'session_id',
  }
}
```

### AttendanceFeature Code

```tsx
// Gets table names from adapter
const peopleTable = adapter?.tables?.people || 'staff';
const shiftsTable = adapter?.tables?.shifts || 'shift_templates';

// Gets field names from adapter
const workspaceIdField = adapter?.fields?.workspaceId || 'store_id';

// Query works for both workspace types
.from(shiftsTable)  // 'shift_templates' or 'class_sessions'
.eq(workspaceIdField, workspaceId)  // 'store_id' or 'class_id'
```

---

## 📋 Table Schemas

### class_sessions

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| class_id | UUID | Reference to class (stores table) |
| name | TEXT | Session name (e.g., "Math 101") |
| description | TEXT | Optional description |
| subject | TEXT | Subject (e.g., "Mathematics") |
| start_time | TIME | Start time |
| end_time | TIME | End time |
| day_of_week | INTEGER | 0-6 (Sunday-Saturday), NULL for one-time |
| color | TEXT | Color for UI (#3B82F6) |
| grace_period_minutes | INTEGER | Late threshold (default: 15) |
| deleted_at | TIMESTAMP | Soft delete |
| created_at | TIMESTAMP | Creation time |
| updated_at | TIMESTAMP | Last update |

### attendance_records

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| class_id | UUID | Reference to class |
| student_id | UUID | Reference to student |
| session_id | UUID | Reference to class_session |
| check_in_time | TIMESTAMP | Check-in time |
| check_out_time | TIMESTAMP | Check-out time (optional) |
| status | TEXT | present, late, absent, excused |
| is_late | BOOLEAN | Late flag |
| latitude | DOUBLE | GPS latitude |
| longitude | DOUBLE | GPS longitude |
| selfie_url | TEXT | Selfie verification |
| notes | TEXT | Additional notes |
| created_at | TIMESTAMP | Creation time |
| updated_at | TIMESTAMP | Last update |

### session_schedules

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| class_id | UUID | Reference to class |
| session_id | UUID | Reference to class_session |
| student_id | UUID | Reference to student (optional) |
| scheduled_date | DATE | Scheduled date |
| override_start_time | TIME | Override start time (optional) |
| override_end_time | TIME | Override end time (optional) |
| notes | TEXT | Additional notes |
| created_at | TIMESTAMP | Creation time |
| updated_at | TIMESTAMP | Last update |

---

## 🔐 RLS Policies

### class_sessions
- ✅ Teachers can manage their class sessions
- ✅ Students can view their class sessions (read-only)

### attendance_records
- ✅ Teachers can manage all attendance records
- ✅ Students can view their own attendance (read-only)
- ✅ Students can create their own attendance records (self-check-in)

### session_schedules
- ✅ Teachers can manage all schedules
- ✅ Students can view their schedules (read-only)

---

## 🧪 Testing Checklist

### Business Workspace
- [ ] Open business workspace
- [ ] Today tab shows staff list
- [ ] Can create/view shifts
- [ ] Can record check-ins
- [ ] Can create schedules
- [ ] Staff count shows correctly
- [ ] Active staff indicator works

### Education Workspace
- [ ] Open education workspace
- [ ] Today tab shows student list
- [ ] Can create/view class sessions
- [ ] Can record attendance
- [ ] Can create session schedules
- [ ] Student count shows correctly
- [ ] Self-enrollment works (if enabled)

### Error Handling
- [ ] No `deleted_at` errors
- [ ] No `class_id` errors on business tables
- [ ] No `store_id` errors on education tables
- [ ] Proper error messages if plugin not found

---

## 🎯 Benefits Achieved

### 1. Clean Separation
- Business tables: `staff`, `shift_templates`, `check_ins`, `staff_schedules`
- Education tables: `students`, `class_sessions`, `attendance_records`, `session_schedules`
- No NULL columns
- No mixed data

### 2. Schema Flexibility
Each workspace type can have its own columns:
- `class_sessions` has `subject`, `day_of_week`
- Can add education-specific fields without affecting business tables
- Can add business-specific fields without affecting education tables

### 3. Performance
- Smaller tables (no mixed data)
- Better indexes (no NULL workspace IDs)
- Faster queries

### 4. Plugin Architecture Alignment
- Each plugin owns its tables
- Clear table mapping in adapters
- Easy to add new workspace types

### 5. Type Safety
- Separate TypeScript types for each workspace
- No union types with optional fields
- Clearer data models

---

## 🔄 Migration Path (Optional)

If you have existing education data in business tables:

```sql
-- Migrate existing education data to new tables

-- 1. Copy education shifts to class_sessions
INSERT INTO class_sessions (
  id, class_id, name, start_time, end_time, color, grace_period_minutes, created_at
)
SELECT
  id, class_id, name, start_time, end_time, color, grace_period_minutes, created_at
FROM shift_templates
WHERE class_id IS NOT NULL;

-- 2. Copy education check-ins to attendance_records
INSERT INTO attendance_records (
  id, class_id, student_id, session_id, check_in_time, check_out_time,
  latitude, longitude, selfie_url, created_at
)
SELECT
  id, class_id, staff_id as student_id, shift_id as session_id,
  check_in_time, check_out_time, latitude, longitude, selfie_url, created_at
FROM check_ins
WHERE class_id IS NOT NULL;

-- 3. Copy education schedules to session_schedules
INSERT INTO session_schedules (
  id, class_id, session_id, student_id, scheduled_date, created_at
)
SELECT
  id, class_id, shift_id as session_id, staff_id as student_id,
  scheduled_date, created_at
FROM staff_schedules
WHERE class_id IS NOT NULL;

-- 4. (Optional) Remove class_id columns from business tables
ALTER TABLE shift_templates DROP COLUMN IF EXISTS class_id;
ALTER TABLE check_ins DROP COLUMN IF EXISTS class_id;
ALTER TABLE staff_schedules DROP COLUMN IF EXISTS class_id;
ALTER TABLE staff DROP COLUMN IF EXISTS class_id;
```

---

## 📚 Files Changed

### Created
- ✅ `migrations/create_education_tables.sql` - Database migration
- ✅ `IMPLEMENT_SEPARATE_TABLES.md` - This guide

### Modified
- ✅ `plugins/education/adapters/AttendanceAdapter.ts` - Uses new tables and class_id
- ✅ `plugins/business/adapters/AttendanceAdapter.ts` - Explicitly uses store_id
- ✅ `features/attendance/AttendanceFeature.tsx` - Uses adapter field mappings

---

## 🚨 Important Notes

1. **Run the migration first** before testing your app
2. **Soft delete migration** is still needed for the `deleted_at` column
3. **Education workspaces** will now use dedicated tables
4. **Business workspaces** continue using existing tables
5. **No breaking changes** for existing business workspaces

---

## ✨ Next Steps

After implementation:

1. **Remove class_id columns** from business tables (optional, for cleanup)
2. **Add education-specific features**:
   - Grading system
   - Assignments
   - Parent notifications
   - Report cards
3. **Add business-specific features**:
   - Overtime tracking
   - Payroll integration
   - Time-off requests

---

**Your app now has a clean, scalable architecture for both workspace types!** 🎉
