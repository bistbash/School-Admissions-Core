import React, { useState } from 'react';
import { Edit, Trash2, Eye, MoreVertical } from 'lucide-react';
import { Button } from '../../shared/ui/Button';
import { cn } from '../../shared/lib/utils';
import { usePageMode } from '../permissions/PageModeContext';

interface Student {
  id: number;
  idNumber: string;
  firstName: string;
  lastName: string;
  gender: 'MALE' | 'FEMALE';
  grade?: string;
  parallel?: string;
  track?: string;
  status: 'ACTIVE' | 'GRADUATED' | 'LEFT' | 'ARCHIVED';
  cohort?: {
    id: number;
    name: string;
    startYear: number;
  };
  enrollments?: Array<{
    id: number;
    class: {
      grade: string;
      parallel?: string;
      track?: string;
      academicYear: number;
    };
  }>;
}

interface StudentsTableProps {
  students: Student[];
  onRefresh: () => void;
  onEdit?: (studentId: number) => void;
  onView?: (studentId: number) => void;
}

const statusLabels: Record<string, string> = {
  ACTIVE: 'פעיל',
  GRADUATED: 'בוגר',
  LEFT: 'עזב',
  ARCHIVED: 'בארכיון',
};

const statusColors: Record<string, string> = {
  ACTIVE: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border border-gray-200 dark:border-gray-700',
  GRADUATED: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border border-gray-200 dark:border-gray-700',
  LEFT: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 border border-gray-200 dark:border-gray-700',
  ARCHIVED: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 border border-gray-200 dark:border-gray-700',
};

