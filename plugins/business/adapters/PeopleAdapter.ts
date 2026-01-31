import { FeatureAdapter } from '@/core/types/feature';

export const PeopleAdapter: FeatureAdapter = {
  tables: {
    people: 'staff',
    workspace: 'stores',
  },

  transformData: (data) => data,
};
