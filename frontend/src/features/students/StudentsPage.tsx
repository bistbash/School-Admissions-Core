import React, { useState, useEffect } from 'react';
import { Plus, Upload, Search, Filter, GraduationCap } from 'lucide-react';
import { Button } from '../../shared/ui/Button';
import { Input } from '../../shared/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '../../shared/ui/Card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../shared/ui/Tabs';
import { apiClient } from '../../shared/lib/api';
import { AddStudentModal } from './AddStudentModal';
import { UploadExcelModal } from './UploadExcelModal';
import { StudentsTable } from './StudentsTable';
import { TracksManagement } from './TracksManagement';
import { CohortsManagement } from './CohortsManagement';
import { Select } from '../../shared/ui/Select';

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

interface Cohort {
  id: number;
  name: string;
  startYear: number;
  currentGrade: string;
  isActive: boolean;
}

export function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    status: '',
    grade: '',
    cohortId: '',
    gender: '',
  });

  useEffect(() => {
    loadStudents();
    loadCohorts();
  }, [filters]);

  const loadStudents = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.grade) params.append('grade', filters.grade);
      if (filters.cohortId) params.append('cohortId', filters.cohortId);
      if (filters.gender) params.append('gender', filters.gender);

      const response = await apiClient.get(`/students?${params.toString()}`);
      setStudents(response.data || []);
    } catch (error) {
      console.error('Failed to load students:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadCohorts = async () => {
    try {
      const response = await apiClient.get('/cohorts');
      setCohorts(response.data || []);
    } catch (error) {
      console.error('Failed to load cohorts:', error);
    }
  };

  const handleStudentAdded = () => {
    setIsAddModalOpen(false);
    loadStudents();
  };

  const handleUploadComplete = () => {
    setIsUploadModalOpen(false);
    loadStudents();
  };

  const filteredStudents = students.filter((student) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      student.firstName.toLowerCase().includes(query) ||
      student.lastName.toLowerCase().includes(query) ||
      student.idNumber.includes(query)
    );
  });

  const clearFilters = () => {
    setFilters({
      status: '',
      grade: '',
      cohortId: '',
      gender: '',
    });
    setSearchQuery('');
  };

  const hasActiveFilters = Object.values(filters).some((v) => v !== '') || searchQuery !== '';

  return (
    <div className="space-y-6 animate-in max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-medium tracking-tight text-black dark:text-white flex items-center gap-2">
            <GraduationCap className="h-6 w-6" />
            ניהול תלמידים
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            ניהול מקצועי של תלמידי בית הספר
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setIsUploadModalOpen(true)}
            className="gap-2"
          >
            <Upload className="h-4 w-4" />
            העלאת אקסל ממשו״ב
          </Button>
          <Button
            onClick={() => setIsAddModalOpen(true)}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            הוסף תלמיד
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="students" className="w-full">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="students">תלמידים</TabsTrigger>
          <TabsTrigger value="tracks">מגמות</TabsTrigger>
          <TabsTrigger value="cohorts">מחזורים</TabsTrigger>
        </TabsList>

        {/* Students Tab */}
        <TabsContent value="students" className="space-y-6">

          {/* Filters and Search */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                חיפוש וסינון
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="חפש לפי שם, שם משפחה או ת.ז..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pr-10"
                  />
                </div>

                {/* Filters Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Select
                    label="סטטוס"
                    value={filters.status}
                    onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                    options={[
                      { value: '', label: 'הכל' },
                      { value: 'ACTIVE', label: 'פעיל' },
                      { value: 'GRADUATED', label: 'בוגר' },
                      { value: 'LEFT', label: 'עזב' },
                      { value: 'ARCHIVED', label: 'בארכיון' },
                    ]}
                  />
                  <Select
                    label="כיתה"
                    value={filters.grade}
                    onChange={(e) => setFilters({ ...filters, grade: e.target.value })}
                    options={[
                      { value: '', label: 'הכל' },
                      { value: 'ט\'', label: 'ט\'' },
                      { value: 'י\'', label: 'י\'' },
                      { value: 'י"א', label: 'י"א' },
                      { value: 'י"ב', label: 'י"ב' },
                      { value: 'י"ג', label: 'י"ג' },
                      { value: 'י"ד', label: 'י"ד' },
                    ]}
                  />
                  <Select
                    label="מין"
                    value={filters.gender}
                    onChange={(e) => setFilters({ ...filters, gender: e.target.value })}
                    options={[
                      { value: '', label: 'הכל' },
                      { value: 'MALE', label: 'זכר' },
                      { value: 'FEMALE', label: 'נקבה' },
                    ]}
                  />
                  <Select
                    label="מחזור"
                    value={filters.cohortId}
                    onChange={(e) => setFilters({ ...filters, cohortId: e.target.value })}
                    options={[
                      { value: '', label: 'הכל' },
                      ...cohorts.map((cohort) => ({
                        value: String(cohort.id),
                        label: cohort.name,
                      })),
                    ]}
                  />
                </div>

                {hasActiveFilters && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearFilters}
                    className="w-full md:w-auto"
                  >
                    נקה סינון
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Students Table */}
          <Card>
            <CardHeader>
              <CardTitle>
                רשימת תלמידים ({filteredStudents.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-300 dark:border-[#1F1F1F] border-t-gray-900 dark:border-t-[#FAFAFA]"></div>
                </div>
              ) : (
                <StudentsTable
                  students={filteredStudents}
                  onRefresh={loadStudents}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tracks Tab */}
        <TabsContent value="tracks">
          <TracksManagement />
        </TabsContent>

        {/* Cohorts Tab */}
        <TabsContent value="cohorts">
          <CohortsManagement />
        </TabsContent>
      </Tabs>

      {/* Modals */}
      <AddStudentModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={handleStudentAdded}
        cohorts={cohorts}
      />
      <UploadExcelModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onSuccess={handleUploadComplete}
      />
    </div>
  );
}
