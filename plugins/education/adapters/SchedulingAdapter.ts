import { FeatureAdapter } from '@/core/types/feature';
import EducationSchedulingFeature from '@/features/scheduling/EducationSchedulingFeature';

/**
 * Scheduling Adapter for Education Workspaces
 *
 * Uses a timetable view (class sessions by day of week)
 * instead of staff scheduling by week
 */
export const SchedulingAdapter: FeatureAdapter = {
  tables: {
    schedules: 'class_sessions',
    workspace: 'stores',
  },

  // Use custom feature component for education
  components: {
    Feature: EducationSchedulingFeature,
  },

  transformData: (data) => data,
};
