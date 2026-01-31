// Core workspace type definitions

export interface Workspace {
  id: string;
  name: string;
  workspace_type: string; // Plugin ID: 'business', 'education', etc.
  owner_id: string;
  config?: WorkspaceConfig;
  created_at: string;
  deleted_at?: string;

  // Type-specific data (dynamically typed based on workspace.workspace_type)
  [key: string]: any;
}

export interface WorkspaceConfig {
  features?: Record<string, FeatureInstanceConfig>;
  settings?: Record<string, any>;
  [key: string]: any;
}

export interface FeatureInstanceConfig {
  enabled?: boolean;
  config?: Record<string, any>;
}

export interface WorkspaceContext {
  workspace: Workspace;
  plugin: any; // Will be typed as WorkspacePlugin from plugin.ts
  loading: boolean;
  error?: Error;
  refresh: () => Promise<void>;
}
