// Feature system type definitions
import { ReactNode } from 'react';

export interface Feature {
  id: string;
  name: string;
  version: string;

  // Main feature component
  component: React.ComponentType<FeatureProps>;

  // Configuration schema
  configSchema: ConfigSchema;

  // Dependencies (other features required)
  dependencies?: string[];

  // Hooks provided by this feature
  hooks?: Record<string, () => any>;

  // API endpoints
  endpoints?: Record<string, string>;
}

export interface FeatureProps {
  workspaceId: string;
  config: Record<string, any>;
  adapter?: FeatureAdapter;
}

export interface ConfigSchema {
  [key: string]: ConfigField;
}

export interface ConfigField {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  required?: boolean;
  default?: any;
  description?: string;
}

export interface FeatureAdapter {
  // Transform generic feature data to workspace-specific
  transformData?: (data: any) => any;

  // Custom components to override defaults
  components?: Record<string, React.ComponentType<any>>;

  // Custom hooks
  hooks?: Record<string, () => any>;

  // Validation rules
  validation?: Record<string, (value: any) => boolean | string>;

  // Table name mappings for database queries
  tables?: {
    workspace?: string;  // e.g., 'stores' or 'classes'
    people?: string;  // e.g., 'staff' or 'students'
    checkIns?: string;  // e.g., 'check_ins' or 'attendance_records'
    shifts?: string;  // e.g., 'shift_templates' or 'class_sessions'
    schedules?: string;  // e.g., 'staff_schedules' or 'session_schedules'
    [key: string]: string | undefined;
  };

  // Field name mappings
  fields?: {
    personId?: string;  // e.g., 'staff_id' or 'student_id'
    [key: string]: string | undefined;
  };
}

export interface FeatureConfig {
  id: string;
  enabled?: boolean;
  config?: Record<string, any>;
  view?: string; // Optional view variant
}
