// Shifts Feature Export
import { Feature } from '@/core/types/feature';
import ShiftsFeature from './ShiftsFeature';

export const shiftsFeature: Feature = {
  id: 'shifts',
  name: 'Shift Management',
  version: '1.0.0',
  component: ShiftsFeature,

  configSchema: {
    workspaceLabel: {
      type: 'string',
      default: 'Workspace',
      description: 'Label for workspace in this context',
    },
  },
};
