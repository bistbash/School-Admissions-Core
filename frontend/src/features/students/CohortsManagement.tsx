import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../shared/ui/Card';
import { apiClient } from '../../shared/lib/api';

interface Cohort {
  id: number;
  name: string;
  startYear: number;
  currentGrade: string | null;
  isActive: boolean;
  _count?: {
    students: number;
  };
}

export function CohortsManagement() {
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadCohorts();
  }, []);

  const loadCohorts = async () => {
    try {
      setIsLoading(true);
      const response = await apiClient.get('/cohorts');
      setCohorts(response.data || []);
    } catch (error) {
      console.error('Failed to load cohorts:', error);
    } finally {
      setIsLoading(false);
    }
  };


  // Get current year to identify "next cohort"
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const currentDay = new Date().getDate();
  const isAfterSeptember1st = currentMonth > 9 || (currentMonth === 9 && currentDay >= 1);
  const nextCohortYear = currentYear + (isAfterSeptember1st ? 1 : 0);

  // Separate cohorts into categories
  const nextCohort = cohorts.find((c) => c.startYear === nextCohortYear);
  const activeCohorts = cohorts.filter((c) => c.isActive && c.startYear !== nextCohortYear);
  const inactiveCohorts = cohorts.filter((c) => !c.isActive && c.startYear !== nextCohortYear);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-black dark:text-white">ניהול מחזורים</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          ניהול מחזורי הלימוד במערכת. מחזורים נוצרים אוטומטית מ-1973 עד השנה הנוכחית + 1.
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-300 dark:border-[#1F1F1F] border-t-gray-900 dark:border-t-[#FAFAFA]"></div>
        </div>
      ) : (
        <>
          {/* Active Cohorts */}
          <Card>
            <CardHeader>
              <CardTitle>מחזורים פעילים ({activeCohorts.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {activeCohorts.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                  אין מחזורים פעילים
                </p>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {activeCohorts.map((cohort) => {
                    const studentCount = cohort._count?.students || 0;
                    return (
                      <div
                        key={cohort.id}
                        className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-[#1F1F1F] bg-white dark:bg-[#080808]"
                      >
                        <div className="flex-1">
                          <p className="font-medium text-black dark:text-white">{cohort.name}</p>
                          <div className="flex items-center gap-4 mt-1 text-sm text-gray-500 dark:text-gray-400">
                            <span>שנת התחלה: {cohort.startYear}</span>
                            <span>כיתה נוכחית: {cohort.currentGrade || 'אין כיתה'}</span>
                            <span>תלמידים: {studentCount}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Next Cohort */}
          {nextCohort && (
            <Card>
              <CardHeader>
                <CardTitle>מחזור הבא</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950">
                    <div className="flex-1">
                      <p className="font-medium text-black dark:text-white">{nextCohort.name}</p>
                      <div className="flex items-center gap-4 mt-1 text-sm text-gray-500 dark:text-gray-400">
                        <span>שנת התחלה: {nextCohort.startYear}</span>
                        <span>תאריך התחלת מחזור: 01.09.{nextCohort.startYear}</span>
                        <span>תלמידים: {nextCohort._count?.students || 0}</span>
                        <span className="text-blue-600 dark:text-blue-400">(במיונים)</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Inactive Cohorts */}
          {inactiveCohorts.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>מחזורים לא פעילים ({inactiveCohorts.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {inactiveCohorts.map((cohort) => {
                    const studentCount = cohort._count?.students || 0;
                    // Calculate end date: cohort starts at startYear, ends 5 years later (after י"ד)
                    // The cohort goes through: ט' (year 1), י' (year 2), י"א (year 3), י"ב (year 4), י"ג (year 5), י"ד (year 6)
                    // So it ends on 01.09.(startYear + 5)
                    const endYear = cohort.startYear + 5;
                    return (
                      <div
                        key={cohort.id}
                        className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-[#1F1F1F] bg-gray-50 dark:bg-[#0F0F0F] opacity-60"
                      >
                        <div className="flex-1">
                          <p className="font-medium text-black dark:text-white">{cohort.name}</p>
                          <div className="flex items-center gap-4 mt-1 text-sm text-gray-500 dark:text-gray-400">
                            <span>שנת התחלה: {cohort.startYear}</span>
                            <span>תאריך סיום מחזור: 01.09.{endYear}</span>
                            <span>תלמידים: {studentCount}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
