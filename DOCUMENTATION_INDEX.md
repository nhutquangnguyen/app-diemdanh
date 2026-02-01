# Diemdanh Architecture Documentation Index

This directory contains comprehensive documentation of the Diemdanh application architecture. Use this guide to find what you need.

## Documentation Files

### 1. **COMPLETE_ARCHITECTURE.md** (44 KB)
The definitive, exhaustive guide to the entire system architecture.

**Sections:**
- Overall Architecture with diagrams
- Complete Directory Structure explanation
- Plugin System (what plugins are, how they work, registration)
- Feature System (reusable features, registry)
- Adapter Pattern (database table mapping)
- Core Hooks & Components (useWorkspace, useFeature, WorkspaceShell)
- Database Structure (all tables, business vs education differences)
- Authentication & Routing
- UI Component System
- Data Flow Examples (step-by-step walkthroughs)
- Key Files Reference Table
- Summary and Architecture Strengths

**When to read:** When you need complete understanding of how everything works together.

---

### 2. **ARCHITECTURE_QUICK_REFERENCE.md** (8 KB)
Quick lookup guide with minimal explanations and practical examples.

**Sections:**
- 30-second overview of plugin-adapter pattern
- Key Concepts (Plugin, Feature, Adapter, Registry)
- Directory Quick Guide
- Common Tasks (adding workspace type, adding feature, etc.)
- Database Table Mapping
- Core Files (quick reference table)
- Data Flow (step by step with visual structure)
- Anti-patterns to Avoid
- Debugging Tips
- Color Scheme
- Component Usage Examples

**When to read:** For quick lookups, when you're already familiar with the architecture and need a refresher.

---

### 3. **components/ui/README.md** (15 KB)
Complete UI Design System documentation.

**Sections:**
- Design Principles (colors, typography, spacing, effects)
- Quick Start with imports
- Component Reference (PageLayout, PageHeader, TabNavigation, Card, Button, Input, Select, Badge, EmptyState, LoadingSpinner, IconButton)
- Icon System (SVG icons, recommended sizes)
- Complete Page Usage Example
- Best Practices (responsive design, accessibility, performance)
- Extending the Design System
- Migration Guide

**When to read:** When building UI components, implementing new features, or designing pages.

---

## Quick Navigation by Task

### I'm new to this codebase. Where do I start?

1. Read: **ARCHITECTURE_QUICK_REFERENCE.md** - "The Plugin-Adapter Pattern in 30 Seconds"
2. Read: **COMPLETE_ARCHITECTURE.md** - "Overall Architecture" and "Plugin System"
3. Look at: `plugins/business/config.ts` - See a real plugin example
4. Look at: `features/attendance/AttendanceFeature.tsx` - See a real feature example

### I want to add a new workspace type

1. Read: **ARCHITECTURE_QUICK_REFERENCE.md** - "Common Tasks: Adding a new workspace type"
2. Read: **COMPLETE_ARCHITECTURE.md** - "Plugin System" and "Adapter Pattern"
3. Follow the steps in Quick Reference
4. Reference existing plugins in `plugins/business/` and `plugins/education/`

### I want to add a new feature

1. Read: **ARCHITECTURE_QUICK_REFERENCE.md** - "Common Tasks: Adding a new feature"
2. Read: **COMPLETE_ARCHITECTURE.md** - "Feature System" and "Adapter Pattern"
3. Look at existing features in `features/`
4. Create adapters for each plugin in `plugins/[type]/adapters/`

### I'm building a UI component

1. Read: **components/ui/README.md** - Design principles and component reference
2. Use existing components from `components/ui/`
3. Follow the color scheme and spacing guidelines
4. Test on mobile (375px) and desktop (1440px)

### I need to understand the database schema

1. Read: **COMPLETE_ARCHITECTURE.md** - "Database Structure"
2. Look at: `types/index.ts` - TypeScript definitions
3. Check: `migrations/` - SQL schema files
4. Reference: **ARCHITECTURE_QUICK_REFERENCE.md** - "Database Table Mapping"

### I'm debugging a data flow issue

1. Read: **ARCHITECTURE_QUICK_REFERENCE.md** - "Data Flow: Step by Step"
2. Read: **COMPLETE_ARCHITECTURE.md** - "Data Flow Examples"
3. Use debugging tips in **ARCHITECTURE_QUICK_REFERENCE.md**

### I want to understand how tabs/routing works

1. Read: **COMPLETE_ARCHITECTURE.md** - "Authentication & Routing"
2. Look at: `core/components/WorkspaceShell.tsx` - The tab router
3. Look at: `workspaces/[id]/page.tsx` - The entry point
4. Check: `core/hooks/useFeature.ts` - How features are resolved

