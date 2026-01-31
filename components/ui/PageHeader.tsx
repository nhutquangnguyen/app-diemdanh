'use client';

/**
 * PageHeader - Consistent page header with back button and title
 *
 * Design principles:
 * - Back arrow button on the left
 * - Page title next to back button
 * - Optional subtitle below title
 * - Consistent spacing and typography
 */

import Link from 'next/link';
import { ReactNode } from 'react';

interface PageHeaderProps {
  /** Page title */
  title: string;
  /** Optional subtitle */
  subtitle?: string;
  /** Back button link (if not provided, no back button shown) */
  backHref?: string;
  /** Optional custom back button handler */
  onBack?: () => void;
  /** Optional action buttons on the right */
  actions?: ReactNode;
}

export default function PageHeader({
  title,
  subtitle,
  backHref,
  onBack,
  actions
}: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-3">
        {(backHref || onBack) && (
          <>
            {backHref ? (
              <Link href={backHref}>
                <button className="text-gray-600 hover:text-gray-800 transition-colors">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
              </Link>
            ) : (
              <button
                onClick={onBack}
                className="text-gray-600 hover:text-gray-800 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}
          </>
        )}
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800">{title}</h1>
          {subtitle && (
            <p className="text-sm text-gray-600 mt-1">{subtitle}</p>
          )}
        </div>
      </div>
      {actions && (
        <div className="flex items-center gap-2">
          {actions}
        </div>
      )}
    </div>
  );
}
