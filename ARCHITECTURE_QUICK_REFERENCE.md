# Architecture Quick Reference

## The Plugin-Adapter Pattern in 30 Seconds

```
User navigates to /workspaces/[id]
  ↓
useWorkspace() loads workspace from DB
  ↓
Gets workspace.workspace_type = "business" or "education"
  ↓
getPlugin("business") returns businessPlugin with:
  - Feature list (attendance, scheduling, salary, etc.)
  - Tab configuration (what appears in UI)
  - Adapters for each feature
  ↓
useFeature() resolves:
  - Feature component to render
  - Config (labels, settings)
  - Adapter (database table mappings)
  ↓
AttendanceFeature uses adapter to query correct tables:
  - Business: SELECT * FROM staff WHERE store_id = ?
  - Education: SELECT * FROM students WHERE class_id = ?
```

## Key Concepts

### Plugin
- Represents a workspace type (business, education)
- Tells system what features to show and how to adapt them
- Located in: `plugins/[type]/config.ts`

### Feature
- Reusable functionality that works across all workspace types
- Has config schema, component, and endpoints
- Located in: `features/[feature-name]/`

### Adapter
- Maps generic feature to workspace-specific database tables/fields
- Business uses `staff`, `check_ins`, `store_id`
- Education uses `students`, `attendance_records`, `class_id`
- Located in: `plugins/[type]/adapters/[feature]Adapter.ts`

### Registry
- Global singleton storing all plugins and features
- Used for dynamic lookup at runtime
- Located in: `core/utils/pluginRegistry.ts` and `core/utils/featureRegistry.ts`

## Directory Quick Guide

```
core/              ← Plugin system core (registries, hooks, types)
plugins/           ← Workspace type implementations (business, education)
features/          ← Reusable features (attendance, scheduling, etc.)
components/        ← React components (ui system + feature-specific)
app/               ← Next.js pages and routing
types/index.ts     ← Database type definitions
lib/               ← Business logic utilities
migrations/        ← Database schema
```

## Common Tasks

### Adding a new workspace type

1. Create `plugins/mytype/config.ts` with MyTypePlugin
2. Create `plugins/mytype/adapters/` with adapters for each feature
3. In adapters, specify table mappings (e.g., `tables: { people: 'my_people_table' }`)
4. Add to `config/plugins.config.ts`: `registerPlugin(mytypePlugin)`

### Adding a new feature

1. Create `features/myfeature/` directory
2. Create `features/myfeature/MyFeatureComponent.tsx` with FeatureProps
3. Create `features/myfeature/index.ts` with feature registration
4. For each plugin, create adapter in `plugins/[type]/adapters/MyFeatureAdapter.ts`
5. Register in `plugins/[type]/config.ts`: adapters and features

### Querying workspace-specific tables in a feature

```typescript
// Use adapter to get correct table names
const peopleTable = adapter?.tables?.people || 'staff';
const personIdField = adapter?.fields?.personId || 'staff_id';
const workspaceIdField = adapter?.fields?.workspaceId || 'store_id';

// Query using adapted names
const { data } = await supabase
  .from(peopleTable)
  .select('*')
  .eq(workspaceIdField, workspaceId);
```

## Database Table Mapping

| Concept | Business | Education |
|---------|----------|-----------|
| Workspace | stores | stores |
| People | staff | students |
| Attendance | check_ins | attendance_records |
| Session Def | shift_templates | class_sessions |
| Schedule | staff_schedules | session_schedules |
| ID: Workspace | store_id | class_id |
| ID: Person | staff_id | student_id |
| ID: Session | shift_id | session_id |

## Core Files

| File | Purpose |
|------|---------|
| `core/types/plugin.ts` | WorkspacePlugin type definition |
| `core/types/feature.ts` | Feature & FeatureAdapter definitions |
| `core/hooks/useWorkspace.ts` | Load workspace + resolve plugin |
| `core/hooks/useFeature.ts` | Resolve feature + adapter |
| `core/components/WorkspaceShell.tsx` | Tab router, renders features |
| `config/plugins.config.ts` | Plugin initialization |
| `plugins/business/config.ts` | Business plugin definition |
| `plugins/education/config.ts` | Education plugin definition |
| `features/[name]/index.ts` | Feature registration |
| `components/ui/README.md` | UI design system docs |