---

## Architecture Overview (TL;DR)

Diemdanh uses a **plugin-adapter architecture** to support multiple workspace types with shared code:

```
Plugin System:
  Business Plugin  → Adapts generic features to staff/check_ins/store_id tables
  Education Plugin → Adapts same features to students/attendance_records/class_id tables

Feature System:
  Generic features (Attendance, Scheduling) work for all workspace types
  Features use adapters to access correct database tables

Adapter Pattern:
  Maps table names: staff → students, check_ins → attendance_records
  Maps field names: staff_id → student_id, store_id → class_id
  Provides custom components when needed

Result:
  Single codebase works for unlimited workspace types
  Features automatically adapt to each workspace's database schema
```

---

## File Map

### Core System
- `core/types/plugin.ts` - WorkspacePlugin interface
- `core/types/feature.ts` - Feature & FeatureAdapter interfaces
- `core/utils/pluginRegistry.ts` - Global plugin registry
- `core/utils/featureRegistry.ts` - Global feature registry
- `core/hooks/useWorkspace.ts` - Load workspace + plugin
- `core/hooks/useFeature.ts` - Resolve feature + adapter
- `core/components/WorkspaceShell.tsx` - Tab router

### Plugins
- `plugins/business/config.ts` - Business plugin definition
- `plugins/business/adapters/` - Business adapters
- `plugins/education/config.ts` - Education plugin definition
- `plugins/education/adapters/` - Education adapters

### Features
- `features/attendance/` - Attendance feature
- `features/scheduling/` - Scheduling feature
- `features/people/` - People management
- `features/qrcode/` - QR code scanning
- `features/salary/` - Salary tracking (business only)
- `features/shifts/` - Shift management (business only)
- `features/settings/` - Workspace settings

### UI Components
- `components/ui/Button.tsx` - Multi-variant button
- `components/ui/Input.tsx` - Form input
- `components/ui/PageLayout.tsx` - Page wrapper
- `components/ui/TabNavigation.tsx` - Tab navigation
- `components/ui/Card.tsx` - Card container
- `components/ui/Badge.tsx` - Status badge
- `components/ui/README.md` - Design system docs

### Routing
- `app/layout.tsx` - Root layout with providers
- `app/page.tsx` - Home page
- `app/owner/page.tsx` - Owner dashboard
- `workspaces/[id]/page.tsx` - Main workspace router
- `app/auth/` - Authentication pages

### Database
- `types/index.ts` - TypeScript type definitions
- `lib/supabase.ts` - Supabase client
- `migrations/` - Database schema files

---

## Key Concepts Quick Lookup

| Term | Explanation | Location |
|------|-------------|----------|
| Plugin | Workspace type implementation (business, education) | `plugins/[type]/config.ts` |
| Feature | Reusable functionality (attendance, scheduling) | `features/[name]/index.ts` |
| Adapter | Maps feature to workspace-specific DB tables | `plugins/[type]/adapters/` |
| Registry | Global singleton storing plugins/features | `core/utils/*Registry.ts` |
| useWorkspace | Hook to load workspace + resolve plugin | `core/hooks/useWorkspace.ts` |
| useFeature | Hook to resolve feature + adapter | `core/hooks/useFeature.ts` |
| WorkspaceShell | Component that routes tabs to features | `core/components/WorkspaceShell.tsx` |
| FeatureProps | Props passed to feature components | `core/types/feature.ts` |
| PluginProvider | App wrapper that initializes plugins | `components/PluginProvider.tsx` |
| Workspace | The workspace/store/class object | `core/types/workspace.ts` |

---

## Common Code Patterns

### In a feature component
```typescript
// Use adapter to get correct table names
const peopleTable = adapter?.tables?.people || 'staff';
const personIdField = adapter?.fields?.personId || 'staff_id';

// Query using adapted table/field names
const { data } = await supabase
  .from(peopleTable)
  .select('*')
  .eq(adapter?.fields?.workspaceId || 'store_id', workspaceId);
```

### In a plugin config
```typescript
export const myPlugin: WorkspacePlugin = {
  id: 'mytype',
  adapters: {
    attendance: AttendanceAdapter,  // Workspace-specific adapter
  },
  config: {
    features: [
      { id: 'attendance', enabled: true, config: { ... } },
    ],
    tabs: [
      { id: 'today', label: 'Today', feature: 'attendance' },
    ],
  },
};
```

