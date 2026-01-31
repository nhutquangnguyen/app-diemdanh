'use client';

/**
 * IconButton - Reusable icon button with consistent styling
 *
 * Design principles:
 * - Consistent sizing (sm, md, lg)
 * - Color variants (primary, secondary, danger, ghost)
 * - Smooth transitions
 * - Accessibility support
 */

import { ReactNode } from 'react';

interface IconButtonProps {
  /** Icon element (SVG) */
  icon: ReactNode;
  /** Click handler */
  onClick?: () => void;
  /** Button size */
  size?: 'sm' | 'md' | 'lg';
  /** Color variant */
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  /** Disabled state */
  disabled?: boolean;
  /** Aria label for accessibility */
  ariaLabel?: string;
  /** Optional title (tooltip) */
  title?: string;
  /** Custom className */
  className?: string;
}

export default function IconButton({
  icon,
  onClick,
  size = 'md',
  variant = 'ghost',
  disabled = false,
  ariaLabel,
  title,
  className = ''
}: IconButtonProps) {
  const sizeClasses = {
    sm: 'p-1.5',
    md: 'p-2',
    lg: 'p-3'
  };

  const variantClasses = {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white',
    secondary: 'bg-gray-600 hover:bg-gray-700 text-white',
    danger: 'bg-red-600 hover:bg-red-700 text-white',
    ghost: 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
  };

  const disabledClass = disabled
    ? 'opacity-50 cursor-not-allowed'
    : 'cursor-pointer';

  return (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      title={title}
      className={`rounded-lg transition-all ${sizeClasses[size]} ${variantClasses[variant]} ${disabledClass} ${className}`}
    >
      {icon}
    </button>
  );
}
