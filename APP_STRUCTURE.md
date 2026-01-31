# App Directory Structure

Clean, organized structure after migration (Phase 1-4 complete).

## 📁 Directory Overview

```
app/
├── api/                    # API Routes
├── auth/                   # Authentication Pages
├── checkin/                # Unified Check-in (All Workspace Types) ✨
├── history/                # Personal Check-in History
├── owner/                  # Owner Dashboard & Workspace Management
├── settings/               # Personal User Settings
├── student/                # Student-Specific Pages (Education)
├── workspaces/             # Plugin-Based Workspace Pages ✨
├── xep-lich-ai/           # AI Scheduling Feature
├── page.tsx               # Landing Page
└── layout.tsx             # Root Layout
```

---

## 🔍 Detailed Breakdown

### `/api/` - API Routes
Backend API endpoints for various features.

**Key endpoints:**
- `/api/auth/` - Authentication APIs
- `/api/check-ins/` - Check-in operations
- `/api/staff/` - Staff management
- `/api/students/` - Student management
- `/api/stores/` - Workspace settings
- `/api/salary/` - Salary calculations
- `/api/schedule/` - Schedule generation

---

### `/auth/` - Authentication Pages
User authentication and account management.

**Routes:**
- `/auth/login` - Login page
- `/auth/signup` - Registration page
- `/auth/forgot-password` - Password reset request
- `/auth/reset-password` - Password reset form
- `/auth/verify-email` - Email verification
- `/auth/verify-code` - Code verification
- `/auth/callback` - OAuth callback

---

### `/checkin/` - Unified Check-in (ALL Workspace Types) ✨
**Single check-in flow for both staff and students.**

**Routes:**
- `/checkin` - Entry point
  - No params: Shows QR scanner
  - `?workspace={id}`: Detects workspace type and routes appropriately
  - `?store={id}`: Backward compatibility for business
  - `?class={id}`: Backward compatibility for education

- `/checkin/submit` - Staff check-in submission

**How it works:**
1. User scans QR or visits `/checkin?workspace={id}`
2. System loads workspace from database
3. Detects workspace type (`business` or `education`)
4. For business: Checks staff enrollment → routes to `/checkin/submit`
5. For education: Checks student enrollment → routes to `/student/checkin/submit`

---

### `/history/` - Personal Check-in History
View user's personal attendance/check-in history.

**Route:**
- `/history` - Shows check-in history for logged-in user

---

### `/owner/` - Owner Dashboard & Workspace Management
Pages for workspace owners to manage their workspaces.

**Routes:**
- `/owner` - Dashboard (list all workspaces)
- `/owner/create-store` - Create new workspace

**Features:**
- ✅ Uses plugin system for workspace type display
- ✅ Shows plugin icon and display name
- ✅ Dynamic people labels from plugin config
- ✅ No hardcoded workspace types

---

### `/settings/` - Personal User Settings
User account settings and preferences.

**Route:**
- `/settings` - User settings page

---

### `/student/` - Student-Specific Pages
Education-specific student interface (separate from plugin system).

**Routes:**
- `/student/[classId]` - Student's view of their class
  - Tabs: Check-in, Attendance, Timetable, Profile
  - Uses education-specific components

- `/student/checkin/submit?class={id}` - Student check-in submission
  - Different from staff check-in
  - Uses `StudentCheckin` component

- `/student/enroll?class={id}` - Student enrollment form
  - Self-enrollment for open classes

**Why separate from plugin system?**
The student interface is inherently education-specific and doesn't need to be workspace-agnostic. Students always interact with education workspaces, so a dedicated student interface makes sense.

---

### `/workspaces/` - Plugin-Based Workspace Pages ✨
**Core of the plugin system - works for ALL workspace types!**

**Routes:**
- `/workspaces/[id]` - Main workspace page

**How it works:**
1. Loads workspace data from database
2. Gets `workspace_type` field (e.g., `'business'` or `'education'`)
3. Loads corresponding plugin from registry
4. Renders `WorkspaceShell` with plugin configuration
5. Shows tabs based on plugin config
6. Each tab renders a feature with adapter

**Supported Workspace Types:**
- `business` - Business plugin (🏪 Kinh Doanh)
- `education` - Education plugin (🎓 Giáo Dục)
- **Easy to add more!** Just create new plugin in `/plugins/`

**Sub-routes:**
- `/workspaces/[id]/add-students` - Add students to education workspace
- `/workspaces/[id]/student` - Redirect to student view

---

### `/xep-lich-ai/` - AI Scheduling
AI-powered automatic scheduling feature.

**Route:**
- `/xep-lich-ai` - AI scheduling interface

---

## 🎯 Key Architecture Principles

### 1. Plugin-Based System
- Workspaces use plugin architecture
- Each plugin defines features, tabs, adapters
- Easy to extend with new workspace types

### 2. Shared Components
- Features are shared across workspace types
- Adapters map feature to workspace-specific tables
- No duplicate code for business vs education

### 3. Unified Check-in
- Single `/checkin` route for all workspace types
- Automatically detects and routes based on workspace type
- Backward compatible with old QR codes

### 4. Clear Separation
- **Owner interface**: `/workspaces/[id]` (plugin-based, workspace-agnostic)
- **Student interface**: `/student/[classId]` (education-specific)
- **Check-in**: `/checkin` (unified for all types)

---

## 🚀 Adding New Workspace Types

To add a new workspace type (e.g., "Project Management"):

1. **Create plugin:** `/plugins/project/config.ts`
```typescript
export const projectPlugin: WorkspacePlugin = {
  id: 'project',
  name: 'Project Management',
  displayName: 'Dự Án',
  icon: '📊',
  config: {
    peopleLabel: 'Thành Viên',
    workspaceLabel: 'Dự Án',
    features: [...],
    tabs: [...]
  },
  adapters: {...}
};
```

2. **Register plugin:** `/config/plugins.config.ts`
```typescript
import { projectPlugin } from '@/plugins/project';
registerPlugin(projectPlugin);
```

3. **Create database tables:** Migration for project-specific tables

4. **Done!** The workspace will automatically work with:
   - `/workspaces/[id]` - Shows project workspace
   - `/checkin?workspace={id}` - Project member check-in
   - Dashboard displays with project icon/labels

---

## ✅ Migration Status

- [x] Phase 1: Deleted duplicate workspace routes
- [x] Phase 2: Consolidated check-in routes
- [x] Phase 3: Refactored dashboard to use plugins
- [x] Phase 4: Verified and documented clean structure
- [ ] Phase 5: Add missing shared features
- [ ] Phase 6: Test & verify

**Structure is clean and organized! No route groups needed - current structure is logical and maintainable.**
