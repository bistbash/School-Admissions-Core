import React, { useState } from 'react';
import { ChevronRight, ChevronLeft, X, AlertCircle } from 'lucide-react';
import { Modal } from '../../shared/ui/Modal';
import { Button } from '../../shared/ui/Button';
import { cn } from '../../shared/lib/utils';

interface ConflictSuggestion {
  type: string;
  message: string;
  messageHebrew: string;
  suggestions?: string[];
}

interface RowConflict {
  row: number;
  idNumber?: string;
  firstName?: string;
  lastName?: string;
  conflicts: ConflictSuggestion[];
}

interface ConflictsModalProps {
  isOpen: boolean;
  onClose: () => void;
  conflicts: RowConflict[];
  onResolve?: () => void;
}

export function ConflictsModal({ isOpen, onClose, conflicts, onResolve }: ConflictsModalProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (conflicts.length === 0) {
    return null;
  }

  const currentConflict = conflicts[currentIndex];
  const hasNext = currentIndex < conflicts.length - 1;
  const hasPrevious = currentIndex > 0;

  const handleNext = () => {
    if (hasNext) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (hasPrevious) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleClose = () => {
    setCurrentIndex(0);
    onClose();
  };

  // Keyboard navigation
  React.useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' && hasNext) {
        e.preventDefault();
        setCurrentIndex(prev => prev + 1);
      } else if (e.key === 'ArrowLeft' && hasPrevious) {
        e.preventDefault();
        setCurrentIndex(prev => prev - 1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, hasNext, hasPrevious]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="קונפליקטים שזוהו"
      size="xl"
    >
      <div className="space-y-6">
        {/* Progress indicator */}
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              קונפליקט {currentIndex + 1} מתוך {conflicts.length}
            </span>
            <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden max-w-xs">
              <div
                className="h-full bg-blue-600 dark:bg-blue-500 transition-all duration-300"
                style={{ width: `${((currentIndex + 1) / conflicts.length) * 100}%` }}
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handlePrevious}
              disabled={!hasPrevious}
              className="p-2"
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleNext}
              disabled={!hasNext}
              className="p-2"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Current Conflict */}
        <div className="p-6 rounded-lg bg-white dark:bg-[#1A1A1A] border-2 border-amber-200 dark:border-amber-800 shadow-lg">
          {/* Conflict Header */}
          <div className="mb-4 pb-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-full bg-amber-100 dark:bg-amber-900/30">
                <AlertCircle className="h-6 w-6 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-black dark:text-white mb-1">
                  שורה {currentConflict.row}
                </h3>
                <div className="flex flex-wrap gap-3 text-sm text-gray-600 dark:text-gray-400">
                  {currentConflict.idNumber && (
                    <span>
                      <span className="font-medium">ת.ז:</span> {currentConflict.idNumber}
                    </span>
                  )}
                  {currentConflict.firstName && currentConflict.lastName && (
                    <span>
                      <span className="font-medium">שם:</span> {currentConflict.firstName} {currentConflict.lastName}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Conflicts List */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              בעיות שזוהו ({currentConflict.conflicts.length}):
            </h4>
            {currentConflict.conflicts.map((conflict, idx) => (
              <div
                key={idx}
                className="p-4 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50"
              >
                <div className="flex items-start gap-2 mb-2">
                  <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm font-medium text-red-900 dark:text-red-100 flex-1">
                    {conflict.messageHebrew}
                  </p>
                </div>
                {conflict.suggestions && conflict.suggestions.length > 0 && (
                  <div className="mt-3 pl-7 border-r-2 border-blue-300 dark:border-blue-700 pr-3">
                    <p className="text-xs font-semibold text-blue-900 dark:text-blue-100 mb-2">
                      הצעות לפתרון:
                    </p>
                    <ul className="space-y-1.5">
                      {conflict.suggestions.map((suggestion, sIdx) => (
                        <li
                          key={sIdx}
                          className="text-sm text-blue-700 dark:text-blue-300 flex items-start gap-2"
                        >
                          <span className="text-blue-500 dark:text-blue-400 mt-1">•</span>
                          <span>{suggestion}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Navigation Help */}
        <div className="p-3 rounded-lg bg-gray-50 dark:bg-[#0F0F0F] border border-gray-200 dark:border-[#1F1F1F]">
          <p className="text-xs text-gray-600 dark:text-gray-400 text-center">
            השתמש בחצים או במקשי המקלדת ← → כדי לנווט בין הקונפליקטים
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-[#1F1F1F]">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handlePrevious}
              disabled={!hasPrevious}
            >
              <ChevronRight className="h-4 w-4 ml-1" />
              קודם
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleNext}
              disabled={!hasNext}
            >
              הבא
              <ChevronLeft className="h-4 w-4 mr-1" />
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={handleClose}
            >
              סגור
            </Button>
            {onResolve && (
              <Button
                onClick={() => {
                  handleClose();
                  onResolve();
                }}
              >
                פתור קונפליקטים
              </Button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
