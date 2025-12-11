import React, { useState, useEffect, useRef } from 'react';
import { Plus, Upload, Search, Filter, GraduationCap, Trash2, AlertTriangle, Users, TrendingUp, UserCheck, Archive } from 'lucide-react';
import { Button } from '../../shared/ui/Button';
import { Input } from '../../shared/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '../../shared/ui/Card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../shared/ui/Tabs';
import { apiClient } from '../../shared/lib/api';
import { AddStudentModal } from './AddStudentModal';
import { UploadExcelModal } from './UploadExcelModal';
import { StudentsTable } from './StudentsTable';
import { EditStudentModal } from './EditStudentModal';
import { ViewStudentModal } from './ViewStudentModal';
import { TracksManagement } from './TracksManagement';
import { CohortsManagement } from './CohortsManagement';
import { Select } from '../../shared/ui/Select';
import { PageWrapper } from '../../shared/components/PageWrapper';
import { usePageMode } from '../permissions/PageModeContext';
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
  const { mode } = usePageMode();
  const [students, setStudents] = useState<Student[]>([]);
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    status: '',
    grade: '',
    cohortId: '',
    gender: '',
  });
  const [cohortSearchValue, setCohortSearchValue] = useState('');
  const [cohortSuggestions, setCohortSuggestions] = useState<Array<{ value: string; label: string; id: number }>>([]);
  const [showCohortSuggestions, setShowCohortSuggestions] = useState(false);
  const cohortTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const cohortInputRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadStudents();
    loadCohorts();
  }, [filters]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (cohortTimeoutRef.current) {
        clearTimeout(cohortTimeoutRef.current);
      }
    };
  }, []);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (cohortInputRef.current && !cohortInputRef.current.contains(event.target as Node)) {
        setShowCohortSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Update cohort search value when filter changes
  useEffect(() => {
    if (filters.cohortId) {
      const selectedCohort = cohorts.find(c => String(c.id) === filters.cohortId);
      if (selectedCohort) {
        setCohortSearchValue(selectedCohort.name);
      }
    } else {
      setCohortSearchValue('');
    }
  }, [filters.cohortId, cohorts]);

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

  const handleEditStudent = (studentId: number) => {
    setSelectedStudentId(studentId);
    setIsEditModalOpen(true);
  };

  const handleViewStudent = (studentId: number) => {
    setSelectedStudentId(studentId);
    setIsViewModalOpen(true);
  };

  const handleEditSuccess = () => {
    setIsEditModalOpen(false);
    setSelectedStudentId(null);
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
    setCohortSearchValue('');
    setShowCohortSuggestions(false);
  };

  const hasActiveFilters = Object.values(filters).some((v) => v !== '') || searchQuery !== '';

  const isDevelopment = import.meta.env.DEV || import.meta.env.MODE === 'development';

  const generateCohortSuggestions = (input: string, shouldAutoComplete: boolean = false) => {
    if (!input || input.length === 0) {
      setCohortSuggestions([]);
      setShowCohortSuggestions(false);
      return;
    }

    const suggestions: Array<{ value: string; label: string; id: number }> = [];
    const inputTrimmed = input.trim();

    // Helper function to normalize gematria for comparison
    const normalizeGematria = (str: string): string => {
      return str.replace(/['"]/g, '').replace(/מחזור /g, '').trim();
    };

    // Helper function to check if input matches gematria
    const matchesGematria = (cohortName: string, input: string): boolean => {
      const normalizedCohort = normalizeGematria(cohortName);
      const normalizedInput = normalizeGematria(input);
      
      if (normalizedCohort === normalizedInput) return true;
      if (normalizedCohort.startsWith(normalizedInput)) return true;
      
      const cohortWithoutQuotes = normalizedCohort.replace(/"/g, '');
      const inputWithoutQuotes = normalizedInput.replace(/"/g, '');
      
      if (cohortWithoutQuotes === inputWithoutQuotes) return true;
      if (cohortWithoutQuotes.startsWith(inputWithoutQuotes)) return true;
      
      return false;
    };

    let gematriaInput = inputTrimmed;
    if (gematriaInput.startsWith('מחזור ')) {
      gematriaInput = gematriaInput.substring('מחזור '.length);
    }
    
    const cleanGematriaInput = gematriaInput.replace(/['"]/g, '');

    // Separate exact matches from prefix matches for auto-complete
    const exactMatches: Cohort[] = [];
    const prefixMatches: Cohort[] = [];

    // Add cohorts that match by gematria, year, or text
    cohorts.forEach((cohort) => {
      const nameMatch = matchesGematria(cohort.name, inputTrimmed);
      const yearMatch = String(cohort.startYear).includes(inputTrimmed);
      const textMatch = cohort.name.toLowerCase().includes(inputTrimmed.toLowerCase());
      
      if (nameMatch || yearMatch || textMatch) {
        suggestions.push({
          value: cohort.name,
          label: cohort.name,
          id: cohort.id,
        });
      }

      // For auto-complete logic - check all cohorts, not just matching ones
      if (shouldAutoComplete && !inputTrimmed.match(/^\d{4}$/)) {
        const cohortGematria = normalizeGematria(cohort.name);
        const cohortGematriaNoQuotes = cohortGematria.replace(/"/g, '');
        
        // Check for exact match (with or without quotes)
        if (cohortGematria === cleanGematriaInput || 
            cohortGematriaNoQuotes === cleanGematriaInput) {
          if (!exactMatches.find(c => c.id === cohort.id)) {
            exactMatches.push(cohort);
          }
        }
        // Check for prefix match (but not if it's already an exact match)
        else if (cohortGematria.startsWith(cleanGematriaInput) || 
                 cohortGematriaNoQuotes.startsWith(cleanGematriaInput)) {
          if (!prefixMatches.find(c => c.id === cohort.id) && 
              !exactMatches.find(c => c.id === cohort.id)) {
            prefixMatches.push(cohort);
          }
        }
      }
    });

    // If input looks like a year (4 digits), find the matching cohort
    const yearMatch = /^\d{4}$/.test(inputTrimmed);
    if (yearMatch) {
      const year = parseInt(inputTrimmed, 10);
      if (year >= 1973 && year <= new Date().getFullYear() + 1) {
        const matchingCohort = cohorts.find(c => c.startYear === year);
        if (matchingCohort && !suggestions.find(s => s.id === matchingCohort.id)) {
          suggestions.unshift({
            value: matchingCohort.name,
            label: matchingCohort.name,
            id: matchingCohort.id,
          });
          
          // For year match, also add to exact matches for auto-complete
          if (shouldAutoComplete && !exactMatches.find(c => c.id === matchingCohort.id)) {
            exactMatches.push(matchingCohort);
          }
        }
      }
    }

    // Remove duplicates and limit to 5 suggestions
    const uniqueSuggestions = Array.from(
      new Map(suggestions.map(s => [s.id, s])).values()
    ).slice(0, 5);
    
    setCohortSuggestions(uniqueSuggestions);
    setShowCohortSuggestions(uniqueSuggestions.length > 0);

    // Auto-complete logic
    if (shouldAutoComplete && cleanGematriaInput.length >= 1) {
      const shouldAutoCompleteValue = 
        (exactMatches.length === 1 && prefixMatches.length === 0) ||
        (exactMatches.length === 0 && prefixMatches.length === 1);
      
      if (shouldAutoCompleteValue) {
        const matchedCohort = exactMatches.length > 0 ? exactMatches[0] : prefixMatches[0];
        // Use setTimeout to avoid state update conflicts
        setTimeout(() => {
          setCohortSearchValue(matchedCohort.name);
          setFilters(prev => ({ ...prev, cohortId: String(matchedCohort.id) }));
          setShowCohortSuggestions(false);
        }, 50);
      }
    }
  };

  // Calculate statistics
  const stats = {
    total: students.length,
    active: students.filter(s => s.status === 'ACTIVE').length,
    graduated: students.filter(s => s.status === 'GRADUATED').length,
    archived: students.filter(s => s.status === 'ARCHIVED').length,
  };

  const handleDeleteAll = async () => {
    if (!isDevelopment) {
      alert('פעולה זו זמינה רק בסביבת development');
      return;
    }

    const confirmed = window.confirm(
      '⚠️ אזהרה: פעולה זו תמחק את כל התלמידים מהמערכת!\n\n' +
      'פעולה זו בלתי הפיכה וזמינה רק בסביבת development.\n\n' +
      'האם אתה בטוח שברצונך להמשיך?'
    );

    if (!confirmed) {
      return;
    }

    // Double confirmation
    const doubleConfirmed = window.confirm(
      '⚠️ אישור סופי: אתה עומד למחוק את כל התלמידים!\n\n' +
      'לחץ OK רק אם אתה בטוח לחלוטין.'
    );

    if (!doubleConfirmed) {
      return;
    }

    try {
      await apiClient.delete('/students/clear-all');
      alert('כל התלמידים נמחקו בהצלחה');
      loadStudents();
    } catch (error: any) {
      console.error('Failed to delete all students:', error);
      const errorMessage = error.response?.data?.error || error.message || 'שגיאה לא ידועה';
      alert(`שגיאה במחיקת התלמידים: ${errorMessage}`);
    }
  };

  return (
    <PageWrapper>
      <div className="space-y-2.5 sm:space-y-4 lg:space-y-6 animate-in max-w-7xl mx-auto">
        {/* Header - Mobile optimized */}
        <div className="flex flex-col gap-2.5 sm:gap-4">
          <div className="space-y-1 sm:space-y-1.5">
            <div className="space-y-0.5 sm:space-y-1">
              <h1 className="text-lg sm:text-2xl lg:text-3xl font-bold tracking-tight text-black dark:text-white flex items-center gap-2 sm:gap-3">
                <div className="p-1.5 sm:p-2.5 rounded-xl sm:rounded-lg bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                  <GraduationCap className="h-3.5 w-3.5 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-gray-700 dark:text-gray-300" />
                </div>
                <span>ניהול תלמידים</span>
              </h1>
              <p className="text-[11px] sm:text-sm text-gray-500 dark:text-gray-400 mr-0 sm:mr-12 leading-tight">
                ניהול מקצועי של תלמידי בית הספר
              </p>
            </div>
          </div>
          {mode === 'edit' && (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-1.5 sm:gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsUploadModalOpen(true)}
                className="gap-1.5 text-xs sm:text-sm h-10 sm:h-9 w-full sm:w-auto justify-center font-medium"
              >
                <Upload className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">העלאת אקסל ממשו״ב</span>
                <span className="sm:hidden">העלאת אקסל</span>
              </Button>
              <Button
                size="sm"
                onClick={() => setIsAddModalOpen(true)}
                className="gap-1.5 text-xs sm:text-sm h-10 sm:h-9 w-full sm:w-auto justify-center font-semibold"
              >
                <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                הוסף תלמיד
              </Button>
              {isDevelopment && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleDeleteAll}
                className="gap-1.5 text-xs sm:text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/20 hover:border-red-200 dark:hover:border-red-900 h-10 sm:h-9 w-full sm:w-auto justify-center font-medium"
                title="זמין רק בסביבת development"
              >
                <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">מחק את כל התלמידים</span>
                <span className="sm:hidden">מחק הכל</span>
              </Button>
              )}
            </div>
          )}
        </div>

        {/* Statistics Cards - Mobile app style */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
          <Card className="border border-gray-200 dark:border-[#1F1F1F] hover:shadow-md active:scale-[0.97] transition-all duration-150 bg-white dark:bg-[#080808] rounded-2xl sm:rounded-lg">
            <CardContent className="p-3 sm:p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-[9px] sm:text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-0.5 sm:mb-2 truncate">
                    סה"כ תלמידים
                  </p>
                  <p className="text-xl sm:text-3xl font-bold text-black dark:text-white tracking-tight">
                    {stats.total}
                  </p>
                </div>
                <div className="p-1.5 sm:p-3 rounded-lg bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex-shrink-0">
                  <Users className="h-3.5 w-3.5 sm:h-5 sm:w-5 text-gray-700 dark:text-gray-300" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-gray-200 dark:border-[#1F1F1F] hover:shadow-md active:scale-[0.97] transition-all duration-150 bg-white dark:bg-[#080808] rounded-2xl sm:rounded-lg">
            <CardContent className="p-3 sm:p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-[9px] sm:text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-0.5 sm:mb-2 truncate">
                    תלמידים פעילים
                  </p>
                  <p className="text-xl sm:text-3xl font-bold text-black dark:text-white tracking-tight">
                    {stats.active}
                  </p>
                </div>
                <div className="p-1.5 sm:p-3 rounded-lg bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex-shrink-0">
                  <UserCheck className="h-3.5 w-3.5 sm:h-5 sm:w-5 text-gray-700 dark:text-gray-300" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-gray-200 dark:border-[#1F1F1F] hover:shadow-md active:scale-[0.97] transition-all duration-150 bg-white dark:bg-[#080808] rounded-2xl sm:rounded-lg">
            <CardContent className="p-3 sm:p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-[9px] sm:text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-0.5 sm:mb-2 truncate">
                    בוגרים
                  </p>
                  <p className="text-xl sm:text-3xl font-bold text-black dark:text-white tracking-tight">
                    {stats.graduated}
                  </p>
                </div>
                <div className="p-1.5 sm:p-3 rounded-lg bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex-shrink-0">
                  <TrendingUp className="h-3.5 w-3.5 sm:h-5 sm:w-5 text-gray-700 dark:text-gray-300" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-gray-200 dark:border-[#1F1F1F] hover:shadow-md active:scale-[0.97] transition-all duration-150 bg-white dark:bg-[#080808] rounded-2xl sm:rounded-lg">
            <CardContent className="p-3 sm:p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-[9px] sm:text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-0.5 sm:mb-2 truncate">
                    בארכיון
                  </p>
                  <p className="text-xl sm:text-3xl font-bold text-black dark:text-white tracking-tight">
                    {stats.archived}
                  </p>
                </div>
                <div className="p-1.5 sm:p-3 rounded-lg bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex-shrink-0">
                  <Archive className="h-3.5 w-3.5 sm:h-5 sm:w-5 text-gray-700 dark:text-gray-300" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

      {/* Tabs - Mobile optimized */}
      <Tabs defaultValue="students" className="w-full">
        <div className="border-b border-gray-200 dark:border-[#1F1F1F] overflow-x-auto -mx-3 sm:mx-0 px-3 sm:px-0 scrollbar-hide">
          <TabsList className="w-full justify-start bg-transparent h-auto p-0 gap-0 min-w-max sm:min-w-0">
            <TabsTrigger value="students" className="px-3 sm:px-4 py-2 sm:py-3 font-semibold text-xs sm:text-sm">תלמידים</TabsTrigger>
            <TabsTrigger value="tracks" className="px-3 sm:px-4 py-2 sm:py-3 font-semibold text-xs sm:text-sm">מגמות</TabsTrigger>
            <TabsTrigger value="cohorts" className="px-3 sm:px-4 py-2 sm:py-3 font-semibold text-xs sm:text-sm">מחזורים</TabsTrigger>
          </TabsList>
        </div>

        {/* Students Tab */}
        <TabsContent value="students" className="space-y-3 sm:space-y-6 mt-3 sm:mt-6">

          {/* Filters and Search - Mobile optimized */}
          <Card className="border border-gray-200 dark:border-[#1F1F1F] bg-white dark:bg-[#080808] rounded-2xl sm:rounded-lg shadow-sm sm:shadow-none">
            <CardHeader className="pb-2.5 sm:pb-4 border-b border-gray-200 dark:border-[#1F1F1F] px-3 sm:px-6 pt-3 sm:pt-6">
              <CardTitle className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-base font-bold">
                <Filter className="h-3 w-3 sm:h-4 sm:w-4 text-gray-600 dark:text-gray-400" />
                <span>חיפוש וסינון</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-3 sm:pt-6 px-3 sm:px-6 pb-3 sm:pb-6">
              <div className="space-y-3 sm:space-y-6">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-gray-400" />
                  <Input
                    placeholder="חפש לפי שם, שם משפחה או ת.ז..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pr-9 sm:pr-10 h-11 sm:h-11 text-sm sm:text-base rounded-xl sm:rounded-lg font-medium"
                  />
                </div>

                {/* Filters Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4 pt-1 sm:pt-2">
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
                  <div className="relative" ref={cohortInputRef}>
                    <Input
                      label="מחזור"
                      value={cohortSearchValue}
                      onChange={(e) => {
                        const value = e.target.value;
                        const currentValue = value; // Store current value for comparison
                        setCohortSearchValue(value);
                        
                        // Clear filter if input is empty
                        if (!value.trim()) {
                          setFilters({ ...filters, cohortId: '' });
                          setShowCohortSuggestions(false);
                          return;
                        }

                        // Clear previous timeout
                        if (cohortTimeoutRef.current) {
                          clearTimeout(cohortTimeoutRef.current);
                        }

                        // Generate suggestions with debounce
                        cohortTimeoutRef.current = setTimeout(() => {
                          generateCohortSuggestions(currentValue, false);
                        }, 200);
                      }}
                      onFocus={() => {
                        if (cohortSearchValue.trim()) {
                          generateCohortSuggestions(cohortSearchValue, false);
                        }
                      }}
                      onBlur={(e) => {
                        // Delay hiding suggestions to allow clicking on them
                        const relatedTarget = (e.relatedTarget as HTMLElement);
                        if (!relatedTarget || !relatedTarget.closest('.cohort-suggestions')) {
                          setTimeout(() => {
                            setShowCohortSuggestions(false);
                            
                            // Smart auto-complete on blur
                            const trimmedValue = cohortSearchValue.trim();
                            if (trimmedValue.length > 0 && !trimmedValue.match(/^\d{4}$/)) {
                              const normalizeGematria = (str: string): string => {
                                return str.replace(/['"]/g, '').replace(/מחזור /g, '').trim();
                              };
                              
                              let gematriaInput = trimmedValue;
                              if (gematriaInput.startsWith('מחזור ')) {
                                gematriaInput = gematriaInput.substring('מחזור '.length);
                              }
                              const cleanGematriaInput = gematriaInput.replace(/['"]/g, '');
                              
                              const exactMatches: Cohort[] = [];
                              const prefixMatches: Cohort[] = [];
                              
                              cohorts.forEach(cohort => {
                                const cohortGematria = normalizeGematria(cohort.name);
                                const cohortGematriaNoQuotes = cohortGematria.replace(/"/g, '');
                                
                                if (cohortGematria === cleanGematriaInput || 
                                    cohortGematriaNoQuotes === cleanGematriaInput) {
                                  if (!exactMatches.find(c => c.id === cohort.id)) {
                                    exactMatches.push(cohort);
                                  }
                                }
                                else if (cohortGematria.startsWith(cleanGematriaInput) || 
                                         cohortGematriaNoQuotes.startsWith(cleanGematriaInput)) {
                                  if (!prefixMatches.find(c => c.id === cohort.id) && 
                                      !exactMatches.find(c => c.id === cohort.id)) {
                                    prefixMatches.push(cohort);
                                  }
                                }
                              });
                              
                              const shouldAutoComplete = 
                                (exactMatches.length === 1 && prefixMatches.length === 0) ||
                                (exactMatches.length === 0 && prefixMatches.length === 1);
                              
                              if (shouldAutoComplete && cleanGematriaInput.length >= 1) {
                                const matchedCohort = exactMatches.length > 0 ? exactMatches[0] : prefixMatches[0];
                                if (matchedCohort.name !== trimmedValue) {
                                  setCohortSearchValue(matchedCohort.name);
                                  setFilters(prev => ({ ...prev, cohortId: String(matchedCohort.id) }));
                                }
                              }
                            }
                          }, 200);
                        }
                      }}
                      placeholder="הזן מחזור (שנה או גימטריה)"
                    />
                    {showCohortSuggestions && cohortSuggestions.length > 0 && (
                      <div className="cohort-suggestions absolute z-50 w-full mt-1 bg-white dark:bg-[#080808] border border-gray-200 dark:border-[#1F1F1F] rounded-lg shadow-xl max-h-48 overflow-auto animate-in fade-in slide-in-from-top-2 duration-100">
                        {cohortSuggestions.map((suggestion) => (
                          <button
                            key={suggestion.id}
                            type="button"
                            className="w-full text-right px-4 py-2.5 hover:bg-gray-100 dark:hover:bg-[#1F1F1F] text-sm transition-colors duration-100 border-b border-gray-100 dark:border-[#1F1F1F] last:border-0"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setCohortSearchValue(suggestion.label);
                              setFilters({ ...filters, cohortId: String(suggestion.id) });
                              setShowCohortSuggestions(false);
                            }}
                            onMouseDown={(e) => e.preventDefault()}
                          >
                            <div className="font-medium text-black dark:text-white">{suggestion.label}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                              שנה: {cohorts.find(c => c.id === suggestion.id)?.startYear}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {hasActiveFilters && (
                  <div className="flex items-center gap-3 pt-3 border-t border-gray-200 dark:border-[#1F1F1F]">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearFilters}
                      className="gap-2 text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#0F0F0F]"
                    >
                      <Filter className="h-3.5 w-3.5" />
                      נקה סינון
                    </Button>
                    <span className="text-xs text-gray-500 dark:text-gray-500">
                      {Object.values(filters).filter(v => v !== '').length + (searchQuery ? 1 : 0)} מסננים פעילים
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Students Table */}
          <Card className="border border-gray-200 dark:border-[#1F1F1F] bg-white dark:bg-[#080808]">
            <CardHeader className="pb-4 border-b border-gray-200 dark:border-[#1F1F1F]">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-medium">
                  רשימת תלמידים
                </CardTitle>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {filteredStudents.length} תלמידים
                  </span>
                  {filteredStudents.length !== students.length && (
                    <span className="text-xs px-2 py-1 rounded bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-medium">
                      מסונן
                    </span>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-16">
                  <div className="flex flex-col items-center gap-3">
                    <div className="animate-spin rounded-full h-10 w-10 border-3 border-gray-300 dark:border-[#1F1F1F] border-t-blue-600 dark:border-t-blue-400"></div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">טוען תלמידים...</p>
                  </div>
                </div>
              ) : (
                <StudentsTable
                  students={filteredStudents}
                  onRefresh={loadStudents}
                  onEdit={handleEditStudent}
                  onView={handleViewStudent}
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
      <EditStudentModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedStudentId(null);
        }}
        onSuccess={handleEditSuccess}
        studentId={selectedStudentId}
        cohorts={cohorts}
      />
      <ViewStudentModal
        isOpen={isViewModalOpen}
        onClose={() => {
          setIsViewModalOpen(false);
          setSelectedStudentId(null);
        }}
        studentId={selectedStudentId}
      />
      </div>
    </PageWrapper>
  );
}
