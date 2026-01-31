// AI Scheduling Feature Export
import { Feature } from '@/core/types/feature';
import AISchedulingFeature from './AISchedulingFeature';

export const aiSchedulingFeature: Feature = {
  id: 'ai-scheduling',
  name: 'AI Scheduling',
  version: '1.0.0',
  component: AISchedulingFeature,

  configSchema: {
    workspaceLabel: {
      type: 'string',
      default: 'Workspace',
      description: 'Label for workspace',
    },
    peopleLabel: {
      type: 'string',
      default: 'People',
      description: 'Label for people (Staff, Employees, etc.)',
    },
  },
};
