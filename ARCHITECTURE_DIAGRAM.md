# Architecture Diagram: Separate Tables Implementation

## Complete System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         SUPABASE DATABASE                        │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  stores TABLE (Both Workspace Types)                            │
│  ┌────────────┬──────────────────┬─────────────────────────┐   │
│  │ id         │ workspace_type   │ owner_id                │   │
│  ├────────────┼──────────────────┼─────────────────────────┤   │
│  │ abc-123    │ 'business'       │ user-1                  │   │
│  │ xyz-456    │ 'education'      │ user-2                  │   │
│  └────────────┴──────────────────┴─────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                           │
                           │
         ┌─────────────────┴─────────────────┐
         │                                   │
         ▼                                   ▼
┌─────────────────────┐           ┌─────────────────────┐
│  BUSINESS TABLES    │           │  EDUCATION TABLES   │
└─────────────────────┘           └─────────────────────┘

╔═══════════════════════════════════════════════════════════════╗
║               BUSINESS WORKSPACE (store_id)                   ║
╚═══════════════════════════════════════════════════════════════╝

stores (id: abc-123, workspace_type: 'business')
│
├─ staff (store_id: abc-123)
│  ├─ id: staff-001
│  ├─ name: "John Doe"
│  ├─ store_id: abc-123
│  └─ deleted_at: NULL
│
├─ shift_templates (store_id: abc-123)
│  ├─ id: shift-001
│  ├─ name: "Morning Shift"
│  ├─ store_id: abc-123
│  ├─ start_time: 08:00
│  ├─ end_time: 17:00
│  └─ deleted_at: NULL
│
├─ check_ins (store_id: abc-123)
│  ├─ id: checkin-001
│  ├─ staff_id: staff-001
│  ├─ shift_id: shift-001
│  ├─ store_id: abc-123
│  └─ check_in_time: 2026-02-01 08:05:00
│
└─ staff_schedules (store_id: abc-123)
   ├─ id: schedule-001
   ├─ staff_id: staff-001
   ├─ shift_id: shift-001
   ├─ store_id: abc-123
   └─ scheduled_date: 2026-02-01


╔═══════════════════════════════════════════════════════════════╗
║               EDUCATION WORKSPACE (class_id)                  ║
╚═══════════════════════════════════════════════════════════════╝

stores (id: xyz-456, workspace_type: 'education')
│
├─ students (class_id: xyz-456)
│  ├─ id: student-001
│  ├─ name: "Alice Smith"
│  ├─ class_id: xyz-456
│  └─ deleted_at: NULL
│
├─ class_sessions (class_id: xyz-456)           ← NEW TABLE
│  ├─ id: session-001
│  ├─ name: "Math 101"
│  ├─ class_id: xyz-456
│  ├─ subject: "Mathematics"
│  ├─ start_time: 09:00
│  ├─ end_time: 10:00
│  ├─ day_of_week: 1 (Monday)
│  └─ deleted_at: NULL
│
├─ attendance_records (class_id: xyz-456)       ← NEW TABLE
│  ├─ id: attendance-001
│  ├─ student_id: student-001
│  ├─ session_id: session-001
│  ├─ class_id: xyz-456
│  ├─ check_in_time: 2026-02-01 09:05:00
│  └─ status: "present"
│
└─ session_schedules (class_id: xyz-456)        ← NEW TABLE
   ├─ id: schedule-001
   ├─ student_id: student-001
   ├─ session_id: session-001
   ├─ class_id: xyz-456
   └─ scheduled_date: 2026-02-01
```

---

## Plugin System Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    USER OPENS WORKSPACE                      │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  WorkspaceShell detects workspace_type                      │
│  • Business → Uses business.plugin.ts                       │
│  • Education → Uses education.plugin.ts                     │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  Plugin provides adapter for each feature                   │
│  • AttendanceAdapter                                        │
│  • SchedulingAdapter                                        │
│  • PeopleAdapter                                            │
│  • SettingsAdapter                                          │
└─────────────────────────────────────────────────────────────┘
                            │
         ┌──────────────────┴──────────────────┐
         │                                     │
         ▼                                     ▼
┌─────────────────────┐           ┌─────────────────────┐
│  BUSINESS ADAPTER   │           │ EDUCATION ADAPTER   │
└─────────────────────┘           └─────────────────────┘

BUSINESS ADAPTER                   EDUCATION ADAPTER
├─ tables:                         ├─ tables:
│  ├─ people: 'staff'              │  ├─ people: 'students'
│  ├─ checkIns: 'check_ins'        │  ├─ checkIns: 'attendance_records'
│  ├─ shifts: 'shift_templates'    │  ├─ shifts: 'class_sessions'
│  └─ schedules: 'staff_schedules' │  └─ schedules: 'session_schedules'
│                                  │
└─ fields:                         └─ fields:
   ├─ personId: 'staff_id'            ├─ personId: 'student_id'
   ├─ workspaceId: 'store_id' ←       ├─ workspaceId: 'class_id' ←
   └─ sessionId: 'shift_id'           └─ sessionId: 'session_id'

                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  AttendanceFeature uses adapter                             │
│                                                              │
│  const workspaceIdField = adapter.fields.workspaceId;       │
│  const shiftsTable = adapter.tables.shifts;                 │
│                                                              │
│  .from(shiftsTable)                                         │
│  .eq(workspaceIdField, workspaceId)                         │
└─────────────────────────────────────────────────────────────┘
                            │
         ┌──────────────────┴──────────────────┐
         │                                     │
         ▼                                     ▼
┌─────────────────────┐           ┌─────────────────────┐
│  BUSINESS QUERY     │           │ EDUCATION QUERY     │
└─────────────────────┘           └─────────────────────┘

.from('shift_templates')           .from('class_sessions')
.eq('store_id', 'abc-123')        .eq('class_id', 'xyz-456')
```

