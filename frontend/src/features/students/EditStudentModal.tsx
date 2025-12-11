import React, { useState, useEffect } from 'react';
import { Modal } from '../../shared/ui/Modal';
import { Button } from '../../shared/ui/Button';
import { Input } from '../../shared/ui/Input';
import { Select } from '../../shared/ui/Select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../shared/ui/Tabs';
import { apiClient } from '../../shared/lib/api';

interface Cohort {
  id: number;
  name: string;
  startYear: number;
  currentGrade: string;
  isActive: boolean;
}

interface Track {
  id: number;
  name: string;
  description?: string;
  isActive: boolean;
}

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

interface EditStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  studentId: number | null;
  cohorts: Cohort[];
}

export function EditStudentModal({ isOpen, onClose, onSuccess, studentId, cohorts }: EditStudentModalProps) {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [isLoadingTracks, setIsLoadingTracks] = useState(false);
  const [isLoadingStudent, setIsLoadingStudent] = useState(false);
  const [student, setStudent] = useState<Student | null>(null);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    gender: '' as 'MALE' | 'FEMALE' | '',
    grade: '',
    parallel: '',
    track: '',
    cohortId: '',
    cohort: '',
    status: '' as 'ACTIVE' | 'GRADUATED' | 'LEFT' | 'ARCHIVED' | '',
    dateOfBirth: '',
    email: '',
    aliyahDate: '',
    locality: '',
    address: '',
    address2: '',
    locality2: '',
    phone: '',
    mobilePhone: '',
    parent1IdNumber: '',
    parent1FirstName: '',
    parent1LastName: '',
    parent1Type: '',
    parent1Mobile: '',
    parent1Email: '',
    parent2IdNumber: '',
    parent2FirstName: '',
    parent2LastName: '',
    parent2Type: '',
    parent2Mobile: '',
    parent2Email: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cohortSuggestions, setCohortSuggestions] = useState<Array<{ value: string; label: string }>>([]);
  const [showCohortSuggestions, setShowCohortSuggestions] = useState(false);
  const cohortTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  // Load student data when modal opens
  useEffect(() => {
    if (isOpen && studentId) {
      loadStudent();
      loadTracks();
    }
  }, [isOpen, studentId]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (cohortTimeoutRef.current) {
        clearTimeout(cohortTimeoutRef.current);
      }
    };
  }, []);

  const loadStudent = async () => {
    if (!studentId) return;
    
    try {
      setIsLoadingStudent(true);
      const response = await apiClient.get(`/students/${studentId}`);
      const studentData = response.data;
      setStudent(studentData);

      // Get current class from enrollments
      const currentEnrollment = studentData.enrollments?.[0];
      const currentClass = currentEnrollment?.class;

      // Format dates for input fields
      const formatDateForInput = (date: string | Date | null | undefined): string => {
        if (!date) return '';
        const d = new Date(date);
        if (isNaN(d.getTime())) return '';
        return d.toISOString().split('T')[0];
      };

      setFormData({
        firstName: studentData.firstName || '',
        lastName: studentData.lastName || '',
        gender: studentData.gender || '',
        grade: currentClass?.grade || studentData.grade || '',
        parallel: currentClass?.parallel || studentData.parallel || '',
        track: currentClass?.track || studentData.track || '',
        cohortId: studentData.cohort?.id ? String(studentData.cohort.id) : '',
        cohort: studentData.cohort?.name || '',
        status: studentData.status || 'ACTIVE',
        dateOfBirth: formatDateForInput(studentData.dateOfBirth),
        email: studentData.email || '',
        aliyahDate: formatDateForInput(studentData.aliyahDate),
        locality: studentData.locality || '',
        address: studentData.address || '',
        address2: studentData.address2 || '',
        locality2: studentData.locality2 || '',
        phone: studentData.phone || '',
        mobilePhone: studentData.mobilePhone || '',
        parent1IdNumber: studentData.parent1IdNumber || '',
        parent1FirstName: studentData.parent1FirstName || '',
        parent1LastName: studentData.parent1LastName || '',
        parent1Type: studentData.parent1Type || '',
        parent1Mobile: studentData.parent1Mobile || '',
        parent1Email: studentData.parent1Email || '',
        parent2IdNumber: studentData.parent2IdNumber || '',
        parent2FirstName: studentData.parent2FirstName || '',
        parent2LastName: studentData.parent2LastName || '',
        parent2Type: studentData.parent2Type || '',
        parent2Mobile: studentData.parent2Mobile || '',
        parent2Email: studentData.parent2Email || '',
      });
    } catch (error) {
      console.error('Failed to load student:', error);
      setErrors({ submit: 'שגיאה בטעינת פרטי התלמיד' });
    } finally {
      setIsLoadingStudent(false);
    }
  };

  const loadTracks = async () => {
    try {
      setIsLoadingTracks(true);
      const response = await apiClient.get('/tracks?isActive=true');
      setTracks(response.data || []);
    } catch (error) {
      console.error('Failed to load tracks:', error);
    } finally {
      setIsLoadingTracks(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }

    if (field === 'cohort') {
      generateCohortSuggestions(value);
    }
  };

  const generateCohortSuggestions = (input: string) => {
    if (!input || input.length === 0) {
      setCohortSuggestions([]);
      setShowCohortSuggestions(false);
      return;
    }

    const suggestions: Array<{ value: string; label: string }> = [];
    const inputTrimmed = input.trim();

    const normalizeGematria = (str: string): string => {
      return str.replace(/['"]/g, '').replace(/מחזור /g, '').trim();
    };

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

    cohorts.forEach((cohort) => {
      const nameMatch = matchesGematria(cohort.name, inputTrimmed);
      const yearMatch = String(cohort.startYear).includes(inputTrimmed);
      const textMatch = cohort.name.toLowerCase().includes(inputTrimmed.toLowerCase());
      
      if (nameMatch || yearMatch || textMatch) {
        suggestions.push({
          value: cohort.name,
          label: cohort.name,
        });
      }
    });

    const yearMatch = /^\d{4}$/.test(inputTrimmed);
    if (yearMatch) {
      const year = parseInt(inputTrimmed, 10);
      if (year >= 1973 && year <= new Date().getFullYear() + 1) {
        const matchingCohort = cohorts.find(c => c.startYear === year);
        if (matchingCohort && !suggestions.find(s => s.value === matchingCohort.name)) {
          suggestions.unshift({
            value: matchingCohort.name,
            label: matchingCohort.name,
          });
        }
      }
    }

    if (cleanGematriaInput.length > 0) {
      const matchingByGematria = cohorts.filter(cohort => {
        const cohortGematria = normalizeGematria(cohort.name);
        const cohortGematriaNoQuotes = cohortGematria.replace(/"/g, '');
        if (cohortGematria === cleanGematriaInput || 
            cohortGematriaNoQuotes === cleanGematriaInput) {
          return true;
        }
        if (cohortGematria.startsWith(cleanGematriaInput) || 
            cohortGematriaNoQuotes.startsWith(cleanGematriaInput)) {
          return true;
        }
        return false;
      });
      
      matchingByGematria.forEach(cohort => {
        const cohortGematria = normalizeGematria(cohort.name);
        const cohortGematriaNoQuotes = cohortGematria.replace(/"/g, '');
        const isExactMatch = cohortGematria === cleanGematriaInput || 
                             cohortGematriaNoQuotes === cleanGematriaInput;
        if (isExactMatch && !suggestions.find(s => s.value === cohort.name)) {
          suggestions.unshift({
            value: cohort.name,
            label: cohort.name,
          });
        }
      });
    }

    const uniqueSuggestions = Array.from(
      new Map(suggestions.map(s => [s.value, s])).values()
    ).slice(0, 5);
    
    setCohortSuggestions(uniqueSuggestions);
    setShowCohortSuggestions(uniqueSuggestions.length > 0);
  };

  const validate = async (): Promise<boolean> => {
    const newErrors: Record<string, string> = {};

    if (!formData.firstName.trim()) newErrors.firstName = 'שם פרטי הוא שדה חובה';
    if (!formData.lastName.trim()) newErrors.lastName = 'שם משפחה הוא שדה חובה';
    if (!formData.gender) newErrors.gender = 'מין הוא שדה חובה';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!(await validate())) return;
    if (!studentId) return;

    try {
      setIsSubmitting(true);
      const payload: any = {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        gender: formData.gender,
        parallel: formData.parallel || undefined,
        track: formData.track || undefined,
        status: formData.status || undefined,
      };

      if (formData.grade) {
        payload.grade = formData.grade;
      }

      if (formData.cohort) {
        let cohortValue = formData.cohort.trim();
        if (/^\d{4}$/.test(cohortValue)) {
          const year = parseInt(cohortValue, 10);
          const matchingCohort = cohorts.find(c => c.startYear === year);
          if (matchingCohort) {
            cohortValue = matchingCohort.name;
          }
        }
        payload.cohort = /^\d+$/.test(cohortValue) ? Number(cohortValue) : cohortValue;
      } else if (formData.cohortId) {
        payload.cohortId = Number(formData.cohortId);
      }

      if (formData.dateOfBirth) {
        payload.dateOfBirth = new Date(formData.dateOfBirth).toISOString();
      }
      if (formData.email.trim()) {
        payload.email = formData.email.trim();
      }
      if (formData.aliyahDate) {
        payload.aliyahDate = new Date(formData.aliyahDate).toISOString();
      }
      if (formData.locality.trim()) {
        payload.locality = formData.locality.trim();
      }
      if (formData.address.trim()) {
        payload.address = formData.address.trim();
      }
      if (formData.address2.trim()) {
        payload.address2 = formData.address2.trim();
      }
      if (formData.locality2.trim()) {
        payload.locality2 = formData.locality2.trim();
      }
      if (formData.phone.trim()) {
        payload.phone = formData.phone.trim();
      }
      if (formData.mobilePhone.trim()) {
        payload.mobilePhone = formData.mobilePhone.trim();
      }
      if (formData.parent1IdNumber.trim()) {
        payload.parent1IdNumber = formData.parent1IdNumber.trim();
      }
      if (formData.parent1FirstName.trim()) {
        payload.parent1FirstName = formData.parent1FirstName.trim();
      }
      if (formData.parent1LastName.trim()) {
        payload.parent1LastName = formData.parent1LastName.trim();
      }
      if (formData.parent1Type.trim()) {
        payload.parent1Type = formData.parent1Type.trim();
      }
      if (formData.parent1Mobile.trim()) {
        payload.parent1Mobile = formData.parent1Mobile.trim();
      }
      if (formData.parent1Email.trim()) {
        payload.parent1Email = formData.parent1Email.trim();
      }
      if (formData.parent2IdNumber.trim()) {
        payload.parent2IdNumber = formData.parent2IdNumber.trim();
      }
      if (formData.parent2FirstName.trim()) {
        payload.parent2FirstName = formData.parent2FirstName.trim();
      }
      if (formData.parent2LastName.trim()) {
        payload.parent2LastName = formData.parent2LastName.trim();
      }
      if (formData.parent2Type.trim()) {
        payload.parent2Type = formData.parent2Type.trim();
      }
      if (formData.parent2Mobile.trim()) {
        payload.parent2Mobile = formData.parent2Mobile.trim();
      }
      if (formData.parent2Email.trim()) {
        payload.parent2Email = formData.parent2Email.trim();
      }

      await apiClient.put(`/students/${studentId}`, payload);
      onSuccess();
      onClose();
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || error.message || 'שגיאה בעדכון התלמיד';
      setErrors({ submit: errorMessage });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setFormData({
        firstName: '',
        lastName: '',
        gender: '',
        grade: '',
        parallel: '',
        track: '',
        cohortId: '',
        cohort: '',
        status: 'ACTIVE',
        dateOfBirth: '',
        email: '',
        aliyahDate: '',
        locality: '',
        address: '',
        address2: '',
        locality2: '',
        phone: '',
        mobilePhone: '',
        parent1IdNumber: '',
        parent1FirstName: '',
        parent1LastName: '',
        parent1Type: '',
        parent1Mobile: '',
        parent1Email: '',
        parent2IdNumber: '',
        parent2FirstName: '',
        parent2LastName: '',
        parent2Type: '',
        parent2Mobile: '',
        parent2Email: '',
      });
      setErrors({});
      setStudent(null);
      onClose();
    }
  };

  if (isLoadingStudent) {
    return (
      <Modal
        isOpen={isOpen}
        onClose={handleClose}
        title="ערוך תלמיד"
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

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="ערוך תלמיד"
      size="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <Tabs defaultValue="basic" className="w-full">
          <div className="border-b border-gray-200 dark:border-[#1F1F1F] mb-4">
            <TabsList className="w-full justify-start bg-transparent h-auto p-0 gap-0">
              <TabsTrigger value="basic" className="px-4 py-3 font-medium text-sm">פרטים בסיסיים</TabsTrigger>
              <TabsTrigger value="academic" className="px-4 py-3 font-medium text-sm">פרטים אקדמיים</TabsTrigger>
              <TabsTrigger value="address" className="px-4 py-3 font-medium text-sm">פרטי מגורים</TabsTrigger>
              <TabsTrigger value="parents" className="px-4 py-3 font-medium text-sm">פרטי הורים</TabsTrigger>
            </TabsList>
          </div>

          {/* Basic Information Tab */}
          <TabsContent value="basic" className="space-y-4 mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  מספר ת.ז
                </label>
                <p className="text-sm font-mono font-medium text-black dark:text-white bg-gray-50 dark:bg-[#0F0F0F] px-3 py-2 rounded border border-gray-200 dark:border-[#1F1F1F]">
                  {student?.idNumber || '-'}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">לא ניתן לשנות מספר ת.ז</p>
              </div>
              <Input
                label="שם פרטי *"
                value={formData.firstName}
                onChange={(e) => handleChange('firstName', e.target.value)}
                error={errors.firstName}
                required
                placeholder="הזן שם פרטי"
              />
              <Input
                label="שם משפחה *"
                value={formData.lastName}
                onChange={(e) => handleChange('lastName', e.target.value)}
                error={errors.lastName}
                required
                placeholder="הזן שם משפחה"
              />
              <Select
                label="מין *"
                value={formData.gender}
                onChange={(e) => handleChange('gender', e.target.value)}
                error={errors.gender}
                options={[
                  { value: '', label: 'בחר מין' },
                  { value: 'MALE', label: 'זכר' },
                  { value: 'FEMALE', label: 'נקבה' },
                ]}
                required
              />
              <Input
                label="תאריך לידה"
                type="date"
                value={formData.dateOfBirth}
                onChange={(e) => handleChange('dateOfBirth', e.target.value)}
                error={errors.dateOfBirth}
              />
              <Input
                label="דואר אלקטרוני"
                type="email"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                error={errors.email}
                placeholder="student@example.com"
              />
            </div>
          </TabsContent>

          {/* Academic Information Tab */}
          <TabsContent value="academic" className="space-y-4 mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select
                label="כיתה"
                value={formData.grade}
                onChange={(e) => handleChange('grade', e.target.value)}
                error={errors.grade}
                options={[
                  { value: '', label: 'בחר כיתה' },
                  { value: 'ט\'', label: 'ט\'' },
                  { value: 'י\'', label: 'י\'' },
                  { value: 'י"א', label: 'י"א' },
                  { value: 'י"ב', label: 'י"ב' },
                ]}
              />
              <Select
                label="מקבילה"
                value={formData.parallel}
                onChange={(e) => handleChange('parallel', e.target.value)}
                error={errors.parallel}
                options={[
                  { value: '', label: 'ללא מקבילה' },
                  { value: '1', label: '1' },
                  { value: '2', label: '2' },
                  { value: '3', label: '3' },
                  { value: '4', label: '4' },
                  { value: '5', label: '5' },
                  { value: '6', label: '6' },
                  { value: '7', label: '7' },
                  { value: '8', label: '8' },
                ]}
              />
              <Select
                label="מגמה"
                value={formData.track}
                onChange={(e) => handleChange('track', e.target.value)}
                error={errors.track}
                options={[
                  { value: '', label: 'ללא מגמה' },
                  ...tracks.map((track) => ({
                    value: track.name,
                    label: track.name,
                  })),
                ]}
                disabled={isLoadingTracks}
              />
              <div className="relative">
                <Input
                  label="מחזור"
                  value={formData.cohort}
                  onChange={(e) => handleChange('cohort', e.target.value)}
                  onFocus={() => {
                    if (formData.cohort) {
                      generateCohortSuggestions(formData.cohort);
                    }
                  }}
                  onBlur={(e) => {
                    const relatedTarget = (e.relatedTarget as HTMLElement);
                    if (!relatedTarget || !relatedTarget.closest('.cohort-suggestions')) {
                      setTimeout(() => {
                        setShowCohortSuggestions(false);
                      }, 200);
                    }
                  }}
                  error={errors.cohort || errors.cohortId}
                  placeholder="הזן מחזור (שנה או גימטריה)"
                />
                {showCohortSuggestions && cohortSuggestions.length > 0 && (
                  <div className="cohort-suggestions absolute z-10 w-full mt-1 bg-white dark:bg-[#080808] border border-gray-200 dark:border-[#1F1F1F] rounded-lg shadow-md max-h-48 overflow-auto animate-in fade-in slide-in-from-top-2 duration-100">
                    {cohortSuggestions.map((suggestion, index) => (
                      <button
                        key={index}
                        type="button"
                        className="w-full text-right px-3 py-2 hover:bg-gray-100 dark:hover:bg-[#1F1F1F] text-sm transition-colors duration-100 focus:bg-gray-100 dark:focus:bg-[#1F1F1F] focus:outline-none"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleChange('cohort', suggestion.value);
                          setShowCohortSuggestions(false);
                        }}
                        onMouseDown={(e) => e.preventDefault()}
                      >
                        {suggestion.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <Select
                label="סטטוס"
                value={formData.status}
                onChange={(e) => handleChange('status', e.target.value)}
                error={errors.status}
                options={[
                  { value: 'ACTIVE', label: 'פעיל' },
                  { value: 'GRADUATED', label: 'בוגר' },
                  { value: 'LEFT', label: 'עזב' },
                  { value: 'ARCHIVED', label: 'בארכיון' },
                ]}
              />
            </div>
          </TabsContent>

          {/* Address Information Tab */}
          <TabsContent value="address" className="space-y-4 mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="יישוב"
                value={formData.locality}
                onChange={(e) => handleChange('locality', e.target.value)}
                error={errors.locality}
                placeholder="הזן יישוב"
              />
              <Input
                label="כתובת"
                value={formData.address}
                onChange={(e) => handleChange('address', e.target.value)}
                error={errors.address}
                placeholder="הזן כתובת"
              />
              <Input
                label="יישוב נוסף (אופציונלי)"
                value={formData.locality2}
                onChange={(e) => handleChange('locality2', e.target.value)}
                error={errors.locality2}
                placeholder="יישוב נוסף אם רלוונטי"
              />
              <Input
                label="כתובת נוספת (אופציונלי)"
                value={formData.address2}
                onChange={(e) => handleChange('address2', e.target.value)}
                error={errors.address2}
                placeholder="כתובת נוספת אם רלוונטי"
              />
              <Input
                label="טלפון"
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                error={errors.phone}
                placeholder="02-1234567"
              />
              <Input
                label="טלפון נייד"
                value={formData.mobilePhone}
                onChange={(e) => handleChange('mobilePhone', e.target.value)}
                error={errors.mobilePhone}
                placeholder="050-1234567"
              />
              <Input
                label="תאריך עליה"
                type="date"
                value={formData.aliyahDate}
                onChange={(e) => handleChange('aliyahDate', e.target.value)}
                error={errors.aliyahDate}
              />
            </div>
          </TabsContent>

          {/* Parents Information Tab */}
          <TabsContent value="parents" className="space-y-6 mt-4">
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-black dark:text-white border-b border-gray-200 dark:border-[#1F1F1F] pb-2">
                פרטי הורה ראשון
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="ת.ז הורה"
                  value={formData.parent1IdNumber}
                  onChange={(e) => handleChange('parent1IdNumber', e.target.value)}
                  error={errors.parent1IdNumber}
                  placeholder="הזן ת.ז"
                />
                <Input
                  label="שם פרטי"
                  value={formData.parent1FirstName}
                  onChange={(e) => handleChange('parent1FirstName', e.target.value)}
                  error={errors.parent1FirstName}
                  placeholder="הזן שם פרטי"
                />
                <Input
                  label="שם משפחה"
                  value={formData.parent1LastName}
                  onChange={(e) => handleChange('parent1LastName', e.target.value)}
                  error={errors.parent1LastName}
                  placeholder="הזן שם משפחה"
                />
                <Select
                  label="סוג הורה"
                  value={formData.parent1Type}
                  onChange={(e) => handleChange('parent1Type', e.target.value)}
                  error={errors.parent1Type}
                  options={[
                    { value: '', label: 'בחר סוג הורה' },
                    { value: 'אב', label: 'אב' },
                    { value: 'אם', label: 'אם' },
                    { value: 'אפוטרופוס', label: 'אפוטרופוס' },
                    { value: 'אחר', label: 'אחר' },
                  ]}
                />
                <Input
                  label="טלפון נייד"
                  value={formData.parent1Mobile}
                  onChange={(e) => handleChange('parent1Mobile', e.target.value)}
                  error={errors.parent1Mobile}
                  placeholder="050-1234567"
                />
                <Input
                  label="דואר אלקטרוני"
                  type="email"
                  value={formData.parent1Email}
                  onChange={(e) => handleChange('parent1Email', e.target.value)}
                  error={errors.parent1Email}
                  placeholder="parent@example.com"
                />
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-black dark:text-white border-b border-gray-200 dark:border-[#1F1F1F] pb-2">
                פרטי הורה שני
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="ת.ז הורה"
                  value={formData.parent2IdNumber}
                  onChange={(e) => handleChange('parent2IdNumber', e.target.value)}
                  error={errors.parent2IdNumber}
                  placeholder="הזן ת.ז"
                />
                <Input
                  label="שם פרטי"
                  value={formData.parent2FirstName}
                  onChange={(e) => handleChange('parent2FirstName', e.target.value)}
                  error={errors.parent2FirstName}
                  placeholder="הזן שם פרטי"
                />
                <Input
                  label="שם משפחה"
                  value={formData.parent2LastName}
                  onChange={(e) => handleChange('parent2LastName', e.target.value)}
                  error={errors.parent2LastName}
                  placeholder="הזן שם משפחה"
                />
                <Select
                  label="סוג הורה"
                  value={formData.parent2Type}
                  onChange={(e) => handleChange('parent2Type', e.target.value)}
                  error={errors.parent2Type}
                  options={[
                    { value: '', label: 'בחר סוג הורה' },
                    { value: 'אב', label: 'אב' },
                    { value: 'אם', label: 'אם' },
                    { value: 'אפוטרופוס', label: 'אפוטרופוס' },
                    { value: 'אחר', label: 'אחר' },
                  ]}
                />
                <Input
                  label="טלפון נייד"
                  value={formData.parent2Mobile}
                  onChange={(e) => handleChange('parent2Mobile', e.target.value)}
                  error={errors.parent2Mobile}
                  placeholder="050-1234567"
                />
                <Input
                  label="דואר אלקטרוני"
                  type="email"
                  value={formData.parent2Email}
                  onChange={(e) => handleChange('parent2Email', e.target.value)}
                  error={errors.parent2Email}
                  placeholder="parent@example.com"
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {errors.submit && (
          <div className="p-3 rounded-lg bg-gray-50 dark:bg-[#0F0F0F] border border-gray-200 dark:border-[#1F1F1F]">
            <p className="text-sm text-gray-700 dark:text-gray-300">{errors.submit}</p>
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-4 border-t border-gray-200 dark:border-[#1F1F1F] mt-6">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isSubmitting}
            className="font-medium"
          >
            ביטול
          </Button>
          <Button
            type="submit"
            isLoading={isSubmitting}
            disabled={isSubmitting}
            className="bg-black dark:bg-white text-white dark:text-black hover:bg-gray-900 dark:hover:bg-gray-100 font-medium"
          >
            עדכן תלמיד
          </Button>
        </div>
      </form>
    </Modal>
  );
}
