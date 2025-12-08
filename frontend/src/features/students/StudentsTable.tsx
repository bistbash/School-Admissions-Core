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
}

const statusLabels: Record<string, string> = {
  ACTIVE: 'פעיל',
  GRADUATED: 'בוגר',
  LEFT: 'עזב',
  ARCHIVED: 'בארכיון',
};

const statusColors: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-800 dark:bg-green-950/30 dark:text-green-400',
  GRADUATED: 'bg-blue-100 text-blue-800 dark:bg-blue-950/30 dark:text-blue-400',
  LEFT: 'bg-amber-100 text-amber-800 dark:bg-amber-950/30 dark:text-amber-400',
  ARCHIVED: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400',
};

export function StudentsTable({ students, onRefresh }: StudentsTableProps) {
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
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-200 dark:border-[#1F1F1F]">
            <th className="text-right px-4 py-3 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
              ת.ז
            </th>
            <th className="text-right px-4 py-3 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
              שם פרטי
            </th>
            <th className="text-right px-4 py-3 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
              שם משפחה
            </th>
            <th className="text-right px-4 py-3 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
              מין
            </th>
            <th className="text-right px-4 py-3 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
              כיתה
            </th>
            <th className="text-right px-4 py-3 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
              מחזור
            </th>
            <th className="text-right px-4 py-3 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
              סטטוס
            </th>
            <th className="text-right px-4 py-3 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
              פעולות
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-[#1F1F1F]">
          {students.map((student) => {
            const isExpanded = expandedRows.has(student.id);
            return (
              <React.Fragment key={student.id}>
                <tr className="hover:bg-gray-50 dark:hover:bg-[#0F0F0F] transition-colors">
                  <td className="px-4 py-3 text-sm text-black dark:text-white font-mono">
                    {student.idNumber}
                  </td>
                  <td className="px-4 py-3 text-sm text-black dark:text-white">
                    {student.firstName}
                  </td>
                  <td className="px-4 py-3 text-sm text-black dark:text-white font-medium">
                    {student.lastName}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                    {student.gender === 'MALE' ? 'זכר' : 'נקבה'}
                  </td>
                  <td className="px-4 py-3 text-sm text-black dark:text-white">
                    {getCurrentClass(student)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                    {student.cohort?.name || '-'}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                        statusColors[student.status] || statusColors.ARCHIVED
                      )}
                    >
                      {statusLabels[student.status] || student.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => toggleRow(student.id)}
                        className="h-8 w-8"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
                {isExpanded && (
                  <tr>
                    <td colSpan={8} className="px-4 py-4 bg-gray-50 dark:bg-[#0F0F0F]">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600 dark:text-gray-400">ת.ז: </span>
                          <span className="text-black dark:text-white font-mono">{student.idNumber}</span>
                        </div>
                        {student.cohort && (
                          <div>
                            <span className="text-gray-600 dark:text-gray-400">מחזור: </span>
                            <span className="text-black dark:text-white">{student.cohort.name} ({student.cohort.startYear})</span>
                          </div>
                        )}
                        {student.enrollments && student.enrollments.length > 0 && (
                          <div>
                            <span className="text-gray-600 dark:text-gray-400">שנת לימודים: </span>
                            <span className="text-black dark:text-white">
                              {student.enrollments[0].class.academicYear}
                            </span>
                          </div>
                        )}
                        <div>
                          <span className="text-gray-600 dark:text-gray-400">סטטוס: </span>
                          <span className="text-black dark:text-white">
                            {statusLabels[student.status] || student.status}
                          </span>
                        </div>
                      </div>
                      <div className="mt-4 flex items-center gap-2">
                        {mode === 'edit' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              // TODO: Implement edit functionality
                              console.log('Edit student', student.id);
                            }}
                          >
                            <Edit className="h-3 w-3 ml-1" />
                            ערוך
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            // TODO: Implement view details functionality
                            console.log('View student', student.id);
                          }}
                        >
                          <Eye className="h-3 w-3 ml-1" />
                          צפה בפרטים
                        </Button>
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
