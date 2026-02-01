// Attendance feature registration
import { Feature } from '@/core/types/feature';
import { AttendanceFeature } from './AttendanceFeature';

export const attendanceFeature: Feature = {
  id: 'attendance',
  name: 'Attendance Management',
  version: '1.0.0',

  component: AttendanceFeature,

  configSchema: {
    peopleLabel: {
      type: 'string',
      default: 'People',
      description: 'Label for people in this workspace (Staff, Students, Team, etc.)',
    },
    checkInLabel: {
      type: 'string',
      default: 'Check-in',
      description: 'Label for check-in action',
    },
    requireSelfie: {
      type: 'boolean',
      default: false,
      description: 'Require selfie photo for check-in',
    },
    requireGPS: {
      type: 'boolean',
      default: false,
      description: 'Require GPS location for check-in',
    },
    lateThresholdMinutes: {
      type: 'number',
      default: 15,
      description: 'Minutes after start time to mark as late',
    },
  },

  endpoints: {
    list: '/api/attendance',
    create: '/api/attendance',
    update: '/api/attendance/:id',
    delete: '/api/attendance/:id',
  },
};

export { AttendanceFeature };

// Export hooks
export { useDashboardData } from './hooks/useDashboardData';
