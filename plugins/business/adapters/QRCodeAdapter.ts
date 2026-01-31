import { FeatureAdapter } from '@/core/types/feature';

export const QRCodeAdapter: FeatureAdapter = {
  tables: {
    workspace: 'stores',
  },

  transformData: (data) => data,
};
