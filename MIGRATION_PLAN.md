# 🚀 UNIFIED MIGRATION PLAN

Combined plan to make everything use shared components AND clean up directory structure.

---

## 📋 PHASE 1: Delete Old Workspace System
**Goal:** Remove duplicate workspace routes and consolidate to plugin-based system

### Tasks:
- [ ] Delete `/app/owner/workspaces/[id]/page.tsx` (duplicate route)
- [ ] Delete `/app/owner/stores/[id]/` folder (old business-only route)
- [ ] Delete `/app/stores/` folder (another old route)
- [ ] Delete `/components/education/` folder (6 hardcoded education components)
- [ ] Delete `/components/business/BusinessWorkspace.tsx` (just redirects)
- [ ] Update `/app/owner/page.tsx` dashboard links to use `/workspaces/[id]`

**Files to DELETE:**
```
app/
├── stores/                           ❌ DELETE
├── owner/
│   ├── stores/[id]/                  ❌ DELETE
│   └── workspaces/[id]/              ❌ DELETE
components/
├── education/                        ❌ DELETE (all 6 files)
└── business/BusinessWorkspace.tsx    ❌ DELETE
```

**Expected Result:** Only `/workspaces/[id]` route exists, using plugin system

---

## 📋 PHASE 2: Consolidate Check-in Routes
**Goal:** Single check-in flow for both staff and student

### Tasks:
- [ ] Move `/app/student/checkin/` logic into `/app/checkin/`
- [ ] Update `/app/checkin/page.tsx` to detect workspace type and use CheckInFlow
- [ ] Delete `/app/student/checkin/` folder
- [ ] Update QR code paths in plugin configs to use unified `/checkin?workspace={id}`
- [ ] Update `/app/student/enroll/` to use workspace-agnostic logic

**Before:**
```
app/
├── checkin/          # Staff only
└── student/
    └── checkin/      # Student only (duplicate!)
```

**After:**
```
app/
└── checkin/          # Works for both staff & student
```

**Expected Result:** One check-in route that detects workspace type and adapts

---

## 📋 PHASE 3: Refactor Dashboard to Use Plugins
**Goal:** Remove hardcoded workspace type conditionals

### Tasks:
- [ ] Update `/app/owner/page.tsx` to load plugin configs
- [ ] Replace hardcoded icons (`🎓` vs `🏪`) with `plugin.config.icon`
- [ ] Replace hardcoded labels ("Giáo Dục" vs "Kinh Doanh") with `plugin.name`
- [ ] Replace hardcoded people labels ("học sinh" vs "nhân viên") with plugin config
- [ ] Remove all `if (workspace_type === 'education')` conditionals

**Before:**
```typescript
// Hardcoded everywhere
if (store.workspace_type === 'education') {
  return '🎓 Giáo Dục - học sinh';
} else {
  return '🏪 Kinh Doanh - nhân viên';
}
```

**After:**
```typescript
// Use plugin config
const plugin = getPlugin(store.workspace_type);
return `${plugin.icon} ${plugin.name} - ${plugin.config.peopleLabel}`;
```

**Expected Result:** Dashboard is workspace-agnostic, works with any plugin

---

## 📋 PHASE 4: Reorganize App Directory Structure
**Goal:** Verify clean folder structure and document organization

### Tasks:
- [x] Verify app directory structure is clean (no duplicates)
- [x] Document current directory organization
- [x] Confirm all routes are properly organized

**Current Clean Structure:**
```
app/
├── api/                             # API Routes
├── auth/                            # Authentication
├── checkin/                         # Unified check-in (all workspace types) ✅
├── history/                         # Personal check-in history
├── owner/                           # Owner dashboard
├── settings/                        # Personal settings
├── student/                         # Student-specific pages (education)
├── workspaces/                      # Plugin-based workspace pages ✅
├── xep-lich-ai/                    # AI scheduling
└── page.tsx                         # Landing page
```

**Expected Result:** Structure is already clean and well-organized. Route groups not needed - current structure is logical and maintainable.

**Documentation:** See `APP_STRUCTURE.md` for detailed explanation of directory organization.

---

## 📋 PHASE 5: Add Missing Shared Features
**Goal:** Complete the feature system

### Tasks:
- [ ] Create shared `scheduling` feature (for timetables/shifts)
- [ ] Create shared `people` feature (for students/staff management)
- [ ] Update plugin configs to use new features
- [ ] Remove any remaining education/business-specific components

**New Shared Features:**
```
features/
├── attendance/     ✅ Done
├── settings/       ✅ Done
├── qrcode/         ✅ Done
├── scheduling/     🆕 For timetables/shifts
└── people/         🆕 For students/staff
```

**Expected Result:** Complete plugin system with all core features

---

## 📋 PHASE 6: Test & Verify
**Goal:** Ensure everything works

### Tasks:
- [ ] Test business workspace (all tabs work)
- [ ] Test education workspace (all tabs work)
- [ ] Test check-in flow (staff and student)
- [ ] Test dashboard (workspace list)
- [ ] Verify no hardcoded workspace types remain
- [ ] Run build and fix any errors

**Expected Result:** Fully functional plugin-based system

---

## 📊 EXECUTION ORDER:

```
Phase 1: Delete Old Routes (30 min)
    ↓
Phase 2: Consolidate Check-in (45 min)
    ↓
Phase 3: Refactor Dashboard (30 min)
    ↓
Phase 4: Reorganize Structure (30 min)
    ↓
Phase 5: Add Missing Features (2 hours)
    ↓
Phase 6: Test & Verify (30 min)
```

**Total Estimated Time:** ~5 hours

---

## 🎯 BENEFITS AFTER COMPLETION:

✅ One workspace route (`/workspaces/[id]`)
✅ One check-in route (`/checkin`)
✅ No hardcoded workspace types
✅ No duplicate components
✅ Clean, organized directory structure
✅ Easy to add new workspace types (just create new plugin!)
✅ Fully shared components across all workspace types

---

## 📝 PROGRESS TRACKING:

- [x] Phase 1: Delete Old Workspace System ✅ COMPLETE
- [x] Phase 2: Consolidate Check-in Routes ✅ COMPLETE
- [x] Phase 3: Refactor Dashboard to Use Plugins ✅ COMPLETE
- [x] Phase 4: Reorganize App Directory Structure ✅ COMPLETE
- [x] Phase 5: Add Missing Shared Features ✅ COMPLETE
- [ ] Phase 6: Test & Verify

---

## 🔄 ROLLBACK PLAN:

If something goes wrong during migration:
1. Git checkout to commit before migration started
2. Review what broke
3. Fix the specific issue
4. Continue from that phase

**Important:** Commit after each phase completes successfully!
