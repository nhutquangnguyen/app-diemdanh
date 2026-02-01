/**
 * Shared Feature
 *
 * Provides common utilities, hooks, and components that are reused across all features.
 * This feature doesn't have its own UI but exports shared functionality.
 */

import { Feature } from '@/core/types/feature';

// Shared utilities component (no UI)
function SharedUtilities() {
  return null;
}

export const sharedFeature: Feature = {
  id: 'shared',
  name: 'Shared Utilities',
  version: '1.0.0',

  component: SharedUtilities,

  configSchema: {
    // No configuration needed for shared utilities
  },

  // This feature provides utilities for other features
  // Other features can declare dependency on 'shared'
};

// Export shared hooks
export { usePagination } from './hooks/usePagination';

// Export all query hooks
export * from './hooks/useQueries';

// Future exports can be added here:
// export { formatCurrency } from './utils/formatters';
// export { validateEmail } from './utils/validators';
