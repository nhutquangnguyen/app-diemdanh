'use client';

/**
 * Card - Consistent card component with shadow and rounded corners
 *
 * Design principles:
 * - White background with shadow
 * - Rounded corners
 * - Optional padding control
 * - Optional hover effects
 */

import { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  /** Custom padding (default: standard padding) */
  padding?: 'none' | 'sm' | 'md' | 'lg';
  /** Add hover effect */
  hoverable?: boolean;
  /** Custom className */
  className?: string;
  /** Click handler */
  onClick?: () => void;
}

export default function Card({
  children,
  padding = 'md',
  hoverable = false,
  className = '',
  onClick
}: CardProps) {
  const paddingClasses = {
    none: '',
    sm: 'p-3',
    md: 'p-4 sm:p-6',
    lg: 'p-6 sm:p-8'
  };

  const hoverClass = hoverable ? 'hover:shadow-xl transition-shadow cursor-pointer' : '';
  const clickableClass = onClick ? 'cursor-pointer' : '';

  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-lg shadow-lg ${paddingClasses[padding]} ${hoverClass} ${clickableClass} ${className}`}
    >
      {children}
    </div>
  );
}
