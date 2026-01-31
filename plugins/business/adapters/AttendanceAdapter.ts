// Business Attendance Adapter
import { FeatureAdapter } from '@/core/types/feature';

/**
 * Adapter for Attendance Feature in Business workspaces
 *
 * Maps generic attendance concepts to business-specific terminology:
 * - People → Staff
 * - Check-ins → Staff check-ins
 * - Shifts → Work shifts
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
  },

  // Transform data if needed (currently not transforming)
  transformData: (data) => data,
};