---

## Data Flow Example

### Business Workspace: Recording a Check-in

```
1. User: John Doe opens business workspace (id: abc-123)
   │
   ▼
2. WorkspaceShell loads business.plugin
   │
   ▼
3. Plugin provides Business AttendanceAdapter:
   {
     tables: { checkIns: 'check_ins' },
     fields: { workspaceId: 'store_id' }
   }
   │
   ▼
4. User clicks "Check In" button
   │
   ▼
5. AttendanceFeature executes:
   supabase
     .from('check_ins')                    ← From adapter.tables.checkIns
     .insert({
       staff_id: 'staff-001',
       store_id: 'abc-123',                ← From adapter.fields.workspaceId
       check_in_time: NOW()
     })
   │
   ▼
6. Data inserted into check_ins table:
   ┌──────────────┬──────────┬──────────┬─────────────────────┐
   │ id           │ staff_id │ store_id │ check_in_time       │
   ├──────────────┼──────────┼──────────┼─────────────────────┤
   │ checkin-001  │ staff-1  │ abc-123  │ 2026-02-01 08:05:00 │
   └──────────────┴──────────┴──────────┴─────────────────────┘
```

### Education Workspace: Recording Attendance

```
1. User: Alice Smith opens education workspace (id: xyz-456)
   │
   ▼
2. WorkspaceShell loads education.plugin
   │
   ▼
3. Plugin provides Education AttendanceAdapter:
   {
     tables: { checkIns: 'attendance_records' },
     fields: { workspaceId: 'class_id' }
   }
   │
   ▼
4. Student clicks "Check In" button
   │
   ▼
5. AttendanceFeature executes:
   supabase
     .from('attendance_records')           ← From adapter.tables.checkIns
     .insert({
       student_id: 'student-001',
       class_id: 'xyz-456',                ← From adapter.fields.workspaceId
       check_in_time: NOW(),
       status: 'present'
     })
   │
   ▼
6. Data inserted into attendance_records table:
   ┌──────────────┬────────────┬──────────┬─────────────────────┬─────────┐
   │ id           │ student_id │ class_id │ check_in_time       │ status  │
   ├──────────────┼────────────┼──────────┼─────────────────────┼─────────┤
   │ attend-001   │ student-1  │ xyz-456  │ 2026-02-01 09:05:00 │ present │
   └──────────────┴────────────┴──────────┴─────────────────────┴─────────┘
```

---

## Table Relationship Diagram

### Business Workspace

```
                  stores (id: abc-123)
                         │
         ┌───────────────┼───────────────┬───────────────┐
         │               │               │               │
         ▼               ▼               ▼               ▼
      staff        shift_templates   check_ins    staff_schedules
    (store_id)       (store_id)     (store_id)      (store_id)
         │               │               │               │
         └───────────────┼───────────────┴───────────────┘
                         │
                  All reference abc-123
```

### Education Workspace

```
                  stores (id: xyz-456)
                         │
         ┌───────────────┼───────────────┬────────────────┐
         │               │               │                │
         ▼               ▼               ▼                ▼
     students      class_sessions  attendance_records session_schedules
    (class_id)       (class_id)       (class_id)        (class_id)
         │               │               │                │
         └───────────────┼───────────────┴────────────────┘
                         │
                  All reference xyz-456
```

---

## File Structure

```
app/
├── features/
│   └── attendance/
│       └── AttendanceFeature.tsx         ← Generic feature (works for both)
│
├── plugins/
│   ├── business/
│   │   └── adapters/
│   │       └── AttendanceAdapter.ts      ← Maps to business tables
│   │
│   └── education/
│       └── adapters/
│           └── AttendanceAdapter.ts      ← Maps to education tables
│
└── migrations/
    ├── create_education_tables.sql       ← Creates new education tables
    └── add_soft_delete_complete.sql      ← Adds deleted_at columns
```

---

## Summary

### Key Points

1. **Two separate table sets:**
   - Business: `staff`, `shift_templates`, `check_ins`, `staff_schedules`
   - Education: `students`, `class_sessions`, `attendance_records`, `session_schedules`

2. **Plugin adapters map tables:**
   - Business adapter → business tables with `store_id`
   - Education adapter → education tables with `class_id`

3. **Features are generic:**
   - `AttendanceFeature` works for both
   - Uses adapter to know which tables/fields to use
   - Same code, different data

4. **Clean architecture:**
   - No NULL columns
   - No mixed data
   - Easy to extend each workspace type independently

---

**This architecture scales beautifully as you add more features!** 🚀
