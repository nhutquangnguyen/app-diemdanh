import { FeatureAdapter } from '@/core/types/feature';

export const SchedulingAdapter: FeatureAdapter = {
  tables: {
    people: 'staff',
    shifts: 'shift_templates',
    schedules: 'staff_schedules', // Schedule assignments, not templates
  },

  fields: {
    personId: 'staff_id',
    workspaceId: 'store_id',
    sessionId: 'shift_id',
  },

  transformData: (data) => data,
};
