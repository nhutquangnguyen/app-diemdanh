// Education Plugin Configuration
import { WorkspacePlugin } from '@/core/types/plugin';
import { AttendanceAdapter } from './adapters/AttendanceAdapter';
import { SettingsAdapter } from './adapters/SettingsAdapter';
import { QRCodeAdapter } from './adapters/QRCodeAdapter';
import { SchedulingAdapter } from './adapters/SchedulingAdapter';
import { PeopleAdapter } from './adapters/PeopleAdapter';

export const educationPlugin: WorkspacePlugin = {
  id: 'education',
  name: 'Education Management',
  version: '1.0.0',
  displayName: 'Giáo Dục',
  icon: '🎓',

  config: {
    peopleLabel: 'Học Sinh',
    workspaceLabel: 'Lớp Học',

    features: [
      {
        id: 'attendance',
        enabled: true,
        config: {
          peopleLabel: 'Học Sinh',
          checkInLabel: 'Điểm Danh',
          requireSelfie: false,
          requireGPS: false,
          lateThresholdMinutes: 15,
        },
      },
      {
        id: 'settings',
        enabled: true,
        config: {
          workspaceLabel: 'Lớp Học',
        },
      },
      {
        id: 'qrcode',
        enabled: true,
        config: {
          workspaceLabel: 'Lớp Học',
          peopleLabel: 'Học Sinh',
          checkInPath: '/scan?workspace={workspaceId}',
        },
      },
      {
        id: 'scheduling',
        enabled: true,
        config: {
          scheduleLabel: 'Thời Khóa Biểu',
          itemLabel: 'Tiết Học',
        },
      },
      {
        id: 'people',
        enabled: true,
        config: {
          peopleLabel: 'Học Sinh',
        },
      },
    ],

    tabs: [
      {
        id: 'today',
        label: 'Hôm Nay',
        feature: 'attendance',
        icon: 'clock-circle',
      },
      {
        id: 'timetable',
        label: 'Thời Khóa Biểu',
        feature: 'scheduling',
        icon: 'calendar',
      },
      {
        id: 'students',
        label: 'Học Sinh',
        feature: 'people',
        icon: 'users',
      },
      {
        id: 'qr',
        label: 'Mã QR',
        feature: 'qrcode',
        icon: 'qrcode',
        inMoreMenu: true,
      },
      {
        id: 'settings',
        label: 'Cài Đặt',
        feature: 'settings',
        icon: 'cog',
        inMoreMenu: true,
      },
    ],
  },

  adapters: {
    attendance: AttendanceAdapter,
    settings: SettingsAdapter,
    qrcode: QRCodeAdapter,
    scheduling: SchedulingAdapter,
    people: PeopleAdapter,
  },

  onRegister: () => {
    console.log('[EducationPlugin] Education plugin registered');
  },

  onActivate: (workspaceId: string) => {
    console.log(`[EducationPlugin] Activated for workspace: ${workspaceId}`);
  },

  onDeactivate: () => {
    console.log('[EducationPlugin] Deactivated');
  },
};
