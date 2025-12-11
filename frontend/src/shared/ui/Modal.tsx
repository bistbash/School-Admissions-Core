import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '../lib/utils';
import { Button } from './Button';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showCloseButton?: boolean;
  closeOnBackdropClick?: boolean;
}

export function Modal({ 
  isOpen, 
  onClose, 
  title,
  subtitle,
  children, 
  size = 'md',
  showCloseButton = true,
  closeOnBackdropClick = true
}: ModalProps) {
  useEffect(() => {
    if (isOpen) {
      // Prevent body scroll when modal is open
      const originalOverflow = document.body.style.overflow;
      const originalPaddingRight = document.body.style.paddingRight;
      
      // Calculate scrollbar width to prevent layout shift
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      
      document.body.style.overflow = 'hidden';
      if (scrollbarWidth > 0) {
        document.body.style.paddingRight = `${scrollbarWidth}px`;
      }
      
      // Focus management: focus the modal when it opens
      const modalElement = document.querySelector('[role="dialog"]') as HTMLElement;
      if (modalElement) {
        // Small delay to ensure modal is rendered
        setTimeout(() => {
          const firstInput = modalElement.querySelector('input:not([type="hidden"]), select, textarea, button:not([aria-label="סגור"])') as HTMLElement;
          if (firstInput) {
            firstInput.focus();
          } else {
            modalElement.focus();
          }
        }, 150);
      }
      
      return () => {
        document.body.style.overflow = originalOverflow;
        document.body.style.paddingRight = originalPaddingRight;
      };
    }
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  };

  if (!isOpen) return null;

  const modalContent = (
    <div 
      className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center" 
      style={{ 
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh',
        margin: 0,
        padding: 0,
      }}
    >
      {/* Backdrop with strong blur - covers entire screen */}
      <div
        onClick={closeOnBackdropClick ? onClose : undefined}
        aria-hidden="true"
        className="animate-in fade-in duration-200"
        style={{ 
          WebkitBackdropFilter: 'blur(12px)',
          backdropFilter: 'blur(12px)',
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: '100vw',
          height: '100vh',
          margin: 0,
          padding: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          zIndex: 9998,
        }}
      />
      
      {/* Modal - Bottom sheet on mobile, centered on desktop */}
      <div
        className={cn(
          'relative w-full bg-white dark:bg-[#080808] border border-gray-200 dark:border-[#1F1F1F] shadow-lg',
          'flex flex-col',
          // Mobile: bottom sheet style
          'sm:rounded-lg sm:max-h-[calc(100vh-2rem)] sm:mx-4',
          'rounded-t-3xl max-h-[90vh] w-full',
          // Animations
          'animate-slide-up sm:animate-in sm:zoom-in-95 sm:fade-in duration-200',
          sizeClasses[size]
        )}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        style={{
          position: 'relative',
          zIndex: 9999,
        }}
      >
        {/* Mobile drag handle */}
        <div className="sm:hidden flex justify-center pt-3 pb-1">
          <div className="w-12 h-1 bg-gray-300 dark:bg-gray-700 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-start justify-between px-4 sm:px-5 pt-2 sm:pt-5 pb-4 sm:pb-5 border-b border-gray-200 dark:border-[#1F1F1F]">
          <div className="flex-1 pr-3 sm:pr-4">
            <h2 id="modal-title" className="text-base sm:text-lg font-semibold text-black dark:text-white">
              {title}
            </h2>
            {subtitle && (
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">
                {subtitle}
              </p>
            )}
          </div>
          {showCloseButton && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8 sm:h-8 sm:w-8 flex-shrink-0 hover:bg-gray-100 dark:hover:bg-gray-800"
              aria-label="סגור"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        
        {/* Content */}
        <div 
          className="px-4 sm:px-5 py-4 sm:py-5 overflow-y-auto flex-1 min-h-0" 
          data-modal-content
          style={{
            scrollbarWidth: 'thin',
            scrollbarColor: 'rgb(209 213 219) transparent'
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );

  // Use portal to render modal at document body level
  return createPortal(modalContent, document.body);
}
