'use client';

/**
 * PageLayout - Shared component for consistent page structure
 *
 * Design principles from diemdanh.net:
 * - Header always at top with brand logo, QR button, user profile
 * - Main content area with gradient background
 * - Consistent spacing and shadows
 * - Mobile-first responsive design
 */

import { ReactNode } from 'react';
import Header from '@/components/Header';

interface PageLayoutProps {
  children: ReactNode;
  /** Show gradient background (default: true) */
  withGradient?: boolean;
  /** Custom background class */
  backgroundColor?: string;
}

export default function PageLayout({
  children,
  withGradient = true,
  backgroundColor
}: PageLayoutProps) {
  const bgClass = backgroundColor || (withGradient
    ? 'bg-gradient-to-br from-blue-50 to-indigo-100'
    : 'bg-gray-50');

  return (
    <div className={`min-h-screen ${bgClass}`}>
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        {children}
      </main>
    </div>
  );
}
