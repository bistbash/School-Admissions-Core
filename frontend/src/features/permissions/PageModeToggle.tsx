import React from 'react';
import { Eye, Edit, Lock } from 'lucide-react';
import { Button } from '../../shared/ui/Button';
import { usePageMode } from './PageModeContext';
import { cn } from '../../shared/lib/utils';

/**
 * Toggle component for switching between view and edit modes
 * Only shows if the page supports edit mode and user has edit permission
 */
export function PageModeToggle() {
  const { mode, toggleMode, canEdit, supportsEditMode } = usePageMode();

  // Don't show toggle if page doesn't support edit mode
  if (!supportsEditMode) {
    return null;
  }

  // Don't show toggle if user doesn't have edit permission
  if (!canEdit) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-gray-100 dark:bg-[#1F1F1F] border border-gray-200 dark:border-[#262626]">
        <Lock className="h-4 w-4 text-gray-500 dark:text-gray-400" />
        <span className="text-sm text-gray-600 dark:text-gray-400">מצב צפייה בלבד</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 p-1 rounded-lg bg-gray-100 dark:bg-[#1F1F1F] border border-gray-200 dark:border-[#262626]">
      <Button
        type="button"
        variant={mode === 'view' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => toggleMode()}
        className={cn(
          'gap-2 transition-all',
          mode === 'view'
            ? 'bg-white dark:bg-[#080808] shadow-sm'
            : 'hover:bg-gray-50 dark:hover:bg-[#141414]'
        )}
      >
        <Eye className={cn('h-4 w-4', mode === 'view' ? 'text-black dark:text-white' : 'text-gray-500 dark:text-gray-400')} />
        <span className={cn('text-sm', mode === 'view' ? 'text-black dark:text-white font-medium' : 'text-gray-600 dark:text-gray-400')}>
          צפייה
        </span>
      </Button>
      <Button
        type="button"
        variant={mode === 'edit' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => toggleMode()}
        className={cn(
          'gap-2 transition-all',
          mode === 'edit'
            ? 'bg-white dark:bg-[#080808] shadow-sm'
            : 'hover:bg-gray-50 dark:hover:bg-[#141414]'
        )}
      >
        <Edit className={cn('h-4 w-4', mode === 'edit' ? 'text-black dark:text-white' : 'text-gray-500 dark:text-gray-400')} />
        <span className={cn('text-sm', mode === 'edit' ? 'text-black dark:text-white font-medium' : 'text-gray-600 dark:text-gray-400')}>
          עריכה
        </span>
      </Button>
    </div>
  );
}
