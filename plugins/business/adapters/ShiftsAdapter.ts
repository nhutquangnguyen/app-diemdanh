// Business Shifts Adapter
import { FeatureAdapter } from '@/core/types/feature';

/**
 * Adapter for Shifts Feature in Business workspaces
 */
export const ShiftsAdapter: FeatureAdapter = {
  // Table mappings
  tables: {
    shifts: 'shift_templates',
    workspace: 'stores',
  },

  // Field mappings
  fields: {
    workspaceId: 'store_id',
  },

  // Transform data if needed
  transformData: (data) => data,
};
