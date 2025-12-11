import React, { useState, useEffect } from 'react';
import { Modal } from '../../shared/ui/Modal';
import { Button } from '../../shared/ui/Button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../shared/ui/Tabs';
import { apiClient } from '../../shared/lib/api';
import { cn } from '../../shared/lib/utils';

interface Student {
  id: number;
  idNumber: string;
  firstName: string;
  lastName: string;
  gender: 'MALE' | 'FEMALE';
  grade?: string;
  parallel?: string;
  track?: string;
  status?: 'ACTIVE' | 'GRADUATED' | 'LEFT' | 'ARCHIVED';
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
    enrollmentDate?: string;
  }>;
  dateOfBirth?: string;
  email?: string;
  aliyahDate?: string;
  locality?: string;
  address?: string;
  address2?: string;
  locality2?: string;
  phone?: string;
  mobilePhone?: string;
  parent1IdNumber?: string;
  parent1FirstName?: string;
  parent1LastName?: string;
  parent1Type?: string;
  parent1Mobile?: string;
  parent1Email?: string;
  parent2IdNumber?: string;
  parent2FirstName?: string;
  parent2LastName?: string;
  parent2Type?: string;
  parent2Mobile?: string;
  parent2Email?: string;
  studyStartDate?: string;
}

interface ViewStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentId: number | null;
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

