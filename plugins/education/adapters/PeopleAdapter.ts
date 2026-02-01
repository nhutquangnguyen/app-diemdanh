import { FeatureAdapter } from '@/core/types/feature';
import { EducationPeopleView } from '@/features/people/EducationPeopleView';

/**
 * People Adapter for Education Workspaces
 *
 * Uses a student management view with:
 * - Student-specific fields (MSSV, parent info)
 * - Pending student approvals
 * - Attendance percentage tracking
 */
export const PeopleAdapter: FeatureAdapter = {
  tables: {
    people: 'students',
    workspace: 'stores',
  },

  fields: {
    workspaceId: 'class_id',
  },

  // Use custom people view for education
  components: {
    PeopleView: EducationPeopleView,
  },

  transformData: (data) => data,
};
