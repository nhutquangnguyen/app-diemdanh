// Scheduling Feature Export
import { Feature } from '@/core/types/feature';
import SchedulingFeature from './SchedulingFeature';

export const schedulingFeature: Feature = {
  id: 'scheduling',
  name: 'Scheduling',
  version: '1.0.0',
  component: SchedulingFeature,

  configSchema: {
    scheduleLabel: {
      type: 'string',
      default: 'Schedule',
      description: 'Label for schedule (Shifts, Timetable, etc.)',
    },
    itemLabel: {
      type: 'string',
      default: 'Item',
      description: 'Label for individual schedule items (Shift, Class, Session, etc.)',
    },
  },
};
