import { FeatureAdapter } from '@/core/types/feature';

export const SchedulingAdapter: FeatureAdapter = {
  tables: {
    schedules: 'shift_templates',
    workspace: 'stores',
  },

  transformData: (data) => data,
};
