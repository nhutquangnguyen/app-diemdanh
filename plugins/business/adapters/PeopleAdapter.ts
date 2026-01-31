import { FeatureAdapter } from '@/core/types/feature';

export const PeopleAdapter: FeatureAdapter = {
  tables: {
    people: 'staff',
    workspace: 'stores',
  },

  fields: {
    personId: 'staff_id',
    workspaceId: 'store_id',
  },

  transformData: (data) => data,
};
