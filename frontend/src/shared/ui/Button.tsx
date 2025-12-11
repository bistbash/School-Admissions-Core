import React from 'react';
import { cn } from '../lib/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline' | 'ghost' | 'destructive' | 'secondary';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'md', isLoading, children, disabled, ...props }, ref) => {
    const baseStyles = 
      'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl sm:rounded-lg font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.95] sm:active:scale-[0.98]';
    
    const variants = {
      default: 
        'bg-black text-white hover:bg-gray-900 dark:bg-white dark:text-black dark:hover:bg-gray-100 focus-visible:ring-black dark:focus-visible:ring-white',
      secondary:
        'bg-gray-100 text-black hover:bg-gray-200 dark:bg-[#050505] dark:text-white dark:hover:bg-[#000000] focus-visible:ring-gray-500',
      outline: 
        'border border-gray-200 dark:border-[#1A1A1A] bg-transparent hover:bg-gray-100 hover:border-gray-300 dark:hover:bg-[#0F0F0F] dark:hover:border-[#1F1F1F] focus-visible:ring-gray-500',
      ghost: 
        'hover:bg-gray-100 dark:hover:bg-[#0F0F0F] focus-visible:ring-gray-500',
      destructive: 
        'bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500',
    };

    const sizes = {
      sm: 'h-8 sm:h-8 px-2.5 sm:px-3 text-xs',
      md: 'h-9 sm:h-9 px-3.5 sm:px-4 text-xs sm:text-sm',
      lg: 'h-10 sm:h-10 px-4 sm:px-5 text-sm',
      icon: 'h-9 w-9',
    };

    return (
      <button
        ref={ref}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? (
          <>
            <svg
              className="animate-spin h-4 w-4"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <span>טוען...</span>
          </>
        ) : (
          children
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';
