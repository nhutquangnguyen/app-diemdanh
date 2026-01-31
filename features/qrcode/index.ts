import { Feature } from '@/core/types/feature';
import { QRCodeFeature } from './QRCodeFeature';

export const qrcodeFeature: Feature = {
  id: 'qrcode',
  name: 'QR Code',
  version: '1.0.0',

  component: QRCodeFeature,

  configSchema: {
    workspaceLabel: {
      type: 'string',
      default: 'Workspace',
      description: 'Label for workspace type',
    },
    peopleLabel: {
      type: 'string',
      default: 'People',
      description: 'Label for people (Staff, Students, etc.)',
    },
    checkInPath: {
      type: 'string',
      default: '/checkin',
      description: 'Path for check-in URL',
    },
  },

  endpoints: {},
};

export { QRCodeFeature };
