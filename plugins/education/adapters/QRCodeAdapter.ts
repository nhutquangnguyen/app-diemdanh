import { FeatureAdapter } from '@/core/types/feature';

export const QRCodeAdapter: FeatureAdapter = {
  tables: {
    workspace: 'stores', // Education workspaces are stored in 'stores' table
  },

  transformData: (data) => data,
};
