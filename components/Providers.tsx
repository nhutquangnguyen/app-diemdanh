'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { queryClient } from '@/lib/queryClient';
import { ReactNode } from 'react';
import { AuthMonitor } from './AuthMonitor';
import { PluginProvider } from './PluginProvider';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <PluginProvider>
        <AuthMonitor />
        {children}
        <ReactQueryDevtools initialIsOpen={false} />
      </PluginProvider>
    </QueryClientProvider>
  );
}
