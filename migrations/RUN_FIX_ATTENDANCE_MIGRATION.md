# Fix Attendance Records Migration

## Issue
The `attendance_records` table is missing the `updated_at` column, but there's a trigger that tries to set it on UPDATE operations. This causes error:
```
Error: record "new" has no field "updated_at" (code: 42703)
```

## Solution
Run the migration `fix_attendance_records_updated_at.sql` to add the missing column.

## How to Run

### Option 1: Supabase Dashboard (Recommended)
1. Go to Supabase Dashboard → SQL Editor
2. Copy the contents of `fix_attendance_records_updated_at.sql`
3. Paste and run the SQL
4. Verify the output shows "Added updated_at column"

### Option 2: Command Line (psql)
```bash
psql "postgresql://[YOUR_CONNECTION_STRING]" -f migrations/fix_attendance_records_updated_at.sql
```

### Option 3: Supabase CLI
```bash
supabase db reset  # If you want to reset the entire DB
# OR
supabase db push   # To push migrations
```

## Verification
After running, verify the column exists:
```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'attendance_records'
  AND column_name = 'updated_at';
```

Should return:
```
column_name | data_type                   | is_nullable
updated_at  | timestamp with time zone    | YES
```

## What This Fixes
- ✅ "Điểm danh tất cả vắng" (Mark all absent) button
- ✅ "Điểm danh tất cả có mặt" (Mark all present) button
- ✅ Individual student attendance updates
- ✅ Any UPDATE operation on attendance_records

## Safe to Run
- ✅ Uses `IF NOT EXISTS` check - won't fail if column already exists
- ✅ Sets default value to NOW() for existing records
- ✅ Non-destructive - only adds a column, doesn't modify data
