import { Feature } from '@/core/types/feature';
import { SettingsFeature } from './SettingsFeature';

export const settingsFeature: Feature = {
  id: 'settings',
  name: 'Workspace Settings',
  version: '1.0.0',

  component: SettingsFeature,

  configSchema: {
    workspaceLabel: {
      type: 'string',
      default: 'Workspace',
      description: 'Label for workspace (Store, Class, Project, etc.)',
    },
  },

  endpoints: {
    get: '/api/workspaces/:id',
    update: '/api/workspaces/:id',
    delete: '/api/workspaces/:id',
  },
};

export { SettingsFeature };
