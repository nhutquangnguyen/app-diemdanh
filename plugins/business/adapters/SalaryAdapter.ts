// Business Salary Adapter
import { FeatureAdapter } from '@/core/types/feature';

/**
 * Adapter for Salary Feature in Business workspaces
 */
export const SalaryAdapter: FeatureAdapter = {
  // Table mappings
  tables: {
    people: 'staff',
    checkIns: 'check_ins',
    confirmations: 'salary_confirmations',
    schedules: 'staff_schedules',
    shifts: 'shift_templates',
  },

  // Field mappings
  fields: {
    personId: 'staff_id',
    workspaceId: 'store_id',
  },

  // Transform data if needed
  transformData: (data) => data,
};
