import React from 'react';
import { cn } from '../../lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, helperText, id, ...props }, ref) => {
    const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium leading-none text-gray-700 dark:text-gray-300"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            'flex h-10 w-full rounded-md border bg-white dark:bg-[#1C1C1C] px-3 py-2 text-sm',
            'ring-offset-white dark:ring-offset-black file:border-0 file:bg-transparent file:text-sm file:font-medium',
            'placeholder:text-gray-400 dark:placeholder:text-gray-500',
            'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-black focus-visible:ring-offset-1',
            'disabled:cursor-not-allowed disabled:opacity-50',
            'transition-all duration-150',
            'dark:focus-visible:ring-white',
            error
              ? 'border-red-500 focus-visible:ring-red-500 dark:border-red-500'
              : 'border-gray-200 dark:border-[#333333]',
            className
          )}
          {...props}
        />
        {error && (
          <p className="text-sm font-medium text-red-600 dark:text-red-400">{error}</p>
        )}
        {helperText && !error && (
          <p className="text-sm text-gray-500 dark:text-gray-400">{helperText}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
