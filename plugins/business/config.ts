// Business Plugin Configuration
import { WorkspacePlugin } from '@/core/types/plugin';
import { AttendanceAdapter } from './adapters/AttendanceAdapter';
import { SettingsAdapter } from './adapters/SettingsAdapter';
import { QRCodeAdapter } from './adapters/QRCodeAdapter';
import { SchedulingAdapter } from './adapters/SchedulingAdapter';
import { PeopleAdapter } from './adapters/PeopleAdapter';

export const businessPlugin: WorkspacePlugin = {
  id: 'business',
  name: 'Business Management',
  version: '1.0.0',
  displayName: 'Kinh Doanh',
  icon: '🏪',

  config: {
    peopleLabel: 'Nhân Viên',
    workspaceLabel: 'Cửa Hàng',

    features: [
      {
        id: 'attendance',
        enabled: true,
        config: {
          peopleLabel: 'Nhân Viên',
          checkInLabel: 'Điểm Danh',
          requireSelfie: true,
          requireGPS: true,
          lateThresholdMinutes: 15,
        },
      },
      {
        id: 'settings',
        enabled: true,
        config: {
          workspaceLabel: 'Cửa Hàng',
        },
      },
      {
        id: 'qrcode',
        enabled: true,
        config: {
          workspaceLabel: 'Cửa Hàng',
          peopleLabel: 'Nhân Viên',
          checkInPath: '/scan?workspace={workspaceId}',
        },
      },
      {
        id: 'scheduling',
        enabled: true,
        config: {
          scheduleLabel: 'Lịch Làm Việc',
          itemLabel: 'Ca Làm',
        },
      },
      {
        id: 'people',
        enabled: true,
        config: {
          peopleLabel: 'Nhân Viên',
        },
      },
      {
        id: 'ai-scheduling',
        enabled: true,
        config: {
          workspaceLabel: 'Cửa Hàng',
          peopleLabel: 'Nhân Viên',
        },
      },
    ],

    tabs: [
      {
        id: 'today',
        label: 'Hôm Nay',
        feature: 'attendance',
        icon: '📋',
      },
      {
        id: 'schedule',
        label: 'Lịch',
        feature: 'scheduling',
        icon: '📅',
      },
      {
        id: 'ai-schedule',
        label: 'AI Xếp Lịch',
        feature: 'ai-scheduling',
        icon: '🤖',
      },
      {
        id: 'salary',
        label: 'Lương',
        feature: 'attendance', // Placeholder - will be 'payments' feature later
        icon: '💰',
      },
      {
        id: 'staff',
        label: 'Nhân Viên',
        feature: 'people',
        icon: '👥',
        inMoreMenu: true,
      },
      {
        id: 'qr',
        label: 'Mã QR',
        feature: 'qrcode',
        icon: '📱',
        inMoreMenu: true,
      },
      {
        id: 'settings',
        label: 'Cài Đặt',
        feature: 'settings',
        icon: '⚙️',
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
    // More adapters will be added:
    // payments: SalaryAdapter,
  },

  onRegister: () => {
    console.log('[BusinessPlugin] Business plugin registered');
  },

  onActivate: (workspaceId: string) => {
    console.log(`[BusinessPlugin] Activated for workspace: ${workspaceId}`);
  },

  onDeactivate: () => {
    console.log('[BusinessPlugin] Deactivated');
  },
};
