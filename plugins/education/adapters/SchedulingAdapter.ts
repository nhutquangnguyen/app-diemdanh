import { FeatureAdapter } from '@/core/types/feature';

export const SchedulingAdapter: FeatureAdapter = {
  tables: {
    schedules: 'class_sessions',
    workspace: 'stores',
  },

  transformData: (data) => data,
};
