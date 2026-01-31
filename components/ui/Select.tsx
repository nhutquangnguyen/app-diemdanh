'use client';

/**
 * Select - Consistent select dropdown component
 *
 * Design principles:
 * - Clean design matching Input component
 * - Support for labels and error messages
 * - Consistent focus states
 */

import { SelectHTMLAttributes } from 'react';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  /** Select label */
  label?: string;
  /** Error message */
  error?: string;
  /** Options array */
  options: SelectOption[];
  /** Helper text below select */
  helperText?: string;
  /** Custom container className */
  containerClassName?: string;
}

export default function Select({
  label,
  error,
  options,
  helperText,
  containerClassName = '',
  className = '',
  ...props
}: SelectProps) {
  const baseSelectClasses = 'w-full px-4 py-3 border rounded-lg transition-all focus:outline-none focus:ring-2 bg-white appearance-none cursor-pointer';

  const stateClasses = error
    ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
    : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500';

  return (
    <div className={containerClassName}>
      {label && (
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          {label}
        </label>
      )}

      <div className="relative">
        <select
          className={`${baseSelectClasses} ${stateClasses} ${className}`}
          {...props}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        {/* Dropdown arrow */}
        <div className="absolute right-4 top-1/2 transform -translate-y-1/2 pointer-events-none text-gray-400">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
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
