// Plugin system type definitions
import { FeatureAdapter, FeatureConfig } from './feature';

export interface WorkspacePlugin {
  id: string;
  name: string;
  version: string;
  displayName?: string; // Display name for UI (e.g., "Giáo Dục", "Kinh Doanh")
  icon?: string; // Icon emoji for UI (e.g., "🎓", "🏪")

  // Plugin configuration
  config: PluginConfig;

  // Lifecycle hooks
  onRegister?: () => void;
  onActivate?: (workspaceId: string) => void;
  onDeactivate?: () => void;

  // Feature adapters
  adapters: Record<string, FeatureAdapter>;

  // Custom components (optional)
  components?: Record<string, React.ComponentType<any>>;
}

export interface PluginConfig {
  features: FeatureConfig[];
  tabs: TabConfig[];
  theme?: ThemeConfig;
  routes?: RouteConfig[];

  // Global plugin labels
  peopleLabel?: string; // e.g., "Nhân Viên", "Học Sinh"
  workspaceLabel?: string; // e.g., "Cửa Hàng", "Lớp Học"
}

export interface TabConfig {
  id: string;
  label: string;
  feature: string; // Feature ID
  icon?: string;
  view?: string; // Optional view variant for the feature
  inMoreMenu?: boolean; // Show in "More" dropdown menu
  showWarningBadge?: boolean; // Show warning badge
}

export interface ThemeConfig {
  primaryColor?: string;
  secondaryColor?: string;
  [key: string]: any;
}

export interface RouteConfig {
  path: string;
  component: React.ComponentType<any>;
  exact?: boolean;
}