## Data Flow: Step by Step

```
1. App Starts
   └─ PluginProvider calls initializePlugins()
      └─ Registers all features and plugins in global registries

2. User Navigates to /workspaces/[id]
   └─ WorkspacePage calls useWorkspace(id)
      └─ Loads workspace from DB
      └─ Reads workspace.workspace_type
      └─ Calls getPlugin(type) from registry
      └─ Returns { workspace, plugin }

3. WorkspaceShell Renders
   └─ Shows tabs from plugin.config.tabs
   └─ When tab clicked, calls useFeature()
      └─ Gets feature from registry
      └─ Merges config from plugin
      └─ Gets adapter from plugin
      └─ Returns { feature, config, adapter, enabled }

4. Feature Component Renders
   └─ Uses adapter.tables for query table names
   └─ Uses adapter.fields for field names
   └─ Queries database with correct table/field names
   └─ Same code works for all workspace types!
   └─ Uses adapter.components if provided (custom UI)

5. User Sees Data
   └─ Formatted for workspace type (staff vs students, etc.)
```

## Important URLs

- Home: `/` - Shows available workspaces
- Owner Dashboard: `/owner` - Owner's workspaces
- Workspace: `/workspaces/[id]` - Main workspace interface
- Authentication: `/auth/login`, `/auth/signup`, etc.

## Testing Your Changes

```typescript
// Add a new tab to business plugin
plugins/business/config.ts → tabs array

// Add a new feature to education plugin
plugins/education/config.ts → features array

// Change database field mapping
plugins/[type]/adapters/[feature]Adapter.ts → fields object

// All changes are automatically reflected in UI!
// No need to modify feature components
```

## Anti-patterns to Avoid

1. ❌ Hardcoding table names like `staff` or `store_id` in feature components
   - ✅ Use adapter.tables and adapter.fields instead

2. ❌ Creating workspace-specific feature components
   - ✅ Use adapters and custom components instead

3. ❌ Duplicating feature code for each workspace type
   - ✅ Make features generic and use adapters

4. ❌ Registering plugins/features multiple times
   - ✅ Do it once in initializePlugins()

5. ❌ Modifying plugins at runtime
   - ✅ Plugins are configuration, not state

## Debugging Tips

1. Check plugin is registered:
   ```typescript
   import { getAllPlugins } from '@/core/utils/pluginRegistry';
   console.log(getAllPlugins());
   ```

2. Check feature is registered:
   ```typescript
   import { getAllFeatures } from '@/core/utils/featureRegistry';
   console.log(getAllFeatures());
   ```

3. Check workspace data:
   - Open browser DevTools → Application → LocalStorage
   - Look for workspace_type field

4. Check adapter is passed correctly:
   ```typescript
   console.log('Adapter:', adapter);
   console.log('Tables:', adapter?.tables);
   console.log('Fields:', adapter?.fields);
   ```

5. Verify database query:
   - Check Supabase query in browser Network tab
   - Verify correct table and field names

## Color Scheme

- Primary Blue: `#3B82F6` (blue-600)
- Gradient: `from-blue-50 to-indigo-100`
- Success: `green-600`
- Error: `red-600`
- Warning: `yellow-600`
- Text Primary: `text-gray-800`
- Text Secondary: `text-gray-600`

## Component Usage

```typescript
// Page layout
<PageLayout>
  <PageHeader title="..." backHref="..." />
  <TabNavigation tabs={...} activeTab={...} onTabChange={...} />
  <Card>Content</Card>
</PageLayout>

// Buttons
<Button variant="primary" size="md" loading={false}>Click me</Button>

// Form
<Input label="Name" placeholder="..." error={error} />
<Select label="Type" options={[...]} />

// Status
<Badge variant="success" dot pulse>Active</Badge>

// Empty state
<EmptyState title="No items" actionLabel="Create" onAction={...} />

// Loading
<LoadingSpinner size="md" text="Loading..." />
```

