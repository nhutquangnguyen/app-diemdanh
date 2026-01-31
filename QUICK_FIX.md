# Quick Fix Guide

## Two Errors Fixed

### Error 1: `column staff.deleted_at does not exist`
### Error 2: `column shift_templates.class_id does not exist`

---

## ✅ Code Fixed (Already Done)

- Updated `features/attendance/AttendanceFeature.tsx` to use dynamic workspace ID field
- Now supports both business (`store_id`) and education (`class_id`) workspaces

---

## 🔧 Database Fix (You Need to Run This)

### Option 1: Quick Fix (Copy & Paste)

Go to **Supabase → SQL Editor** and run this:

```sql
-- Fix all missing columns at once

-- Add soft delete support
ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;
CREATE INDEX IF NOT EXISTS idx_staff_deleted_at ON public.staff(deleted_at);

ALTER TABLE public.shift_templates ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;
CREATE INDEX IF NOT EXISTS idx_shift_templates_deleted_at ON public.shift_templates(deleted_at);

ALTER TABLE public.students ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;
CREATE INDEX IF NOT EXISTS idx_students_deleted_at ON public.students(deleted_at);

-- Add education workspace support
ALTER TABLE public.shift_templates ADD COLUMN IF NOT EXISTS class_id UUID REFERENCES public.stores(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_shift_templates_class_id ON public.shift_templates(class_id);

ALTER TABLE public.staff_schedules ADD COLUMN IF NOT EXISTS class_id UUID REFERENCES public.stores(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_staff_schedules_class_id ON public.staff_schedules(class_id);

ALTER TABLE public.check_ins ADD COLUMN IF NOT EXISTS class_id UUID REFERENCES public.stores(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_check_ins_class_id ON public.check_ins(class_id);

ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS class_id UUID REFERENCES public.stores(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_staff_class_id ON public.staff(class_id);
```

### Option 2: Use Migration File

Copy contents from:
- `/migrations/FIX_ALL_MISSING_COLUMNS.sql`

---

## 📋 Verification

After running the SQL, refresh your app and:

1. ✅ No more `deleted_at` errors
2. ✅ No more `class_id` errors
3. ✅ Business workspaces work
4. ✅ Education workspaces work

---

## 📚 Detailed Documentation

- **`FIX_DELETED_AT_ERROR.md`** - Explains soft delete system
- **`FIX_CLASS_ID_ERROR.md`** - Explains education workspace support
- **`migrations/FIX_ALL_MISSING_COLUMNS.sql`** - Complete migration with comments

---

**Time to fix: 2 minutes** ⏱️

Just copy the SQL above and paste it into Supabase SQL Editor, then click Run!