export function StudentsTable({ students, onRefresh, onEdit, onView }: StudentsTableProps) {
  const { mode } = usePageMode();
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  const toggleRow = (id: number) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

  const getCurrentClass = (student: Student) => {
    if (student.enrollments && student.enrollments.length > 0) {
      const currentEnrollment = student.enrollments[0];
      const classInfo = currentEnrollment.class;
      const parts = [classInfo.grade];
      if (classInfo.parallel) parts.push(classInfo.parallel);
      if (classInfo.track) parts.push(classInfo.track);
      return parts.join(' - ');
    }
    // Fallback to deprecated fields
    const parts = [];
    if (student.grade) parts.push(student.grade);
    if (student.parallel) parts.push(student.parallel);
    if (student.track) parts.push(student.track);
    return parts.length > 0 ? parts.join(' - ') : '-';
  };

  if (students.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          לא נמצאו תלמידים
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-[#1F1F1F]">
      <table className="w-full">
        <thead>
          <tr className="bg-gray-50 dark:bg-[#0A0A0A] border-b border-gray-200 dark:border-[#1F1F1F]">
            <th className="text-right px-5 py-4 text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
              ת.ז
            </th>
            <th className="text-right px-5 py-4 text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
              שם פרטי
            </th>
            <th className="text-right px-5 py-4 text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
              שם משפחה
            </th>
            <th className="text-right px-5 py-4 text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
              מין
            </th>
            <th className="text-right px-5 py-4 text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
              כיתה
            </th>
            <th className="text-right px-5 py-4 text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
              מחזור
            </th>
            <th className="text-right px-5 py-4 text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
              סטטוס
            </th>
            <th className="text-right px-5 py-4 text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
              פעולות
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-[#1F1F1F] bg-white dark:bg-[#080808]">
          {students.map((student, index) => {
            const isExpanded = expandedRows.has(student.id);
            return (
              <React.Fragment key={student.id}>
                <tr className={cn(
                  "hover:bg-gray-50 dark:hover:bg-[#0F0F0F] transition-colors duration-100",
                  isExpanded && "bg-blue-50/50 dark:bg-blue-950/10"
                )}>
                  <td className="px-5 py-4 text-sm text-black dark:text-white font-mono font-medium">
                    {student.idNumber}
                  </td>
                  <td className="px-5 py-4 text-sm text-black dark:text-white font-medium">
                    {student.firstName}
                  </td>
                  <td className="px-5 py-4 text-sm text-black dark:text-white font-semibold">
                    {student.lastName}
                  </td>
                  <td className="px-5 py-4">
                    <span className="inline-flex items-center px-2.5 py-1 rounded text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700">
                      {student.gender === 'MALE' ? 'זכר' : 'נקבה'}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-sm text-black dark:text-white">
                    <span className="font-medium">{getCurrentClass(student)}</span>
                  </td>
                  <td className="px-5 py-4 text-sm text-gray-700 dark:text-gray-300">
                    {student.cohort?.name || <span className="text-gray-400 dark:text-gray-600">-</span>}
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={cn(
                        'inline-flex items-center px-2.5 py-1 rounded text-xs font-medium',
                        statusColors[student.status] || statusColors.ARCHIVED
                      )}
                    >
                      {statusLabels[student.status] || student.status}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => toggleRow(student.id)}
                        className={cn(
                          "h-8 w-8 hover:bg-gray-200 dark:hover:bg-gray-800",
                          isExpanded && "bg-gray-200 dark:bg-gray-800"
                        )}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
                {isExpanded && (
                  <tr>
                    <td colSpan={8} className="px-5 py-5 bg-gray-50 dark:bg-[#0F0F0F] border-t border-gray-200 dark:border-[#1F1F1F]">
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                          <div className="p-3 rounded-lg bg-white dark:bg-[#0A0A0A] border border-gray-200 dark:border-[#1F1F1F]">
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">ת.ז</p>
                            <p className="text-sm font-mono font-medium text-black dark:text-white">{student.idNumber}</p>
                          </div>
                          <div className="p-3 rounded-lg bg-white dark:bg-[#0A0A0A] border border-gray-200 dark:border-[#1F1F1F]">
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">שם פרטי</p>
                            <p className="text-sm font-medium text-black dark:text-white">{student.firstName}</p>
                          </div>
                          <div className="p-3 rounded-lg bg-white dark:bg-[#0A0A0A] border border-gray-200 dark:border-[#1F1F1F]">
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">שם משפחה</p>
                            <p className="text-sm font-semibold text-black dark:text-white">{student.lastName}</p>
                          </div>
                          <div className="p-3 rounded-lg bg-white dark:bg-[#0A0A0A] border border-gray-200 dark:border-[#1F1F1F]">
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">מין</p>
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700">
                              {student.gender === 'MALE' ? 'זכר' : 'נקבה'}
                            </span>
                          </div>
                          <div className="p-3 rounded-lg bg-white dark:bg-[#0A0A0A] border border-gray-200 dark:border-[#1F1F1F]">
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">כיתה</p>
                            <p className="text-sm font-medium text-black dark:text-white">{getCurrentClass(student)}</p>
                          </div>
                          {student.cohort && (
                            <div className="p-3 rounded-lg bg-white dark:bg-[#0A0A0A] border border-gray-200 dark:border-[#1F1F1F]">
                              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">מחזור</p>
                              <p className="text-sm font-medium text-black dark:text-white">
                                {student.cohort.name} ({student.cohort.startYear})
                              </p>
                            </div>
                          )}
                          {student.enrollments && student.enrollments.length > 0 && (
                            <div className="p-3 rounded-lg bg-white dark:bg-[#0A0A0A] border border-gray-200 dark:border-[#1F1F1F]">
                              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">שנת לימודים</p>
                              <p className="text-sm font-medium text-black dark:text-white">
                                {student.enrollments[0].class.academicYear}
                              </p>
                            </div>
                          )}
                          <div className="p-3 rounded-lg bg-white dark:bg-[#0A0A0A] border border-gray-200 dark:border-[#1F1F1F]">
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">סטטוס</p>
                            <span
                              className={cn(
                                'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
                                statusColors[student.status] || statusColors.ARCHIVED
                              )}
                            >
                              {statusLabels[student.status] || student.status}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 pt-2 border-t border-gray-200 dark:border-[#1F1F1F]">
                          {mode === 'edit' && onEdit && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => onEdit(student.id)}
                              className="gap-2"
                            >
                              <Edit className="h-3.5 w-3.5" />
                              ערוך
                            </Button>
                          )}
                          {onView && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => onView(student.id)}
                              className="gap-2"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              צפה בפרטים
                            </Button>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
