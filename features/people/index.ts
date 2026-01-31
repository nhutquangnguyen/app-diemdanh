// People Feature Export
import { Feature } from '@/core/types/feature';
import PeopleFeature from './PeopleFeature';

export const peopleFeature: Feature = {
  id: 'people',
  name: 'People Management',
  version: '1.0.0',
  component: PeopleFeature,

  configSchema: {
    peopleLabel: {
      type: 'string',
      default: 'People',
      description: 'Label for people in this workspace (Staff, Students, Members, etc.)',
    },
  },
};
