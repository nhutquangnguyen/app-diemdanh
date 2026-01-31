'use client';

/**
 * Badge - Small status indicators and labels
 *
 * Design principles:
 * - Color-coded for different states
 * - Compact size
 * - Optional dot indicator
 */

import { ReactNode } from 'react';

interface BadgeProps {
  /** Badge content */
  children: ReactNode;
  /** Badge variant */
  variant?: 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'gray';
  /** Show dot indicator */
  dot?: boolean;
  /** Pulse animation for dot */
  pulse?: boolean;
  /** Custom className */
  className?: string;
}

export default function Badge({
  children,
  variant = 'gray',
  dot = false,
  pulse = false,
  className = '',
}: BadgeProps) {
  const variantClasses = {
    primary: 'bg-blue-100 text-blue-700',
    success: 'bg-green-100 text-green-700',
    warning: 'bg-yellow-100 text-yellow-700',
    danger: 'bg-red-100 text-red-700',
    info: 'bg-indigo-100 text-indigo-700',
    gray: 'bg-gray-100 text-gray-700',
  };

  const dotColors = {
    primary: 'bg-blue-500',
    success: 'bg-green-500',
    warning: 'bg-yellow-500',
    danger: 'bg-red-500',
    info: 'bg-indigo-500',
    gray: 'bg-gray-500',
  };

  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-semibold ${variantClasses[variant]} ${className}`}>
      {dot && (
        <span className={`w-2 h-2 rounded-full ${dotColors[variant]} ${pulse ? 'animate-pulse' : ''}`}></span>
      )}
      {children}
    </span>
  );
}
