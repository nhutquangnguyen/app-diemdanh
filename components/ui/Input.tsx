'use client';

/**
 * Input - Consistent input field component
 *
 * Design principles:
 * - Clean, minimal design with focus states
 * - Support for labels, placeholders, and error messages
 * - Icon support
 * - Consistent sizing
 */

import { InputHTMLAttributes, ReactNode } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  /** Input label */
  label?: string;
  /** Error message */
  error?: string;
  /** Icon before input */
  iconBefore?: ReactNode;
  /** Icon after input */
  iconAfter?: ReactNode;
  /** Helper text below input */
  helperText?: string;
  /** Custom container className */
  containerClassName?: string;
}

export default function Input({
  label,
  error,
  iconBefore,
  iconAfter,
  helperText,
  containerClassName = '',
  className = '',
  ...props
}: InputProps) {
  const baseInputClasses = 'w-full px-4 py-3 border rounded-lg transition-all focus:outline-none focus:ring-2';

  const stateClasses = error
    ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
    : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500';

  const iconPaddingClasses = iconBefore ? 'pl-12' : iconAfter ? 'pr-12' : '';

  return (
    <div className={containerClassName}>
      {label && (
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          {label}
        </label>
      )}

      <div className="relative">
        {iconBefore && (
          <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400">
            {iconBefore}
          </div>
        )}

        <input
          className={`${baseInputClasses} ${stateClasses} ${iconPaddingClasses} ${className}`}
          {...props}
        />

        {iconAfter && (
          <div className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400">
            {iconAfter}
          </div>
        )}
      </div>

      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}

      {helperText && !error && (
        <p className="mt-1 text-sm text-gray-500">{helperText}</p>
      )}
    </div>
  );
}
