// Business Attendance Adapter
import { FeatureAdapter } from '@/core/types/feature';

/**
 * Adapter for Attendance Feature in Business workspaces
 *
 * Maps generic attendance concepts to business-specific terminology:
 * - People → Staff (staff table)
 * - Check-ins → Staff check-ins (check_ins table)
 * - Shifts → Work shifts (shift_templates table)
 * - Schedules → Staff schedules (staff_schedules table)
 *
 * Business workspaces use these dedicated tables.
 */
export const AttendanceAdapter: FeatureAdapter = {
  // Table mappings for database queries
  tables: {
    people: 'staff',
    checkIns: 'check_ins',
    shifts: 'shift_templates',
    schedules: 'staff_schedules',
  },

  // Field mappings
  fields: {
    personId: 'staff_id',
    workspaceId: 'store_id', // Business uses store_id
    sessionId: 'shift_id', // Instead of session_id
  },

  // Transform data if needed (currently not transforming)
  transformData: (data) => data,
};
