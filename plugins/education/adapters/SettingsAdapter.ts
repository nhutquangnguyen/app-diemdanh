import { FeatureAdapter } from '@/core/types/feature';

export const SettingsAdapter: FeatureAdapter = {
  tables: {
    workspace: 'stores', // Education workspaces are stored in 'stores' table with type='education'
  },

  transformData: (data) => data,
};
