# Education Workspace Migration Instructions

## ✅ Fixed Migration Ready to Run

The migration has been fixed to properly reference `public.profiles` and `public.stores` to match your existing schema.

## 🚀 How to Run

1. **Open Supabase Dashboard**
   - Go to your Supabase project
   - Navigate to **SQL Editor**

2. **Copy the Migration**
   - Open `/migrations/add_education_workspace.sql`
   - Copy the **entire content**

3. **Run in SQL Editor**
   - Paste into a new query
   - Click **Run** or press `Ctrl+Enter`

4. **Verify Success**
   - You should see: "Education workspace migration completed successfully!"
   - No errors

## 📊 What This Migration Does

### Tables Created:
- ✅ `students` - Student roster (like staff, but for education)
- ✅ `class_sessions` - Weekly recurring class times (like shift_templates)
- ✅ `attendance_records` - Student attendance tracking
- ✅ `student_notes` - Teacher observations

### Tables Modified:
- ✅ `stores` - Added `workspace_type` field ('business' or 'education')
- ✅ `stores` - Added education fields (subject, grade_level, room_number, academic_year)
- ✅ `stores` - Made latitude/longitude nullable (not required for classrooms)

### Security:
- ✅ All RLS policies configured
- ✅ Teachers can only access their own classes
- ✅ Students can only view their own data
- ✅ Complete data isolation between workspaces

## 🧪 After Running - Test Steps

1. **Refresh your app** (if running locally)

2. **Create a test education workspace:**
   - Go to `/owner/create-store`
   - Click "Giáo Dục" (Education)
   - Fill in:
     - Class Name: "Math 101 - Grade 10A"
     - Subject: "Mathematics"
     - Grade Level: "Grade 10"
     - Room: "204"
     - Academic Year: "2024-2025"
   - Click "Tạo Lớp Học"

3. **Verify in dashboard:**
   - You should see the new class card with:
     - 🎓 icon
     - Green border
     - "Giáo Dục" badge
     - Subject, grade level, room info
     - "0 học sinh"

## ❌ If You Get Errors

**"relation already exists"** - Safe to ignore, means some tables were already created

**"column already exists"** - Safe to ignore, migration uses `IF NOT EXISTS`

**Other errors** - Let me know and I'll help debug!

## 📝 What's Next After Migration

Once migration succeeds, we can:
1. ✅ Create conditional tab navigation (Today/Timetable/Students/Settings) - DONE
2. ✅ Build Teacher Today tab (roll call interface) - DONE
3. ✅ Build Teacher Timetable tab (session management) - DONE
4. ✅ Build Teacher Students tab (roster management) - DONE
5. ✅ Build Student interface (Check-in, Attendance, Timetable, Profile) - DONE

All features completed and ready for testing! 🎉

---

**Test Change:** Verifying Vercel deployment config - this push should NOT trigger deployment.