### In an adapter
```typescript
export const AttendanceAdapter: FeatureAdapter = {
  tables: {
    people: 'staff',            // Which table has people
    checkIns: 'check_ins',      // Which table has attendance
  },
  fields: {
    personId: 'staff_id',       // Person ID field name
    workspaceId: 'store_id',    // Workspace ID field name
  },
};
```

---

## Documentation Status

- ✓ Architecture overview (COMPLETE_ARCHITECTURE.md)
- ✓ Quick reference (ARCHITECTURE_QUICK_REFERENCE.md)
- ✓ UI design system (components/ui/README.md)
- ✓ Database schema (in COMPLETE_ARCHITECTURE.md)
- ✓ Plugin system (in COMPLETE_ARCHITECTURE.md)
- ✓ Feature system (in COMPLETE_ARCHITECTURE.md)
- ✓ Adapter pattern (in COMPLETE_ARCHITECTURE.md)
- ✓ Routing (in COMPLETE_ARCHITECTURE.md)
- ✓ Type definitions (referenced in COMPLETE_ARCHITECTURE.md)

---

## Questions to Help You Navigate

**Q: I want to understand the big picture**
A: Read COMPLETE_ARCHITECTURE.md → "Overall Architecture"

**Q: I need to add a new workspace type**
A: Read ARCHITECTURE_QUICK_REFERENCE.md → "Common Tasks: Adding a new workspace type"

**Q: What database tables exist?**
A: Read COMPLETE_ARCHITECTURE.md → "Database Structure"

**Q: How do I query the right table for my workspace type?**
A: Read ARCHITECTURE_QUICK_REFERENCE.md → "Querying workspace-specific tables"

**Q: What UI components are available?**
A: Read components/ui/README.md → "Components" section

**Q: How does tab navigation work?**
A: Read COMPLETE_ARCHITECTURE.md → "Core Hooks & Components" → "WorkspaceShell Component"

**Q: What are the differences between business and education workspaces?**
A: Read COMPLETE_ARCHITECTURE.md → "Database Structure" → Table Mapping section

**Q: I'm seeing an error about table not found**
A: Read ARCHITECTURE_QUICK_REFERENCE.md → "Debugging Tips" → item 5

**Q: How do I add a new tab to a workspace?**
A: Read ARCHITECTURE_QUICK_REFERENCE.md → "Common Tasks: Adding a new feature" → step 4

**Q: What's the color scheme for the UI?**
A: Read ARCHITECTURE_QUICK_REFERENCE.md → "Color Scheme"

---

## Learning Path

### Beginner (1-2 hours)
1. ARCHITECTURE_QUICK_REFERENCE.md - Full read
2. Look at plugins/business/config.ts
3. Look at features/attendance/AttendanceFeature.tsx

### Intermediate (2-4 hours)
1. COMPLETE_ARCHITECTURE.md - Full read
2. Study core/hooks/useWorkspace.ts and useFeature.ts
3. Study core/components/WorkspaceShell.tsx
4. Look at an adapter like plugins/business/adapters/AttendanceAdapter.ts

### Advanced (4+ hours)
1. Study entire plugins/ directory structure
2. Study entire features/ directory structure
3. Understand how each feature uses adapters
4. Review database schema in types/index.ts and migrations/

### UI/Design (1-2 hours)
1. components/ui/README.md - Full read
2. Review components/ui/*.tsx files
3. Test components in a page

---

## Version Information

- **App Version**: 1.0.0
- **Next.js Version**: 16.1.1
- **React Version**: 19.2.3
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Styling**: Tailwind CSS 3.4.19
- **Documentation Created**: February 1, 2026

---

## How to Maintain This Documentation

When you make changes:

1. **Adding a new plugin**: Update "Plugin Types" section in COMPLETE_ARCHITECTURE.md
2. **Adding a new feature**: Update "Feature System" section in COMPLETE_ARCHITECTURE.md
3. **Changing database schema**: Update "Database Structure" section
4. **Changing table mappings**: Update "Table Mapping in Adapters" section
5. **Adding new UI components**: Update components/ui/README.md

Keep both documentation files in sync!

---

## Quick Links

- Plugins: `/Users/product/Projects/ck_projects/diemdanh/app/plugins/`
- Features: `/Users/product/Projects/ck_projects/diemdanh/app/features/`
- Core System: `/Users/product/Projects/ck_projects/diemdanh/app/core/`
- UI Components: `/Users/product/Projects/ck_projects/diemdanh/app/components/ui/`
- Database Types: `/Users/product/Projects/ck_projects/diemdanh/app/types/index.ts`

