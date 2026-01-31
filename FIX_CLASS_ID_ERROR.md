# Fix: "column shift_templates.class_id does not exist" Error

## Problem

Your app is trying to query tables with `class_id` field for education workspaces, but many tables only have `store_id`.

**Error:**
```
{
  code: '42703',
  message: 'column shift_templates.class_id does not exist'
}
```

**Root Cause:**
The `AttendanceFeature` was hardcoded to use `'store_id'` for all workspace types, but education workspaces need to use `'class_id'` instead.

---

## Solutions Applied

### ✅ Solution 1: Fix the Code (DONE)

I've updated `features/attendance/AttendanceFeature.tsx` to dynamically use the correct workspace ID field:

**Changes made:**
- Added `workspaceIdField` variable that switches between `'class_id'` and `'store_id'` based on workspace type
- Updated all database queries to use `workspaceIdField` instead of hardcoded `'store_id'`

**Before:**
```tsx
.eq('store_id', workspaceId)  // Always used store_id ❌
```

**After:**
```tsx
const workspaceIdField = peopleTable === 'students' ? 'class_id' : 'store_id';
.eq(workspaceIdField, workspaceId)  // Dynamic based on workspace type ✅
```

---

### 🔧 Solution 2: Add `class_id` Columns to Database (REQUIRED)

Even with the code fix, you still need to add `class_id` columns to your database tables.

**Run this SQL in Supabase:**

```sql
-- Add class_id support to tables for education workspaces

-- 1. Add class_id to shift_templates table
ALTER TABLE public.shift_templates
ADD COLUMN IF NOT EXISTS class_id UUID REFERENCES public.stores(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_shift_templates_class_id ON public.shift_templates(class_id);

-- Add constraint to ensure either store_id or class_id is set, but not both
ALTER TABLE public.shift_templates
DROP CONSTRAINT IF EXISTS shift_templates_workspace_check;

ALTER TABLE public.shift_templates
ADD CONSTRAINT shift_templates_workspace_check
CHECK (
  (store_id IS NOT NULL AND class_id IS NULL) OR
  (store_id IS NULL AND class_id IS NOT NULL)
);

-- 2. Add class_id to staff_schedules table
ALTER TABLE public.staff_schedules
ADD COLUMN IF NOT EXISTS class_id UUID REFERENCES public.stores(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_staff_schedules_class_id ON public.staff_schedules(class_id);

-- 3. Add class_id to check_ins table
ALTER TABLE public.check_ins
ADD COLUMN IF NOT EXISTS class_id UUID REFERENCES public.stores(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_check_ins_class_id ON public.check_ins(class_id);

-- 4. Add class_id to staff table
ALTER TABLE public.staff
ADD COLUMN IF NOT EXISTS class_id UUID REFERENCES public.stores(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_staff_class_id ON public.staff(class_id);
```

---

## Complete Migration (All Fixes Combined)

Run this SQL to fix both the `deleted_at` and `class_id` errors:

```sql
-- ==========================================
-- COMPLETE MIGRATION: Fix all missing columns
-- ==========================================

-- PART 1: Add soft delete support (deleted_at)
-- ==========================================

-- Add deleted_at to staff table
ALTER TABLE public.staff
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_staff_deleted_at ON public.staff(deleted_at);

-- Add deleted_at to shift_templates table
ALTER TABLE public.shift_templates
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_shift_templates_deleted_at ON public.shift_templates(deleted_at);

-- Add deleted_at to students table
ALTER TABLE public.students
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_students_deleted_at ON public.students(deleted_at);

-- PART 2: Add class_id support for education workspaces
-- ==========================================

-- Add class_id to shift_templates table
ALTER TABLE public.shift_templates
ADD COLUMN IF NOT EXISTS class_id UUID REFERENCES public.stores(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_shift_templates_class_id ON public.shift_templates(class_id);

-- Add constraint to ensure either store_id or class_id is set
ALTER TABLE public.shift_templates
DROP CONSTRAINT IF EXISTS shift_templates_workspace_check;

ALTER TABLE public.shift_templates
ADD CONSTRAINT shift_templates_workspace_check
CHECK (
  (store_id IS NOT NULL AND class_id IS NULL) OR
  (store_id IS NULL AND class_id IS NOT NULL)
);

-- Add class_id to staff_schedules table
ALTER TABLE public.staff_schedules
ADD COLUMN IF NOT EXISTS class_id UUID REFERENCES public.stores(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_staff_schedules_class_id ON public.staff_schedules(class_id);

-- Add class_id to check_ins table
ALTER TABLE public.check_ins
ADD COLUMN IF NOT EXISTS class_id UUID REFERENCES public.stores(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_check_ins_class_id ON public.check_ins(class_id);

-- Add class_id to staff table
ALTER TABLE public.staff
ADD COLUMN IF NOT EXISTS class_id UUID REFERENCES public.stores(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_staff_class_id ON public.staff(class_id);

-- DONE! All missing columns have been added.
```