export function ViewStudentModal({ isOpen, onClose, studentId }: ViewStudentModalProps) {
  const [student, setStudent] = useState<Student | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen && studentId) {
      loadStudent();
    }
  }, [isOpen, studentId]);

  const loadStudent = async () => {
    if (!studentId) return;
    
    try {
      setIsLoading(true);
      const response = await apiClient.get(`/students/${studentId}?includeHistory=true`);
      setStudent(response.data);
    } catch (error) {
      console.error('Failed to load student:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (date: string | Date | null | undefined): string => {
    if (!date) return '-';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('he-IL');
  };

  const getCurrentClass = () => {
    if (student?.enrollments && student.enrollments.length > 0) {
      const currentEnrollment = student.enrollments[0];
      const classInfo = currentEnrollment.class;
      const parts = [classInfo.grade];
      if (classInfo.parallel) parts.push(classInfo.parallel);
      if (classInfo.track) parts.push(classInfo.track);
      return parts.join(' - ');
    }
    const parts = [];
    if (student?.grade) parts.push(student.grade);
    if (student?.parallel) parts.push(student.parallel);
    if (student?.track) parts.push(student.track);
    return parts.length > 0 ? parts.join(' - ') : '-';
  };

  if (isLoading) {
    return (
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="פרטי תלמיד"
        size="xl"
      >
        <div className="flex items-center justify-center py-16">
          <div className="flex flex-col items-center gap-3">
            <div className="animate-spin rounded-full h-10 w-10 border-3 border-gray-300 dark:border-[#1F1F1F] border-t-blue-600 dark:border-t-blue-400"></div>
            <p className="text-sm text-gray-500 dark:text-gray-400">טוען פרטי תלמיד...</p>
          </div>
        </div>
      </Modal>
    );
  }

  if (!student) {
    return (
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="פרטי תלמיד"
        size="xl"
      >
        <div className="text-center py-16">
          <p className="text-sm text-gray-500 dark:text-gray-400">לא נמצאו פרטי תלמיד</p>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`פרטי תלמיד - ${student.firstName} ${student.lastName}`}
      size="xl"
    >
      <Tabs defaultValue="basic" className="w-full">
        <div className="border-b border-gray-200 dark:border-[#1F1F1F] mb-4">
          <TabsList className="w-full justify-start bg-transparent h-auto p-0 gap-0">
            <TabsTrigger value="basic" className="px-4 py-3 font-medium text-sm">פרטים בסיסיים</TabsTrigger>
            <TabsTrigger value="academic" className="px-4 py-3 font-medium text-sm">פרטים אקדמיים</TabsTrigger>
            <TabsTrigger value="address" className="px-4 py-3 font-medium text-sm">פרטי מגורים</TabsTrigger>
            <TabsTrigger value="parents" className="px-4 py-3 font-medium text-sm">פרטי הורים</TabsTrigger>
            {student.enrollments && student.enrollments.length > 0 && (
              <TabsTrigger value="history" className="px-4 py-3 font-medium text-sm">היסטוריית הרשמות</TabsTrigger>
            )}
          </TabsList>
        </div>

        {/* Basic Information Tab */}
        <TabsContent value="basic" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-3 rounded-lg bg-gray-50 dark:bg-[#0F0F0F] border border-gray-200 dark:border-[#1F1F1F]">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">מספר ת.ז</p>
              <p className="text-sm font-mono font-medium text-black dark:text-white">{student.idNumber}</p>
            </div>
            <div className="p-3 rounded-lg bg-gray-50 dark:bg-[#0F0F0F] border border-gray-200 dark:border-[#1F1F1F]">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">שם פרטי</p>
              <p className="text-sm font-medium text-black dark:text-white">{student.firstName}</p>
            </div>
            <div className="p-3 rounded-lg bg-gray-50 dark:bg-[#0F0F0F] border border-gray-200 dark:border-[#1F1F1F]">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">שם משפחה</p>
              <p className="text-sm font-semibold text-black dark:text-white">{student.lastName}</p>
            </div>
            <div className="p-3 rounded-lg bg-gray-50 dark:bg-[#0F0F0F] border border-gray-200 dark:border-[#1F1F1F]">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">מין</p>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700">
                {student.gender === 'MALE' ? 'זכר' : 'נקבה'}
              </span>
            </div>
            <div className="p-3 rounded-lg bg-gray-50 dark:bg-[#0F0F0F] border border-gray-200 dark:border-[#1F1F1F]">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">תאריך לידה</p>
              <p className="text-sm font-medium text-black dark:text-white">{formatDate(student.dateOfBirth)}</p>
            </div>
            <div className="p-3 rounded-lg bg-gray-50 dark:bg-[#0F0F0F] border border-gray-200 dark:border-[#1F1F1F]">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">דואר אלקטרוני</p>
              <p className="text-sm font-medium text-black dark:text-white">{student.email || '-'}</p>
            </div>
          </div>
        </TabsContent>

        {/* Academic Information Tab */}
        <TabsContent value="academic" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-3 rounded-lg bg-gray-50 dark:bg-[#0F0F0F] border border-gray-200 dark:border-[#1F1F1F]">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">כיתה</p>
              <p className="text-sm font-medium text-black dark:text-white">{getCurrentClass()}</p>
            </div>
            {student.cohort && (
              <div className="p-3 rounded-lg bg-gray-50 dark:bg-[#0F0F0F] border border-gray-200 dark:border-[#1F1F1F]">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">מחזור</p>
                <p className="text-sm font-medium text-black dark:text-white">
                  {student.cohort.name} ({student.cohort.startYear})
                </p>
              </div>
            )}
            {student.enrollments && student.enrollments.length > 0 && (
              <div className="p-3 rounded-lg bg-gray-50 dark:bg-[#0F0F0F] border border-gray-200 dark:border-[#1F1F1F]">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">שנת לימודים נוכחית</p>
                <p className="text-sm font-medium text-black dark:text-white">
                  {student.enrollments[0].class.academicYear}
                </p>
              </div>
            )}
            <div className="p-3 rounded-lg bg-gray-50 dark:bg-[#0F0F0F] border border-gray-200 dark:border-[#1F1F1F]">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">סטטוס</p>
              <span
                className={cn(
                  'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
                  statusColors[student.status || 'ACTIVE'] || statusColors.ARCHIVED
                )}
              >
                {statusLabels[student.status || 'ACTIVE'] || student.status || '-'}
              </span>
            </div>
            {student.studyStartDate && (
              <div className="p-3 rounded-lg bg-gray-50 dark:bg-[#0F0F0F] border border-gray-200 dark:border-[#1F1F1F]">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">תאריך התחלת לימודים</p>
                <p className="text-sm font-medium text-black dark:text-white">{formatDate(student.studyStartDate)}</p>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Address Information Tab */}
        <TabsContent value="address" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-3 rounded-lg bg-gray-50 dark:bg-[#0F0F0F] border border-gray-200 dark:border-[#1F1F1F]">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">יישוב</p>
              <p className="text-sm font-medium text-black dark:text-white">{student.locality || '-'}</p>
            </div>
            <div className="p-3 rounded-lg bg-gray-50 dark:bg-[#0F0F0F] border border-gray-200 dark:border-[#1F1F1F]">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">כתובת</p>
              <p className="text-sm font-medium text-black dark:text-white">{student.address || '-'}</p>
            </div>
            {student.locality2 && (
              <div className="p-3 rounded-lg bg-gray-50 dark:bg-[#0F0F0F] border border-gray-200 dark:border-[#1F1F1F]">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">יישוב נוסף</p>
                <p className="text-sm font-medium text-black dark:text-white">{student.locality2}</p>
              </div>
            )}
            {student.address2 && (
              <div className="p-3 rounded-lg bg-gray-50 dark:bg-[#0F0F0F] border border-gray-200 dark:border-[#1F1F1F]">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">כתובת נוספת</p>
                <p className="text-sm font-medium text-black dark:text-white">{student.address2}</p>
              </div>
            )}
            <div className="p-3 rounded-lg bg-gray-50 dark:bg-[#0F0F0F] border border-gray-200 dark:border-[#1F1F1F]">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">טלפון</p>
              <p className="text-sm font-medium text-black dark:text-white">{student.phone || '-'}</p>
            </div>
            <div className="p-3 rounded-lg bg-gray-50 dark:bg-[#0F0F0F] border border-gray-200 dark:border-[#1F1F1F]">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">טלפון נייד</p>
              <p className="text-sm font-medium text-black dark:text-white">{student.mobilePhone || '-'}</p>
            </div>
            {student.aliyahDate && (
              <div className="p-3 rounded-lg bg-gray-50 dark:bg-[#0F0F0F] border border-gray-200 dark:border-[#1F1F1F]">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">תאריך עליה</p>
                <p className="text-sm font-medium text-black dark:text-white">{formatDate(student.aliyahDate)}</p>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Parents Information Tab */}
        <TabsContent value="parents" className="space-y-6 mt-4">
          {/* Parent 1 */}
          {(student.parent1FirstName || student.parent1LastName || student.parent1IdNumber) && (
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-black dark:text-white border-b border-gray-200 dark:border-[#1F1F1F] pb-2">
                פרטי הורה ראשון
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {student.parent1IdNumber && (
                  <div className="p-3 rounded-lg bg-gray-50 dark:bg-[#0F0F0F] border border-gray-200 dark:border-[#1F1F1F]">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">ת.ז הורה</p>
                    <p className="text-sm font-mono font-medium text-black dark:text-white">{student.parent1IdNumber}</p>
                  </div>
                )}
                {student.parent1FirstName && (
                  <div className="p-3 rounded-lg bg-gray-50 dark:bg-[#0F0F0F] border border-gray-200 dark:border-[#1F1F1F]">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">שם פרטי</p>
                    <p className="text-sm font-medium text-black dark:text-white">{student.parent1FirstName}</p>
                  </div>
                )}
                {student.parent1LastName && (
                  <div className="p-3 rounded-lg bg-gray-50 dark:bg-[#0F0F0F] border border-gray-200 dark:border-[#1F1F1F]">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">שם משפחה</p>
                    <p className="text-sm font-medium text-black dark:text-white">{student.parent1LastName}</p>
                  </div>
                )}
                {student.parent1Type && (
                  <div className="p-3 rounded-lg bg-gray-50 dark:bg-[#0F0F0F] border border-gray-200 dark:border-[#1F1F1F]">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">סוג הורה</p>
                    <p className="text-sm font-medium text-black dark:text-white">{student.parent1Type}</p>
                  </div>
                )}
                {student.parent1Mobile && (
                  <div className="p-3 rounded-lg bg-gray-50 dark:bg-[#0F0F0F] border border-gray-200 dark:border-[#1F1F1F]">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">טלפון נייד</p>
                    <p className="text-sm font-medium text-black dark:text-white">{student.parent1Mobile}</p>
                  </div>
                )}
                {student.parent1Email && (
                  <div className="p-3 rounded-lg bg-gray-50 dark:bg-[#0F0F0F] border border-gray-200 dark:border-[#1F1F1F]">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">דואר אלקטרוני</p>
                    <p className="text-sm font-medium text-black dark:text-white">{student.parent1Email}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Parent 2 */}
          {(student.parent2FirstName || student.parent2LastName || student.parent2IdNumber) && (
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-black dark:text-white border-b border-gray-200 dark:border-[#1F1F1F] pb-2">
                פרטי הורה שני
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {student.parent2IdNumber && (
                  <div className="p-3 rounded-lg bg-gray-50 dark:bg-[#0F0F0F] border border-gray-200 dark:border-[#1F1F1F]">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">ת.ז הורה</p>
                    <p className="text-sm font-mono font-medium text-black dark:text-white">{student.parent2IdNumber}</p>
                  </div>
                )}
                {student.parent2FirstName && (
                  <div className="p-3 rounded-lg bg-gray-50 dark:bg-[#0F0F0F] border border-gray-200 dark:border-[#1F1F1F]">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">שם פרטי</p>
                    <p className="text-sm font-medium text-black dark:text-white">{student.parent2FirstName}</p>
                  </div>
                )}
                {student.parent2LastName && (
                  <div className="p-3 rounded-lg bg-gray-50 dark:bg-[#0F0F0F] border border-gray-200 dark:border-[#1F1F1F]">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">שם משפחה</p>
                    <p className="text-sm font-medium text-black dark:text-white">{student.parent2LastName}</p>
                  </div>
                )}
                {student.parent2Type && (
                  <div className="p-3 rounded-lg bg-gray-50 dark:bg-[#0F0F0F] border border-gray-200 dark:border-[#1F1F1F]">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">סוג הורה</p>
                    <p className="text-sm font-medium text-black dark:text-white">{student.parent2Type}</p>
                  </div>
                )}
                {student.parent2Mobile && (
                  <div className="p-3 rounded-lg bg-gray-50 dark:bg-[#0F0F0F] border border-gray-200 dark:border-[#1F1F1F]">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">טלפון נייד</p>
                    <p className="text-sm font-medium text-black dark:text-white">{student.parent2Mobile}</p>
                  </div>
                )}
                {student.parent2Email && (
                  <div className="p-3 rounded-lg bg-gray-50 dark:bg-[#0F0F0F] border border-gray-200 dark:border-[#1F1F1F]">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">דואר אלקטרוני</p>
                    <p className="text-sm font-medium text-black dark:text-white">{student.parent2Email}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {!student.parent1FirstName && !student.parent2FirstName && (
            <div className="text-center py-8 text-sm text-gray-500 dark:text-gray-400">
              לא קיימים פרטי הורים
            </div>
          )}
        </TabsContent>

        {/* Enrollment History Tab */}
        {student.enrollments && student.enrollments.length > 0 && (
          <TabsContent value="history" className="space-y-4 mt-4">
            <div className="space-y-3">
              {student.enrollments.map((enrollment, index) => {
                const classInfo = enrollment.class;
                const classParts = [classInfo.grade];
                if (classInfo.parallel) classParts.push(classInfo.parallel);
                if (classInfo.track) classParts.push(classInfo.track);
                const className = classParts.join(' - ');

                return (
                  <div
                    key={enrollment.id}
                    className="p-4 rounded-lg bg-gray-50 dark:bg-[#0F0F0F] border border-gray-200 dark:border-[#1F1F1F]"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">כיתה</p>
                        <p className="text-sm font-medium text-black dark:text-white">{className}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">שנת לימודים</p>
                        <p className="text-sm font-medium text-black dark:text-white">{classInfo.academicYear}</p>
                      </div>
                      {enrollment.enrollmentDate && (
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">תאריך הרשמה</p>
                          <p className="text-sm font-medium text-black dark:text-white">{formatDate(enrollment.enrollmentDate)}</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </TabsContent>
        )}
      </Tabs>

      <div className="flex items-center justify-end gap-2 pt-4 border-t border-gray-200 dark:border-[#1F1F1F] mt-6">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          className="font-medium"
        >
          סגור
        </Button>
      </div>
    </Modal>
  );
}
