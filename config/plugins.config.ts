// Plugin and Feature Registration
// This file registers all features and plugins when the app initializes

import { registerFeature } from '@/core/utils/featureRegistry';
import { registerPlugin } from '@/core/utils/pluginRegistry';

// Import features
import { attendanceFeature } from '@/features/attendance';
import { settingsFeature } from '@/features/settings';
import { qrcodeFeature } from '@/features/qrcode';
import { schedulingFeature } from '@/features/scheduling';
import { peopleFeature } from '@/features/people';
import { aiSchedulingFeature } from '@/features/ai-scheduling';
import { salaryFeature } from '@/features/salary';
import { shiftsFeature } from '@/features/shifts';

// Import plugins
import { businessPlugin } from '@/plugins/business';
import { educationPlugin } from '@/plugins/education';

/**
 * Initialize all features and plugins
 * This should be called once when the app starts
 */
export function initializePlugins() {
  console.log('[PluginSystem] Initializing features and plugins...');

  // Register features first
  registerFeature(attendanceFeature);
  registerFeature(settingsFeature);
  registerFeature(qrcodeFeature);
  registerFeature(schedulingFeature);
  registerFeature(peopleFeature);
  registerFeature(aiSchedulingFeature);
  registerFeature(salaryFeature);
  registerFeature(shiftsFeature);

  // Register plugins
  registerPlugin(businessPlugin);
  registerPlugin(educationPlugin);
  // More plugins will be added here:
  // registerPlugin(projectPlugin);
  // registerPlugin(eventPlugin);

  console.log('[PluginSystem] Initialization complete');
}
