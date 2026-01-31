// Education Attendance Adapter
import { FeatureAdapter } from '@/core/types/feature';

/**
 * Adapter for Attendance Feature in Education workspaces
 *
 * Maps generic attendance concepts to education-specific terminology:
 * - People → Students (students table)
 * - Check-ins → Student attendance (attendance_records table)
 * - Shifts → Class sessions (class_sessions table)
 * - Schedules → Session schedules (session_schedules table)
 *
 * Education workspaces use dedicated tables instead of business tables:
 * - Business: staff, check_ins, shift_templates, staff_schedules
 * - Education: students, attendance_records, class_sessions, session_schedules
 */
export const AttendanceAdapter: FeatureAdapter = {
  // Table mappings for database queries
  tables: {
    people: 'students',
    checkIns: 'attendance_records',
    shifts: 'class_sessions',
    schedules: 'session_schedules',
  },

  // Field mappings
  fields: {
    personId: 'student_id',
    workspaceId: 'class_id', // Education uses class_id instead of store_id
    sessionId: 'session_id', // Instead of shift_id
  },

  // Transform data if needed (currently not transforming)
  transformData: (data) => data,
};
