# diemdanh.net UI Design System

This directory contains the shared UI components that maintain consistent design patterns across the entire application.

## Design Principles

### Color Palette
- **Primary Blue**: `#3B82F6` (blue-600) - Used for active states, primary buttons
- **Gradient Background**: `from-blue-50 to-indigo-100` - Used for page backgrounds
- **Text Colors**:
  - Primary: `text-gray-800` for headings
  - Secondary: `text-gray-600` for body text
  - Tertiary: `text-gray-500` for subtle text
- **Accent Colors**:
  - Success: `green-600`
  - Error/Alert: `red-600`
  - Warning: `yellow-600`

### Typography
- **Headings**: Bold font, responsive sizing (xl on mobile, 2xl on desktop)
- **Body**: Regular weight, 16px base size
- **Labels**: Semi-bold, smaller sizes (sm/xs)

### Spacing & Layout
- **Container**: `max-w-7xl mx-auto` for consistent page width
- **Padding**: Mobile-first approach (`px-4 sm:px-6 lg:px-8`)
- **Gaps**: Consistent spacing using Tailwind's gap utilities

### Visual Effects
- **Shadows**: `shadow-lg` for cards and elevated elements
- **Borders**: Soft rounded corners (`rounded-lg`)
- **Transitions**: Smooth transitions on all interactive elements

## Components

### PageLayout

Full page layout with Header, gradient background, and content area.

```tsx
import { PageLayout } from '@/components/ui';

function MyPage() {
  return (
    <PageLayout>
      {/* Your content */}
    </PageLayout>
  );
}
```

**Props:**
- `children`: ReactNode - Page content
- `withGradient?: boolean` - Show gradient background (default: true)
- `backgroundColor?: string` - Custom background class

**When to use:**
- Use for all full-page views
- Automatically includes Header component
- Provides consistent spacing and background

---

### PageHeader

Page title section with optional back button and actions.

```tsx
import { PageHeader } from '@/components/ui';

function MyPage() {
  return (
    <PageHeader
      title="Banh keo ABC"
      subtitle="Business Management"
      backHref="/owner"
      actions={
        <button>Action</button>
      }
    />
  );
}
```

**Props:**
- `title: string` - Main page title
- `subtitle?: string` - Optional subtitle below title
- `backHref?: string` - Back button link
- `onBack?: () => void` - Custom back button handler
- `actions?: ReactNode` - Optional action buttons on the right

**When to use:**
- Use at the top of every page below Header
- Always provide a back button for navigation
- Use actions for page-level operations (e.g., "Add", "Edit")

---

### TabNavigation

Responsive tab navigation for desktop and mobile.

```tsx
import { TabNavigation, TabItem } from '@/components/ui';

function MyPage() {
  const tabs: TabItem[] = [
    {
      id: 'today',
      label: 'Hôm Nay',
      icon: <svg>...</svg>,
    },
    {
      id: 'schedule',
      label: 'Lịch',
      icon: <svg>...</svg>,
      badge: true, // Show notification dot
    },
    {
      id: 'settings',
      label: 'Cài Đặt',
      icon: <svg>...</svg>,
      inMoreMenu: true, // Show in "More" menu
    },
  ];

  return (
    <TabNavigation
      tabs={tabs}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      moreLabel="Mở rộng"
    />
  );
}
```

**Props:**
- `tabs: TabItem[]` - Array of tab items
- `activeTab: string` - Currently active tab ID
- `onTabChange: (tabId: string) => void` - Callback when tab changes
- `moreLabel?: string` - Label for "More" menu (default: 'Mở rộng')

**TabItem interface:**
- `id: string` - Unique tab identifier
- `label: string` - Tab label text
- `icon: ReactNode` - Tab icon (SVG recommended, 24x24)
- `badge?: boolean` - Show red notification dot
- `badgeCount?: number` - Show count badge
- `inMoreMenu?: boolean` - Show in dropdown menu (desktop) or last position (mobile)

**Behavior:**
- **Desktop**: Horizontal tabs with rounded corners, blue background when active
- **Mobile**: Fixed bottom navigation with icons and labels
- Automatically handles "More" menu dropdown
- Supports notification badges

**When to use:**
- Use for main navigation within a workspace or page
- Limit main tabs to 3-4 for best mobile UX
- Use `inMoreMenu` for less frequently accessed tabs

---

### Card

Consistent card container with shadow and padding.

```tsx
import { Card } from '@/components/ui';

function MyComponent() {
  return (
    <Card padding="md" hoverable>
      <h2>Card Title</h2>
      <p>Card content...</p>
    </Card>
  );
}
```

**Props:**
- `children: ReactNode` - Card content
- `padding?: 'none' | 'sm' | 'md' | 'lg'` - Padding size (default: 'md')
- `hoverable?: boolean` - Add hover shadow effect (default: false)
- `className?: string` - Additional CSS classes
- `onClick?: () => void` - Click handler (makes card clickable)

**Padding sizes:**
- `none`: No padding (use for full-width content)
- `sm`: 12px padding
- `md`: 16px mobile, 24px desktop (default)
- `lg`: 24px mobile, 32px desktop

