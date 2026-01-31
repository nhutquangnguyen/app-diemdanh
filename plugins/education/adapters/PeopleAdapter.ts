import { FeatureAdapter } from '@/core/types/feature';

export const PeopleAdapter: FeatureAdapter = {
  tables: {
    people: 'students',
    workspace: 'stores',
  },

  transformData: (data) => data,
};
