import React from 'react';
import { Eye, Lock } from 'lucide-react';
import { usePageMode } from '../../features/permissions/PageModeContext';
import { cn } from '../lib/utils';

interface PageWrapperProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Wrapper component that adds visual indicators for page mode
 * - Shows a banner for view-only pages (pages without edit mode support)
 * - Adds visual styling based on current mode
 */
export function PageWrapper({ children, className }: PageWrapperProps) {
  const { mode, supportsEditMode } = usePageMode();

  return (
    <div className={cn('space-y-6', className)}>
      {/* Page content */}
      {children}
    </div>
  );
}