---

## How the Fix Works

### Business Workspace (store_id)
```
stores (id: store-123)
  ├── staff (store_id: store-123)
  ├── shift_templates (store_id: store-123)
  ├── check_ins (store_id: store-123)
  └── staff_schedules (store_id: store-123)
```

### Education Workspace (class_id)
```
stores (id: class-456, workspace_type: 'education')
  ├── students (class_id: class-456)
  ├── class_sessions (class_id: class-456)  [uses shift_templates table]
  ├── attendance_records (class_id: class-456)  [uses check_ins table]
  └── session_schedules (class_id: class-456)  [uses staff_schedules table]
```

### Code Logic
```tsx
// Dynamically determine which field to use
const workspaceIdField = peopleTable === 'students' ? 'class_id' : 'store_id';

// Query works for both workspace types
.eq(workspaceIdField, workspaceId)
```

---

## Table Structure After Migration

### shift_templates
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| store_id | UUID | For business workspaces (can be NULL) |
| class_id | UUID | For education workspaces (can be NULL) |
| deleted_at | TIMESTAMP | Soft delete timestamp |
| name | TEXT | Shift/session name |
| start_time | TIME | Start time |
| end_time | TIME | End time |

**Constraint:** Either `store_id` OR `class_id` must be set, but not both.

### staff
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| store_id | UUID | For business staff (can be NULL) |
| class_id | UUID | For students in education (can be NULL) |
| deleted_at | TIMESTAMP | Soft delete timestamp |
| ... | ... | Other fields |

### check_ins / attendance_records
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| store_id | UUID | For business check-ins (can be NULL) |
| class_id | UUID | For student attendance (can be NULL) |
| ... | ... | Other fields |

### staff_schedules / session_schedules
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| store_id | UUID | For business schedules (can be NULL) |
| class_id | UUID | For class sessions (can be NULL) |
| ... | ... | Other fields |

---

## Testing

After running the migration and reloading your app:

### Test Business Workspace
1. ✅ Open a business workspace
2. ✅ Check Today tab (should load staff with `store_id`)
3. ✅ Check shifts (should load with `store_id`)
4. ✅ Check schedules (should load with `store_id`)

### Test Education Workspace
1. ✅ Open an education workspace
2. ✅ Check Today tab (should load students with `class_id`)
3. ✅ Check class sessions (should load with `class_id`)
4. ✅ Check session schedules (should load with `class_id`)

### Verify Database
```sql
-- Check business workspace data
SELECT id, name, store_id, class_id FROM shift_templates WHERE store_id IS NOT NULL;

-- Check education workspace data
SELECT id, name, store_id, class_id FROM shift_templates WHERE class_id IS NOT NULL;

-- Should never have both set
SELECT id, name, store_id, class_id FROM shift_templates WHERE store_id IS NOT NULL AND class_id IS NOT NULL;
-- ↑ This should return 0 rows
```

---

## Migration Files

I've created these migration files:

1. **`migrations/add_soft_delete_complete.sql`** - Adds `deleted_at` to all tables
2. **`migrations/add_class_id_support.sql`** - Adds `class_id` to all tables
3. **Use the combined SQL above for a complete fix**

---

## Code Changes

### File: `features/attendance/AttendanceFeature.tsx`

**Lines changed:** 88-127

**What changed:**
- Added `workspaceIdField` variable
- Changed `.eq('store_id', workspaceId)` to `.eq(workspaceIdField, workspaceId)` in 4 places

**Impact:**
- Business workspaces: Uses `store_id` (no change)
- Education workspaces: Uses `class_id` (fixes the error)

---

## Summary

### ✅ Code Fixed
- `AttendanceFeature.tsx` now uses dynamic workspace ID field

### 🔧 Database Migration Required
- Run the SQL migration in Supabase to add missing columns

### 📊 Impact
- Business workspaces: Continue working as before
- Education workspaces: Now properly supported with `class_id`
- Both workspace types can coexist in the same database

---

**Run the migration SQL and your app will work for both workspace types!** 🎉