**When to use:**
- Use for content sections and groupings
- Use `padding="none"` when content has its own padding
- Use `hoverable` for clickable cards

---

### IconButton

Reusable icon button with consistent styling.

```tsx
import { IconButton } from '@/components/ui';

function MyComponent() {
  return (
    <IconButton
      icon={<svg>...</svg>}
      onClick={handleClick}
      variant="primary"
      size="md"
      ariaLabel="Settings"
      title="Open Settings"
    />
  );
}
```

**Props:**
- `icon: ReactNode` - Icon element (SVG)
- `onClick?: () => void` - Click handler
- `size?: 'sm' | 'md' | 'lg'` - Button size (default: 'md')
- `variant?: 'primary' | 'secondary' | 'danger' | 'ghost'` - Color variant (default: 'ghost')
- `disabled?: boolean` - Disabled state
- `ariaLabel?: string` - Accessibility label
- `title?: string` - Tooltip text
- `className?: string` - Additional CSS classes

**Variants:**
- `primary`: Blue background, white text
- `secondary`: Gray background, white text
- `danger`: Red background, white text
- `ghost`: Transparent, hover effect

**When to use:**
- Use for icon-only actions (back, menu, delete, etc.)
- Always provide `ariaLabel` for accessibility
- Use `ghost` for subtle actions, `primary` for main actions

---

## Icon System

Standard icon size: **24x24px** (w-6 h-6)

### Recommended Icons

```tsx
// Clock (time, shifts, schedule)
<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
</svg>

// Calendar (schedule, dates)
<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
</svg>

// Users (staff, students, people)
<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
</svg>

// Settings
<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
</svg>

// Back arrow
<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
</svg>

// QR Code
<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
    d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
</svg>
```

## Usage Example: Complete Page

```tsx
'use client';

import { useState } from 'react';
import { PageLayout, PageHeader, TabNavigation, TabItem, Card } from '@/components/ui';

export default function WorkspacePage() {
  const [activeTab, setActiveTab] = useState('today');

  const tabs: TabItem[] = [
    {
      id: 'today',
      label: 'Hôm Nay',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      id: 'schedule',
      label: 'Lịch',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
      badge: true,
    },
    {
      id: 'settings',
      label: 'Cài Đặt',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0..." />
        </svg>
      ),
      inMoreMenu: true,
    },
  ];

  return (
    <PageLayout>
      <PageHeader
        title="Banh keo ABC"
        subtitle="Business Management"
        backHref="/owner"
      />

      <TabNavigation
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      <Card className="mb-20 sm:mb-4">
        {/* Your tab content here */}
        <div className="p-4">
          Content for {activeTab} tab
        </div>
      </Card>
    </PageLayout>
  );
}
```

## Best Practices

### Responsive Design
- Always test on mobile (375px) and desktop (1440px)
- Use Tailwind's responsive prefixes (`sm:`, `md:`, `lg:`)
- Mobile-first approach: default styles for mobile, then add desktop overrides

### Accessibility
- Always provide `ariaLabel` for icon buttons
- Use semantic HTML (buttons, links, headings)
- Maintain proper heading hierarchy (h1 → h2 → h3)
- Ensure sufficient color contrast (WCAG AA minimum)

### Performance
- Keep components lightweight
- Avoid unnecessary re-renders
- Use React.memo for expensive components
- Lazy load heavy components when possible

### Consistency
- Use these components for ALL new features
- Don't create one-off custom styles
- If you need a variant, extend the existing component
- Follow the established color palette and spacing

## Extending the Design System

When you need new functionality:

1. **Check if existing components can be extended** - Add props instead of creating new components
2. **Follow existing patterns** - Match the API design of current components
3. **Document thoroughly** - Update this README with usage examples
4. **Test responsive behavior** - Verify mobile and desktop layouts
5. **Consider accessibility** - Add ARIA labels and semantic HTML

### Adding a New Component

```tsx
// components/ui/NewComponent.tsx
'use client';

/**
 * NewComponent - Brief description
 *
 * Design principles:
 * - Principle 1
 * - Principle 2
 */

interface NewComponentProps {
  // Props with documentation
}

export default function NewComponent(props: NewComponentProps) {
  // Implementation
}
```

Then export it in `index.ts`:

```tsx
export { default as NewComponent } from './NewComponent';
```

And document it in this README.

---

## Migration Guide

### Converting Old Pages to New Design System

**Before:**
```tsx
<div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
  <Header />
  <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
    <div className="flex items-center gap-3">
      <Link href="/owner">
        <button className="text-gray-600 hover:text-gray-800">←</button>
      </Link>
      <h1 className="text-xl sm:text-2xl font-bold">{store.name}</h1>
    </div>
    <div className="bg-white rounded-lg shadow-lg p-4">
      {/* Content */}
    </div>
  </main>
</div>
```

**After:**
```tsx
<PageLayout>
  <PageHeader title={store.name} backHref="/owner" />
  <Card>
    {/* Content */}
  </Card>
</PageLayout>
```

Benefits:
- 60% less code
- Consistent styling automatically
- Mobile responsive out of the box
- Easier to maintain
