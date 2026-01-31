# Fix: "column staff.deleted_at does not exist" Error

## Problem

Your app is trying to query `deleted_at` column on the `staff` table (and potentially other tables), but the column doesn't exist in the database yet.

**Error:**
```
{
  code: '42703',
  message: 'column staff.deleted_at does not exist'
}
```

**Where it's happening:**
- `features/attendance/AttendanceFeature.tsx:93` - Filtering staff by `deleted_at`
- `features/attendance/AttendanceFeature.tsx:113` - Filtering shifts by `deleted_at`
- Potentially other places that use soft deletes

---

## Solution

### Quick Fix (Recommended)

Run this SQL in your **Supabase SQL Editor**:

```sql
-- Add soft delete support to all missing tables
-- This adds deleted_at columns to tables that don't have it yet

-- 1. Add deleted_at to staff table
ALTER TABLE public.staff
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_staff_deleted_at ON public.staff(deleted_at);

COMMENT ON COLUMN public.staff.deleted_at IS 'Timestamp when the staff member was soft deleted. NULL means active.';

-- 2. Add deleted_at to shift_templates table
ALTER TABLE public.shift_templates
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_shift_templates_deleted_at ON public.shift_templates(deleted_at);

COMMENT ON COLUMN public.shift_templates.deleted_at IS 'Timestamp when the shift template was soft deleted. NULL means active.';

-- 3. Add deleted_at to students table (for future use)
ALTER TABLE public.students
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_students_deleted_at ON public.students(deleted_at);

COMMENT ON COLUMN public.students.deleted_at IS 'Timestamp when the student was soft deleted. NULL means active.';
```

---

## Step-by-Step Instructions

### 1. Open Supabase Dashboard
1. Go to https://supabase.com/dashboard
2. Select your project
3. Click on "SQL Editor" in the left sidebar

### 2. Run the Migration
1. Click "New query"
2. Copy and paste the SQL from above (or from `/migrations/add_soft_delete_complete.sql`)
3. Click "Run" or press `Cmd/Ctrl + Enter`

### 3. Verify the Migration
Run this query to check all tables now have `deleted_at`:

```sql
SELECT
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE column_name = 'deleted_at'
  AND table_schema = 'public'
ORDER BY table_name;
```

You should see:
```
table_name       | column_name | data_type                   | is_nullable
-----------------|-------------|-----------------------------|-----------
shift_templates  | deleted_at  | timestamp with time zone    | YES
staff            | deleted_at  | timestamp with time zone    | YES
stores           | deleted_at  | timestamp with time zone    | YES
students         | deleted_at  | timestamp with time zone    | YES
```

### 4. Test Your App
1. Refresh your app
2. The error should be gone
3. Try navigating to the page that was causing the error

---

## What is Soft Delete?

**Soft delete** means marking records as "deleted" without actually removing them from the database. This is done by setting a `deleted_at` timestamp.

**Benefits:**
- Data recovery - You can "undelete" records
- Audit trail - You know when something was deleted
- Data integrity - Related records aren't orphaned
- Compliance - Some regulations require keeping deleted data

**How it works:**
```sql
-- Normal delete (hard delete) - removes record
DELETE FROM staff WHERE id = '123';

-- Soft delete - just marks as deleted
UPDATE staff SET deleted_at = NOW() WHERE id = '123';

-- Query only active (non-deleted) records
SELECT * FROM staff WHERE deleted_at IS NULL;
```

---

## Current Implementation

### Tables with Soft Delete

| Table | Has deleted_at? | Status |
|-------|----------------|--------|
| `stores` | ✅ Yes | Already implemented |
| `staff` | ❌ No | **Need to add** |
| `shift_templates` | ❌ No | **Need to add** |
| `students` | ❌ No | **Need to add** |

### Code Using Soft Delete

**Owner Dashboard:**
```tsx
// app/owner/page.tsx:47
.is('deleted_at', null)  // Only show active stores
```

**Attendance Feature:**
```tsx
// features/attendance/AttendanceFeature.tsx:93
.is('deleted_at', null)  // Only show active staff ❌ ERROR HERE

// features/attendance/AttendanceFeature.tsx:113
.is('deleted_at', null)  // Only show active shifts ❌ ERROR HERE
```

---

## Migration Files Created

I've created these migration files for you:

1. **`migrations/add_soft_delete_to_staff.sql`** - Adds deleted_at to staff table
2. **`migrations/add_soft_delete_to_shifts.sql`** - Adds deleted_at to shift_templates table
3. **`migrations/add_soft_delete_complete.sql`** - Complete migration for all tables (recommended)

You can use any of these, but **`add_soft_delete_complete.sql` is recommended** as it handles everything in one go.

---

## After Running the Migration

### Update RLS Policies (Optional)

You may want to update your Row Level Security policies to automatically exclude soft-deleted records:

```sql
-- Example: Update staff policies
DROP POLICY IF EXISTS "Staff can view their info" ON public.staff;

CREATE POLICY "Staff can view their info" ON public.staff
  FOR SELECT
  USING (
    auth.uid() = user_id
    AND deleted_at IS NULL  -- Exclude soft-deleted records
  );
```

### Add Undelete Function (Optional)

You can create a function to restore soft-deleted records:

```sql
CREATE OR REPLACE FUNCTION undelete_staff(staff_id_param UUID)
RETURNS void AS $$
BEGIN
  UPDATE staff
  SET deleted_at = NULL
  WHERE id = staff_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## Testing

After running the migration, test these scenarios:

1. ✅ Load staff list (should work without errors)
2. ✅ Load attendance page (should work without errors)
3. ✅ Create new staff (deleted_at should be NULL)
4. ✅ Soft delete a staff member:
   ```sql
   UPDATE staff SET deleted_at = NOW() WHERE id = 'some-id';
   ```
5. ✅ Verify they don't show up in the app
6. ✅ Restore a staff member:
   ```sql
   UPDATE staff SET deleted_at = NULL WHERE id = 'some-id';
   ```
7. ✅ Verify they show up again

---

## Summary

**Problem:** `staff`, `shift_templates`, and `students` tables are missing the `deleted_at` column.

**Solution:** Run the migration SQL in Supabase to add the column.

**File to use:** `/migrations/add_soft_delete_complete.sql`

**Time to fix:** ~2 minutes

---

## Need Help?

If you encounter any issues:

1. Check the Supabase SQL Editor for error messages
2. Verify you're connected to the correct database
3. Make sure you have the necessary permissions
4. Check if the columns already exist (the migration uses `IF NOT EXISTS` so it's safe to run multiple times)

---

**The migration is ready to run! Just copy the SQL and paste it into Supabase SQL Editor.** 🚀
