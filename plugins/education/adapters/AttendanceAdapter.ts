// Education Attendance Adapter
import { FeatureAdapter } from '@/core/types/feature';

/**
 * Adapter for Attendance Feature in Education workspaces
 *
 * Maps generic attendance concepts to education-specific terminology:
 * - People → Students
 * - Check-ins → Student attendance
 * - Shifts → Class sessions
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
  },

  // Transform data if needed (currently not transforming)
  transformData: (data) => data,
};
