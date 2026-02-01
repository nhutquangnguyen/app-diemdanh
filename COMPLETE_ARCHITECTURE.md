# Diemdanh Application Architecture Documentation

## Executive Summary

Diemdanh is a sophisticated multi-workspace attendance and management system built with Next.js and a **plugin-based architecture**. The application supports multiple workspace types (Business, Education) with shared features that adapt to each workspace context through a **feature adapter pattern**.

This architecture enables:
- **Workspace Polymorphism**: Single codebase supporting completely different workspace types
- **Feature Reusability**: Core features (Attendance, Scheduling, People Management) work across all workspace types
- **Type-Safe Customization**: Adapters map generic feature concepts to workspace-specific database tables and fields
- **Extensible Plugin System**: New workspace types can be added without modifying core feature code

---

## Table of Contents

1. [Overall Architecture](#overall-architecture)
2. [Directory Structure](#directory-structure)
3. [Plugin System](#plugin-system)
4. [Feature System](#feature-system)
5. [Adapter Pattern](#adapter-pattern)
6. [Core Hooks & Components](#core-hooks--components)
7. [Database Structure](#database-structure)
8. [Authentication & Routing](#authentication--routing)
9. [UI Component System](#ui-component-system)
10. [Data Flow Examples](#data-flow-examples)

---

## Overall Architecture

### High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER INTERFACE LAYER                     │
│  (Pages, Components using PageLayout, TabNavigation, Cards)    │
└──────────────────┬──────────────────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────────────────┐
│                  WORKSPACE SHELL (Router)                       │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  useWorkspace Hook: Loads workspace + plugin            │   │
│  │  useFeature Hook: Resolves feature config + adapter     │   │
│  │  WorkspaceShell: Routes to feature component            │   │
│  └─────────────────────────────────────────────────────────┘   │
└──────────────────┬──────────────────────────────────────────────┘
                   │
       ┌───────────┼───────────┬───────────────┐
       │           │           │               │
┌──────▼─────┐ ┌──▼──────┐ ┌─▼────────┐ ┌─────▼──────┐
│ Plugin      │ │ Feature │ │ Adapter  │ │ Database   │
│ Registry    │ │ Registry│ │ Pattern  │ │ (Supabase) │
└──────┬─────┘ └──┬──────┘ └─┬────────┘ └─────┬──────┘
       │          │          │                │
  ┌────▼──────────▼──────────▼────────────────▼─────┐
  │        PLUGIN CONFIGURATION LAYER               │
  │                                                 │
  │  ┌────────────────────────────────────────┐    │
  │  │  Business Plugin (🏪 Kinh Doanh)       │    │
  │  │  - Tables: stores, staff, check_ins    │    │
  │  │  - Features: Attendance, Scheduling... │    │
  │  │  - Adapters for each feature           │    │
  │  └────────────────────────────────────────┘    │
  │                                                 │
  │  ┌────────────────────────────────────────┐    │
  │  │  Education Plugin (🎓 Giáo Dục)        │    │
  │  │  - Tables: classes, students,records   │    │
  │  │  - Features: Attendance, Scheduling... │    │
  │  │  - Different adapters (different tables)│   │
  │  └────────────────────────────────────────┘    │
  └───────────────────────────────────────────────┘
```

### Core Design Principles

1. **Plugin-Based Architecture**: Workspace types (business, education) are plugins with their own configuration
2. **Feature Abstraction**: Features (attendance, scheduling) are generic and reusable
3. **Adapter Pattern**: Adapters map generic features to workspace-specific database schemas
4. **Registry Pattern**: Plugins and features are registered in global registries for dynamic lookup
5. **Type Safety**: Full TypeScript support with clear interfaces for plugins, features, and adapters
6. **Client-First**: Next.js App Router with client components for interactivity

---

## Directory Structure

### Complete Directory Map

```
/Users/product/Projects/ck_projects/diemdanh/app/
├── core/                          # Core plugin & feature system
│   ├── types/
│   │   ├── index.ts              # Re-exports all core types
│   │   ├── workspace.ts          # Workspace interface & context
│   │   ├── plugin.ts             # WorkspacePlugin interface
│   │   └── feature.ts            # Feature & FeatureAdapter interfaces
│   ├── utils/
│   │   ├── pluginRegistry.ts    # Global plugin registry (singleton)
│   │   └── featureRegistry.ts   # Global feature registry (singleton)
│   ├── hooks/
│   │   ├── useWorkspace.ts      # Load workspace + plugin from DB
│   │   └── useFeature.ts        # Resolve feature config + adapter
│   └── components/
│       └── WorkspaceShell.tsx   # Router component (tabs → features)
│
├── plugins/                       # Workspace type implementations
│   ├── business/                 # Business/Store workspace type
│   │   ├── index.ts             # Re-export businessPlugin
│   │   ├── config.ts            # Plugin configuration & metadata
│   │   └── adapters/
│   │       ├── AttendanceAdapter.ts      # Maps staff→people, check_ins→checkIns
│   │       ├── SchedulingAdapter.ts      # Maps staff_schedules
│   │       ├── PeopleAdapter.ts
│   │       ├── QRCodeAdapter.ts
│   │       ├── SettingsAdapter.ts
│   │       ├── SalaryAdapter.ts         # Business-specific
│   │       └── ShiftsAdapter.ts         # Business-specific
│   │
│   └── education/                # Education/Class workspace type
│       ├── index.ts
│       ├── config.ts
│       └── adapters/
│           ├── AttendanceAdapter.ts     # Maps students→people, attendance_records
│           ├── SchedulingAdapter.ts     # Maps session_schedules
│           ├── PeopleAdapter.ts
│           ├── QRCodeAdapter.ts
│           └── SettingsAdapter.ts
│
├── features/                      # Feature implementations (generic, workspace-agnostic)
│   ├── attendance/
│   │   ├── index.ts             # Feature registration
│   │   ├── AttendanceFeature.tsx # Main feature component
│   │   ├── TodayView.tsx         # Business version (staff view)
│   │   └── EducationTodayView.tsx # Education version (student view)
│   │
│   ├── scheduling/
│   │   ├── index.ts
│   │   ├── SchedulingFeature.tsx
│   │   ├── ScheduleView.tsx
│   │   └── EducationSchedulingView.tsx
│   │
│   ├── people/
│   │   ├── index.ts
│   │   ├── PeopleFeature.tsx
│   │   ├── PeopleListView.tsx
│   │   └── EducationPeopleView.tsx
│   │
│   ├── qrcode/
│   │   ├── index.ts
│   │   ├── QRCodeFeature.tsx
│   │   └── QRCodeView.tsx
│   │
│   ├── salary/              # Business-only feature
│   │   ├── index.ts
│   │   └── SalaryFeature.tsx
│   │
│   ├── shifts/              # Business-only feature
│   │   ├── index.ts
│   │   └── ShiftsFeature.tsx
│   │
│   ├── ai-scheduling/       # Business-only feature
│   │   ├── index.ts
│   │   └── AISchedulingFeature.tsx
│   │
│   └── settings/
│       ├── index.ts
│       ├── SettingsFeature.tsx
│       └── SettingsView.tsx
│
├── components/                    # Reusable UI components
│   ├── ui/                       # Design system components
│   │   ├── Button.tsx           # Multi-variant button
│   │   ├── Input.tsx            # Form input with label
│   │   ├── Select.tsx           # Dropdown selector
│   │   ├── Card.tsx             # Card container
│   │   ├── Badge.tsx            # Status badge
│   │   ├── PageLayout.tsx        # Full-page layout wrapper
│   │   ├── PageHeader.tsx        # Page title & breadcrumbs
│   │   ├── TabNavigation.tsx     # Responsive tab navigation
│   │   ├── LoadingSpinner.tsx
│   │   ├── EmptyState.tsx
│   │   ├── IconButton.tsx
│   │   └── README.md             # Design system documentation
│   │
│   ├── common/                   # Shared feature components
│   │   ├── CheckInFlow.tsx
│   │   ├── PermissionGuidance.tsx
│   │   ├── ImageModal.tsx
│   │   └── TabNavigation.tsx     # Backup tab component
│   │
│   └── [feature-specific]/       # Feature-specific components
│       ├── today/
│       ├── student/
│       ├── salary/
│       └── ...
│
├── app/                           # Next.js App Router pages
│   ├── layout.tsx                # Root layout with providers
│   ├── page.tsx                  # Home/dashboard page
│   ├── owner/
│   │   ├── page.tsx              # Owner dashboard
│   │   └── [id]/
│   │       ├── page.tsx          # Workspace detail (DEPRECATED, use /workspaces)
│   │       └── [path]/           # Nested routes
│   ├── workspaces/
│   │   └── [id]/
│   │       └── page.tsx          # CURRENT: Unified workspace router
│   ├── member/
│   │   └── [id]/
│   │       ├── page.tsx
│   │       ├── checkin/
│   │       └── enroll/
│   ├── auth/
│   │   ├── login/
│   │   ├── signup/
│   │   ├── verify-email/
│   │   ├── callback/
│   │   └── ...
│   ├── scan/                     # QR code check-in page
│   ├── api/                      # API routes
│   │   ├── attendance/
│   │   ├── auth/
│   │   ├── check-ins/
│   │   ├── schedules/
│   │   ├── salary/
│   │   ├── staff/
│   │   └── ...
│   └── globals.css               # Global styles
│
├── config/
│   └── plugins.config.ts         # Plugin registration (initialization)
│
├── lib/                           # Utility functions
│   ├── supabase.ts               # Supabase client initialization
│   ├── auth.ts                   # Authentication utilities
│   ├── geo.ts                    # GPS utilities
│   ├── salaryCalculations.ts     # Salary math
│   ├── smartSchedule.ts          # AI scheduling algorithm
│   └── ...
│
├── types/
│   └── index.ts                  # Database type definitions (Store, Staff, Student, etc.)
│
├── migrations/                    # Database schema migrations
│   ├── RUN_THIS_IN_SUPABASE.sql
│   ├── create_education_tables_*.sql
│   └── ...
│
├── hooks/                        # Deprecated (use core/hooks instead)
│
└── middleware.ts                 # Next.js middleware (authentication checking)
```

### Key Directory Purposes

| Directory | Purpose |
|-----------|---------|
| `core/` | Plugin system (registries, types, base hooks) |
| `plugins/` | Workspace type implementations (business, education) |
| `features/` | Generic, reusable features (workspace-agnostic) |
| `components/` | React components (UI system + feature-specific) |
| `app/` | Next.js routing and pages |
| `lib/` | Business logic utilities |
| `types/` | TypeScript type definitions from database |
| `migrations/` | Supabase database schema |

---

## Plugin System

### What is a Plugin?

A **plugin** represents a complete workspace type implementation. It's a configuration object that tells the system:
- What features are available
- What tabs/navigation to show
- How to adapt generic features to workspace-specific databases
- What custom components to use

### Plugin Types

Currently implemented:
1. **Business Plugin** (`plugins/business/`) - For stores/retail businesses
2. **Education Plugin** (`plugins/education/`) - For classes/schools

### Plugin Structure

```typescript
// /plugins/business/config.ts
export const businessPlugin: WorkspacePlugin = {
  id: 'business',                      // Unique identifier
  name: 'Business Management',         // Display name (English)
  version: '1.0.0',
  displayName: 'Kinh Doanh',          // Display name (Vietnamese)
  icon: '🏪',                         // Emoji icon

  config: {
    peopleLabel: 'Nhân Viên',         // What to call people in this workspace
    workspaceLabel: 'Cửa Hàng',       // What to call workspace
    
    features: [                        // Which features are enabled
      { id: 'attendance', enabled: true, config: { ... } },
      { id: 'scheduling', enabled: true, config: { ... } },
      { id: 'salary', enabled: true, config: { ... } },
      // etc.
    ],
    
    tabs: [                            // What tabs to show in the UI
      { id: 'today', label: 'Hôm Nay', feature: 'attendance', icon: 'clock-circle' },
      { id: 'schedule', label: 'Lịch', feature: 'scheduling', icon: 'calendar' },
      { id: 'salary', label: 'Lương', feature: 'salary', icon: 'currency-dollar' },
      { id: 'ai-schedule', label: 'Xếp lịch AI', feature: 'ai-scheduling', inMoreMenu: true },
      // etc.
    ],
  },

  adapters: {                          // Feature adapters for this workspace type
    attendance: AttendanceAdapter,
    scheduling: SchedulingAdapter,
    salary: SalaryAdapter,
    // etc.
  },

  // Lifecycle hooks
  onRegister: () => { console.log('[BusinessPlugin] Registered'); },
  onActivate: (workspaceId: string) => { console.log(`[BusinessPlugin] Activated for ${workspaceId}`); },
  onDeactivate: () => { console.log('[BusinessPlugin] Deactivated'); },
};
```

### How Plugins Are Registered

```typescript
// config/plugins.config.ts - Called on app initialization
export function initializePlugins() {
  // Register features first (generic implementations)
  registerFeature(attendanceFeature);
  registerFeature(schedulingFeature);
  registerFeature(salaryFeature);
  // ... etc

  // Register plugins (workspace type implementations)
  registerPlugin(businessPlugin);
  registerPlugin(educationPlugin);
}
```

This happens in the `PluginProvider` component:

```typescript
// components/PluginProvider.tsx
export function PluginProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    initializePlugins();  // Called once on app startup
    setInitialized(true);
  }, []);
  // ...
}
```

Which wraps the entire app:

```typescript
// components/Providers.tsx
export function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <PluginProvider>
        {children}
      </PluginProvider>
    </QueryClientProvider>
  );
}
```

### Plugin Registry

The plugin registry is a **singleton** that stores all registered plugins:

```typescript
// core/utils/pluginRegistry.ts
class PluginRegistry {
  private plugins: Map<string, WorkspacePlugin> = new Map();

  register(plugin: WorkspacePlugin): void {
    // Called by initializePlugins()
    this.plugins.set(plugin.id, plugin);
  }

  get(pluginId: string): WorkspacePlugin | undefined {
    // Called by useWorkspace hook
    return this.plugins.get(pluginId);
  }

  getAll(): WorkspacePlugin[] {
    return Array.from(this.plugins.values());
  }
  // ... etc
}
```

### Plugin Loading Flow

```
1. App Starts
   ↓
2. Root Layout includes <Providers>
   ↓
3. <PluginProvider> calls initializePlugins()
   ↓
4. businessPlugin and educationPlugin are registered in pluginRegistry
   ↓
5. User navigates to /workspaces/[id]
   ↓
6. WorkspacePage calls useWorkspace(workspaceId)
   ↓
7. useWorkspace loads workspace from DB:
   - Reads workspace.workspace_type (e.g., 'business')
   - Calls getPlugin('business') to retrieve the plugin
   - Returns { workspace, plugin, loading, error }
   ↓
8. <WorkspaceShell> uses plugin config to render tabs
```

---

## Feature System

### What is a Feature?

A **feature** is a reusable piece of functionality that works across all workspace types. Examples:
- Attendance tracking (different for staff vs students, but same core logic)
- Scheduling (different for shift templates vs class sessions, but same core logic)
- People management (different for staff vs students, but same core logic)

### Feature Structure

```typescript
// features/attendance/index.ts
export const attendanceFeature: Feature = {
  id: 'attendance',
  name: 'Attendance Management',
  version: '1.0.0',

  // Main component (receives FeatureProps)
  component: AttendanceFeature,

  // Configuration schema (describes what config this feature accepts)
  configSchema: {
    peopleLabel: {
      type: 'string',
      default: 'People',
      description: 'Label for people in this workspace (Staff, Students, etc.)',
    },
    checkInLabel: {
      type: 'string',
      default: 'Check-in',
    },
    requireSelfie: {
      type: 'boolean',
      default: false,
    },
    requireGPS: {
      type: 'boolean',
      default: false,
    },
    lateThresholdMinutes: {
      type: 'number',
      default: 15,
    },
  },

  // API endpoints
  endpoints: {
    list: '/api/attendance',
    create: '/api/attendance',
    update: '/api/attendance/:id',
  },
};
```

### Feature Component

```typescript
// features/attendance/AttendanceFeature.tsx
export function AttendanceFeature({ workspaceId, config, adapter }: FeatureProps) {
  // config: merged defaults + plugin-specific config
  // adapter: workspace-specific data adapter
  // workspaceId: which workspace this is for

  const peopleTable = adapter?.tables?.people || 'staff';  // "staff" for business, "students" for education
  const checkInsTable = adapter?.tables?.checkIns || 'check_ins';

  // Load data using adapted table names
  const { data: people } = await supabase
    .from(peopleTable)
    .select('*')
    .eq(adapter?.fields?.workspaceId || 'store_id', workspaceId);

  // Render appropriate view based on workspace type
  const ViewComponent = adapter?.components?.TodayView || TodayView;

  return <ViewComponent people={people} config={config} />;
}
```

### Feature Registry

Similar to plugin registry, stores all registered features:

```typescript
// core/utils/featureRegistry.ts
class FeatureRegistry {
  private features: Map<string, Feature> = new Map();

  register(feature: Feature): void {
    this.features.set(feature.id, feature);
  }

  get(featureId: string): Feature | undefined {
    return this.features.get(featureId);
  }

  validateConfig(featureId: string, config: Record<string, any>) {
    // Validates config against feature's configSchema
  }
  // ... etc
}
```

### Enabling/Disabling Features Per Workspace Type

```typescript
// plugins/business/config.ts
features: [
  { id: 'attendance', enabled: true, config: { ... } },
  { id: 'salary', enabled: true, config: { ... } },     // ✅ Business has salary
  { id: 'shifts', enabled: true, config: { ... } },     // ✅ Business has shifts
]

// plugins/education/config.ts
features: [
  { id: 'attendance', enabled: true, config: { ... } },
  { id: 'salary', enabled: false, config: { ... } },    // ❌ Education doesn't have salary
  { id: 'shifts', enabled: false, config: { ... } },    // ❌ Education doesn't have shifts
]
```

---

## Adapter Pattern

### What is an Adapter?

An **adapter** is an object that maps a generic feature to workspace-specific:
- Database table names
- Field names
- Custom components
- Custom validation rules
- Data transformation logic

### Why Adapters?

The database schema differs significantly between workspace types:

**Business Workspace Tables:**
- `stores` (workspaces)
- `staff` (people)
- `check_ins` (attendance)
- `shift_templates` (shift definitions)
- `staff_schedules` (who works when)

**Education Workspace Tables:**
- `stores` (classes, using same table)
- `students` (people)
- `attendance_records` (attendance)
- `class_sessions` (session definitions)
- `session_schedules` (who attends when)

### Adapter Structure

```typescript
// plugins/business/adapters/AttendanceAdapter.ts
export const AttendanceAdapter: FeatureAdapter = {
  // Table name mappings
  tables: {
    people: 'staff',
    checkIns: 'check_ins',
    shifts: 'shift_templates',
    schedules: 'staff_schedules',
  },

  // Field name mappings
  fields: {
    personId: 'staff_id',                    // Generic "personId" → "staff_id"
    workspaceId: 'store_id',                 // Generic "workspaceId" → "store_id"
    sessionId: 'shift_id',                   // Generic "sessionId" → "shift_id"
  },

  // Data transformation (if needed)
  transformData: (data) => data,

  // Custom components (optional)
  components: {
    // Could override TodayView with business-specific version
  },

  // Custom hooks (optional)
  hooks: {},

  // Validation rules (optional)
  validation: {},
};

// plugins/education/adapters/AttendanceAdapter.ts
export const AttendanceAdapter: FeatureAdapter = {
  tables: {
    people: 'students',                      // ← Different table
    checkIns: 'attendance_records',          // ← Different table
    shifts: 'class_sessions',                // ← Different table
    schedules: 'session_schedules',          // ← Different table
  },

  fields: {
    personId: 'student_id',                  // ← Different field
    workspaceId: 'class_id',                 // ← Different field
    sessionId: 'session_id',                 // ← Different field
  },

  transformData: (data) => data,

  components: {
    TodayView: EducationTodayView,           // Use education-specific view
  },
};
```

### How Adapters Are Used

In the feature component:

```typescript
// features/attendance/AttendanceFeature.tsx
export function AttendanceFeature({ workspaceId, config, adapter }: FeatureProps) {
  // Get table names from adapter (or use defaults for business)
  const peopleTable = adapter?.tables?.people || 'staff';
  const checkInsTable = adapter?.tables?.checkIns || 'check_ins';

  // Get field names from adapter
  const personIdField = adapter?.fields?.personId || 'staff_id';
  const workspaceIdField = adapter?.fields?.workspaceId || 'store_id';

  // Query using adapted names
  const { data: people } = await supabase
    .from(peopleTable)                    // "staff" or "students"
    .select('*')
    .eq(workspaceIdField, workspaceId);   // "store_id" or "class_id"

  // Use custom component if provided by adapter
  const ViewComponent = adapter?.components?.TodayView || TodayView;

  return <ViewComponent people={people} />;
}
```

### Adapter Lookup in Plugin

```typescript
// plugins/business/config.ts
adapters: {
  attendance: AttendanceAdapter,
  scheduling: SchedulingAdapter,
  people: PeopleAdapter,
  salary: SalaryAdapter,
  // etc.
}
```

The adapter is passed to the feature component via the `useFeature` hook.

---

## Core Hooks & Components

### useWorkspace Hook

Loads workspace data and resolves the appropriate plugin.

```typescript
// core/hooks/useWorkspace.ts
export function useWorkspace(workspaceId: string): UseWorkspaceResult {
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [plugin, setPlugin] = useState<WorkspacePlugin | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | undefined>(undefined);

  async function loadWorkspace() {
    // 1. Load workspace from database
    const { data } = await supabase
      .from('stores')
      .select('*')
      .eq('id', workspaceId)
      .single();

    // 2. Get workspace type (e.g., 'business' or 'education')
    const workspaceType = data.workspace_type || 'business';

    // 3. Look up plugin from registry
    const loadedPlugin = getPlugin(workspaceType);

    // 4. Call plugin's lifecycle hooks
    loadedPlugin?.onActivate?.(workspaceId);

    setWorkspace(data);
    setPlugin(loadedPlugin);
  }

  useEffect(() => {
    loadWorkspace();

    return () => {
      // Cleanup: call onDeactivate when unmounting
      plugin?.onDeactivate?.();
    };
  }, [workspaceId]);

  return { workspace, plugin, loading, error, refresh: loadWorkspace };
}
```

### useFeature Hook

Resolves feature configuration and adapter based on plugin.

```typescript
// core/hooks/useFeature.ts
export function useFeature({ plugin, featureId }: UseFeatureOptions): UseFeatureResult {
  return useMemo(() => {
    // 1. Get feature from registry
    const feature = getFeature(featureId);  // E.g., attendanceFeature

    if (!feature) return { feature: null, config: {}, enabled: false, adapter: undefined };

    // 2. Find feature config in plugin
    const featureConfig = plugin.config.features.find(f => f.id === featureId);

    // 3. Merge defaults with plugin config
    const config = {
      ...getDefaultConfig(feature),
      ...(featureConfig?.config || {}),
    };

    // 4. Get adapter from plugin
    const adapter = plugin.adapters[featureId];

    // 5. Check if feature is enabled
    const enabled = featureConfig?.enabled !== false;

    return { feature, config, enabled, adapter };
  }, [plugin, featureId]);
}
```

### WorkspaceShell Component

Routes between tabs and renders the appropriate feature.

```typescript
// core/components/WorkspaceShell.tsx
export function WorkspaceShell({ workspace, plugin }: WorkspaceShellProps) {
  const [activeTab, setActiveTab] = useState('today');

  // Get current tab configuration from plugin
  const currentTabConfig = plugin.config.tabs.find(t => t.id === activeTab);

  // Resolve feature and adapter for this tab
  const { feature, config, enabled, adapter } = useFeature({
    plugin,
    featureId: currentTabConfig.feature,
  });

  // Render feature component
  const FeatureComponent = adapter?.components?.Feature || feature.component;

  return (
    <PageLayout>
      <PageHeader title={workspace.name} subtitle={plugin.displayName} />
      
      <TabNavigation
        tabs={plugin.config.tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      <Card>
        <FeatureComponent
          workspaceId={workspace.id}
          config={config}
          adapter={adapter}
        />
      </Card>
    </PageLayout>
  );
}
```

---

## Database Structure

### Unified Stores Table

All workspace types use the same `stores` table with `workspace_type` discriminator:

```sql
CREATE TABLE stores (
  id UUID PRIMARY KEY,
  owner_id UUID NOT NULL,
  name TEXT NOT NULL,
  workspace_type TEXT NOT NULL,  -- 'business' or 'education'

  -- Business fields
  address TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  qr_code TEXT,
  radius_meters INT,

  -- Education fields
  subject TEXT,
  grade_level TEXT,
  room_number TEXT,
  academic_year TEXT,

  -- Common fields
  deleted_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
);
```

### Business-Specific Tables

```sql
-- Staff (people in business workspaces)
CREATE TABLE staff (
  id UUID PRIMARY KEY,
  store_id UUID REFERENCES stores(id),
  user_id UUID REFERENCES auth.users(id),
  email TEXT NOT NULL,
  full_name TEXT,
  salary_type 'hourly' | 'monthly' | 'daily',
  hour_rate DECIMAL(10, 2),
  status 'active' | 'invited' | 'expired' | 'inactive',
  deleted_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
);

-- Check-ins (attendance records for staff)
CREATE TABLE check_ins (
  id UUID PRIMARY KEY,
  staff_id UUID REFERENCES staff(id),
  store_id UUID REFERENCES stores(id),
  shift_template_id UUID REFERENCES shift_templates(id),
  check_in_time TIMESTAMP,
  check_out_time TIMESTAMP,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  selfie_url TEXT,
  status 'success' | 'late' | 'wrong_location',
  created_at TIMESTAMP DEFAULT NOW(),
);

-- Shift Templates (shift definitions)
CREATE TABLE shift_templates (
  id UUID PRIMARY KEY,
  store_id UUID REFERENCES stores(id),
  name TEXT NOT NULL,
  start_time TIME,
  end_time TIME,
  color TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
);

-- Staff Schedules (who works when)
CREATE TABLE staff_schedules (
  id UUID PRIMARY KEY,
  staff_id UUID REFERENCES staff(id),
  store_id UUID REFERENCES stores(id),
  shift_template_id UUID REFERENCES shift_templates(id),
  scheduled_date DATE,
  created_at TIMESTAMP DEFAULT NOW(),
);

-- Salary adjustments
CREATE TABLE salary_adjustments (
  id UUID PRIMARY KEY,
  staff_id UUID REFERENCES staff(id),
  store_id UUID REFERENCES stores(id),
  type 'increase' | 'decrease' | 'bonus' | 'penalty' | 'overtime',
  amount DECIMAL(10, 2),
  created_at TIMESTAMP DEFAULT NOW(),
);
```

### Education-Specific Tables

```sql
-- Students (people in education workspaces)
CREATE TABLE students (
  id UUID PRIMARY KEY,
  class_id UUID REFERENCES stores(id),  -- References stores where workspace_type='education'
  user_id UUID REFERENCES auth.users(id),
  full_name TEXT NOT NULL,
  student_id TEXT,
  email TEXT,
  parent_name TEXT,
  parent_email TEXT,
  status 'active' | 'invited' | 'inactive' | 'withdrawn',
  enrollment_date DATE,
  created_at TIMESTAMP DEFAULT NOW(),
);

-- Attendance Records (attendance for students)
CREATE TABLE attendance_records (
  id UUID PRIMARY KEY,
  student_id UUID REFERENCES students(id),
  class_id UUID REFERENCES stores(id),
  session_id UUID REFERENCES class_sessions(id),
  attendance_date DATE,
  status 'present' | 'absent' | 'late' | 'excused',
  marked_by 'teacher' | 'student' | 'system',
  marked_at TIMESTAMP,
  note TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
);

-- Class Sessions (session definitions, recurring)
CREATE TABLE class_sessions (
  id UUID PRIMARY KEY,
  class_id UUID REFERENCES stores(id),
  name TEXT NOT NULL,
  day_of_week INT,  -- 0-6 (Sunday-Saturday)
  start_time TIME,
  end_time TIME,
  color TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
);

-- Session Schedules (when sessions occur)
CREATE TABLE session_schedules (
  id UUID PRIMARY KEY,
  class_id UUID REFERENCES stores(id),
  session_id UUID REFERENCES class_sessions(id),
  scheduled_date DATE,
  created_at TIMESTAMP DEFAULT NOW(),
);
```

### Shared Tables

```sql
-- Users (Supabase auth)
CREATE TABLE auth.users (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE,
  email_confirmed_at TIMESTAMP,
  -- Other Supabase fields...
);
```

### Table Mapping in Adapters

The adapter pattern maps these tables:

| Concept | Business Table | Education Table | Adapter Field |
|---------|----------------|-----------------|---------------|
| Workspace | stores | stores | (same) |
| People | staff | students | `tables.people` |
| Attendance | check_ins | attendance_records | `tables.checkIns` |
| Shift Definition | shift_templates | class_sessions | `tables.shifts` |
| Schedule | staff_schedules | session_schedules | `tables.schedules` |
| Person ID | staff_id | student_id | `fields.personId` |
| Workspace ID | store_id | class_id | `fields.workspaceId` |
| Session ID | shift_id | session_id | `fields.sessionId` |

---

## Authentication & Routing

### Routing Architecture

**Workspace Access Paths:**

1. **Employee/Student Entry Point** → `/` (home page)
   - Shows available workspaces to join
   - Staff can check in to business workspaces
   - Students can enroll in education workspaces

2. **Owner Dashboard** → `/owner` (owner workspace list)
   - Shows workspaces owned by current user
   - Can create new workspaces

3. **Workspace Detail** → `/workspaces/[id]` (unified workspace router)
   - Loads workspace type from database
   - Resolves appropriate plugin
   - Renders tabs and features based on plugin config

4. **Deprecated Path** → `/owner/[id]`
   - Still works but redirects to `/workspaces/[id]`

### Workspace Loading Flow

```
User visits /workspaces/123
  ↓
WorkspacePage component
  ↓
useWorkspace(workspaceId='123') hook
  ↓
Supabase query: SELECT * FROM stores WHERE id='123'
  ↓
Get workspace.workspace_type (e.g., 'business')
  ↓
getPlugin('business') from pluginRegistry
  ↓
Call plugin.onActivate('123')
  ↓
Return { workspace, plugin, loading, error }
  ↓
WorkspaceShell renders with plugin.config.tabs
```

### Tab Routing in WorkspaceShell

```typescript
// Tabs are stored in URL: /workspaces/123?tab=schedule
const activeTab = searchParams.get('tab') || plugin.config.tabs[0].id;

// When tab changes, update URL
const updateActiveTab = (tabId: string) => {
  router.replace(`${pathname}?tab=${tabId}`, { scroll: false });
};
```

### Authentication Status

Currently, authentication checking is **disabled** in middleware due to session sync issues:

```typescript
// middleware.ts
// TEMPORARILY DISABLED: Authentication check
// This was causing redirect loops due to session cookie sync issues
// TODO: Fix cookie handling between client and server
```

Client-side authentication is used instead:

```typescript
// app/page.tsx
const currentUser = await getCurrentUser();
if (!currentUser) {
  window.location.href = '/auth/login';
}
```

---

## UI Component System

### Design System

All UI uses a cohesive design system defined in `components/ui/`:

**Components:**
- `Button` - Multi-variant buttons (primary, secondary, danger, ghost, outline)
- `Input` - Text inputs with labels and errors
- `Select` - Dropdown selectors
- `Card` - Content containers
- `Badge` - Status indicators
- `PageLayout` - Full-page wrapper with header and gradient background
- `PageHeader` - Page title with back button
- `TabNavigation` - Responsive tab navigation (desktop + mobile)
- `EmptyState` - Empty state placeholder
- `LoadingSpinner` - Loading indicator
- `IconButton` - Icon-only buttons

**Colors:**
- Primary Blue: `#3B82F6` (blue-600)
- Gradient Background: `from-blue-50 to-indigo-100`
- Success: green-600
- Error: red-600
- Warning: yellow-600

**Layout:**
- Container: `max-w-7xl mx-auto`
- Mobile-first responsive design
- Padding: `px-4 sm:px-6 lg:px-8`

### TabNavigation Component

The most complex component, handles both desktop and mobile:

**Desktop:**
- Horizontal tabs in a row
- Blue background when active
- "More" menu drops down from top
- Grid layout for equal widths

**Mobile:**
- Fixed bottom navigation bar
- Icon + label for each tab
- "More" menu pops up from bottom
- Max 5 tabs visible at once

**Features:**
- Badge support (notification dots)
- Badge counts
- Responsive behavior
- Click-outside to close menu

---

## Data Flow Examples

### Example 1: Attendance Check-In (Business Workspace)

```
1. User navigates to /workspaces/store123?tab=today
   ↓
2. WorkspacePage loads workspace (store123)
   ↓
3. workspace.workspace_type = 'business'
   ↓
4. getPlugin('business') returns businessPlugin
   ↓
5. businessPlugin.config.tabs[0] = { feature: 'attendance', ... }
   ↓
6. useFeature({ plugin: businessPlugin, featureId: 'attendance' })
   ↓
7. Returns:
   {
     feature: attendanceFeature,
     config: { peopleLabel: 'Nhân Viên', requireSelfie: true, ... },
     adapter: AttendanceAdapter {
       tables: { people: 'staff', checkIns: 'check_ins', ... },
       fields: { personId: 'staff_id', workspaceId: 'store_id', ... }
     }
   }
   ↓
8. AttendanceFeature renders
   ↓
9. Loads data:
   - SELECT * FROM staff WHERE store_id = 'store123'  (using adapter.tables.people + adapter.fields.workspaceId)
   - SELECT * FROM check_ins WHERE store_id = 'store123' AND check_in_time::date = TODAY
   ↓
10. TodayView component renders staff list with check-in status
```

### Example 2: Attendance Today (Education Workspace)

```
1. User navigates to /workspaces/class456?tab=today
   ↓
2. WorkspacePage loads workspace (class456)
   ↓
3. workspace.workspace_type = 'education'
   ↓
4. getPlugin('education') returns educationPlugin
   ↓
5. educationPlugin.config.tabs[0] = { feature: 'attendance', ... }
   ↓
6. useFeature({ plugin: educationPlugin, featureId: 'attendance' })
   ↓
7. Returns:
   {
     feature: attendanceFeature,
     config: { peopleLabel: 'Học Sinh', requireSelfie: false, ... },
     adapter: AttendanceAdapter {
       tables: { people: 'students', checkIns: 'attendance_records', ... },
       fields: { personId: 'student_id', workspaceId: 'class_id', ... },
       components: { TodayView: EducationTodayView }
     }
   }
   ↓
8. AttendanceFeature renders
   ↓
9. Loads data:
   - SELECT * FROM students WHERE class_id = 'class456'  (different table!)
   - SELECT * FROM attendance_records WHERE class_id = 'class456' AND attendance_date = TODAY
   ↓
10. EducationTodayView component renders student list with attendance status (different UI!)
```

### Example 3: Adding a New Workspace Type

To add a new workspace type (e.g., "project"):

```
1. Create plugins/project/config.ts with projectPlugin
   ↓
2. Create plugins/project/adapters/ with adapters for each feature
   ↓
3. In database, insert workspace with workspace_type = 'project'
   ↓
4. Update config/plugins.config.ts:
   registerPlugin(projectPlugin);
   ↓
5. User navigates to /workspaces/project123
   ↓
6. getPlugin('project') returns projectPlugin
   ↓
7. Same flow as business/education, but using project's adapters
   ↓
8. Features automatically work with project's database tables!
```

---

## Summary: How It All Works Together

```
┌─────────────────────────────────────────────────────────────┐
│ 1. App starts → PluginProvider → initializePlugins()       │
│    Registers all features and plugins in global registries  │
└─────────────────────────────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. User navigates to /workspaces/[id]                       │
│    WorkspacePage component renders                          │
└─────────────────────────────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. useWorkspace() hook loads:                               │
│    - Workspace data from database                           │
│    - Plugin based on workspace.workspace_type               │
│    - Calls plugin.onActivate()                              │
└─────────────────────────────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. WorkspaceShell renders:                                  │
│    - PageLayout (header, gradient background)              │
│    - TabNavigation (tabs from plugin.config.tabs)           │
│    - Feature component                                      │
└─────────────────────────────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────┐
│ 5. When tab changes:                                        │
│    - useFeature() resolves feature + adapter               │
│    - Passes config and adapter to feature component        │
│    - Feature uses adapter.tables and adapter.fields        │
│    - Queries correct database tables                        │
│    - Uses adapter.components if provided                   │
└─────────────────────────────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────┐
│ 6. Feature component renders:                              │
│    - Uses config for labels, settings                      │
│    - Uses adapter for database queries                     │
│    - Uses adapter components for custom UI                 │
│    - Same code works for all workspace types!              │
└─────────────────────────────────────────────────────────────┘
```

---

## Key Files Reference

| File | Purpose |
|------|---------|
| `core/types/plugin.ts` | WorkspacePlugin interface |
| `core/types/feature.ts` | Feature & FeatureAdapter interfaces |
| `core/types/workspace.ts` | Workspace interface |
| `core/utils/pluginRegistry.ts` | Global plugin registry |
| `core/utils/featureRegistry.ts` | Global feature registry |
| `core/hooks/useWorkspace.ts` | Load workspace + plugin hook |
| `core/hooks/useFeature.ts` | Resolve feature + adapter hook |
| `core/components/WorkspaceShell.tsx` | Tab router component |
| `config/plugins.config.ts` | Plugin initialization |
| `plugins/business/config.ts` | Business plugin definition |
| `plugins/education/config.ts` | Education plugin definition |
| `components/PluginProvider.tsx` | Plugin initialization wrapper |
| `components/Providers.tsx` | App providers (QueryClient, PluginProvider) |
| `app/layout.tsx` | Root layout with Providers |
| `workspaces/[id]/page.tsx` | Unified workspace router |
| `types/index.ts` | Database type definitions |
| `lib/supabase.ts` | Supabase client |
| `components/ui/README.md` | UI design system documentation |

---

## Architecture Strengths

1. **Extensibility**: New workspace types can be added without modifying core feature code
2. **Reusability**: Features work across all workspace types automatically
3. **Type Safety**: Full TypeScript support with clear interfaces
4. **Separation of Concerns**: Plugins, features, adapters, and components are clearly separated
5. **Single Responsibility**: Each component/file has one clear purpose
6. **Testability**: Registries and adapters can be easily mocked for testing
7. **Maintainability**: Changes to a feature only need to be made in one place

---

