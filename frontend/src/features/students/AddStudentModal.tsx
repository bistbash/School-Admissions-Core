import React, { useState } from 'react';
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

interface AddStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  cohorts: Cohort[];
}

export function AddStudentModal({ isOpen, onClose, onSuccess, cohorts }: AddStudentModalProps) {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [isLoadingTracks, setIsLoadingTracks] = useState(false);

  const [formData, setFormData] = useState({
    idNumber: '',
    firstName: '',
    lastName: '',
    gender: '' as 'MALE' | 'FEMALE' | '',
    grade: '',
    parallel: '',
    track: '',
    cohortId: '', // Legacy - kept for backward compatibility
    cohort: '', // New: can be year (2024) or Gematria ("מחזור נ"ב" or "נ"ב")
    studyStartDate: new Date().toISOString().split('T')[0],
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

  // Load tracks when modal opens
  React.useEffect(() => {
    if (isOpen) {
      loadTracks();
    }
  }, [isOpen]);

  // Cleanup timeouts on unmount
  React.useEffect(() => {
    return () => {
      if (cohortTimeoutRef.current) {
        clearTimeout(cohortTimeoutRef.current);
      }
    };
  }, []);

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

  // Store timeout ref for debouncing (only for suggestions)
  const cohortTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  const handleChange = (field: string, value: string) => {
    // Update form data
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }

    // Only generate cohort suggestions for autocomplete (NO automatic completion)
    if (field === 'cohort') {
      generateCohortSuggestions(value);
      
      // If user entered a year (4 digits), convert to cohort name
      if (/^\d{4}$/.test(value.trim())) {
        const year = parseInt(value.trim(), 10);
        const matchingCohort = cohorts.find(c => c.startYear === year);
        if (matchingCohort?.name) {
          // Update to cohort name and close suggestions
          setFormData((prev) => ({ ...prev, cohort: matchingCohort.name }));
          setShowCohortSuggestions(false);
        }
      }
    }
  };

  const generateCohortSuggestions = (input: string) => {
    if (!input || input.length === 0) {
      setCohortSuggestions([]);
      setShowCohortSuggestions(false);
      return;
    }

    const suggestions: Array<{ value: string; label: string }> = [];

    // Add cohorts from the list that match
    cohorts.forEach((cohort) => {
      const nameMatch = cohort.name.toLowerCase().includes(input.toLowerCase());
      const yearMatch = String(cohort.startYear).includes(input);
      if (nameMatch || yearMatch) {
        suggestions.push({
          value: cohort.name, // Always use cohort name (Gematria)
          label: cohort.name, // Show only cohort name, not year
        });
      }
    });

    // If input looks like a year (4 digits), find the matching cohort name
    const yearMatch = /^\d{4}$/.test(input);
    if (yearMatch) {
      const year = parseInt(input, 10);
      if (year >= 1973 && year <= new Date().getFullYear() + 1) {
        const matchingCohort = cohorts.find(c => c.startYear === year);
        if (matchingCohort) {
          suggestions.unshift({
            value: matchingCohort.name,
            label: matchingCohort.name,
          });
        }
      }
    }

    setCohortSuggestions(suggestions.slice(0, 5)); // Limit to 5 suggestions
    setShowCohortSuggestions(suggestions.length > 0);
  };

  const validate = async (): Promise<boolean> => {
    const newErrors: Record<string, string> = {};

    if (!formData.idNumber.trim()) newErrors.idNumber = 'מספר ת.ז הוא שדה חובה';
    if (!formData.firstName.trim()) newErrors.firstName = 'שם פרטי הוא שדה חובה';
    if (!formData.lastName.trim()) newErrors.lastName = 'שם משפחה הוא שדה חובה';
    if (!formData.gender) newErrors.gender = 'מין הוא שדה חובה';
    if (!formData.studyStartDate) newErrors.studyStartDate = 'תאריך התחלת לימודים הוא שדה חובה';

    // Validate cohort or grade (at least one required)
    if (!formData.cohort && !formData.cohortId && !formData.grade) {
      newErrors.cohort = 'נדרש לספק מחזור או כיתה (או שניהם)';
      newErrors.grade = 'נדרש לספק מחזור או כיתה (או שניהם)';
    }

    // Validate that cohort, grade, and study start date match
    // Academic year is from 01.09.x to 01.09.(x+1)
    if (formData.cohort && formData.grade) {
      try {
        const response = await apiClient.post('/cohorts/validate-match', {
          cohort: formData.cohort,
          grade: formData.grade,
        });
        if (!response.data?.matches) {
          newErrors.cohort = response.data?.error || 'המחזור והכיתה לא תואמים';
          newErrors.grade = response.data?.error || 'המחזור והכיתה לא תואמים';
        }
      } catch (error: any) {
        const errorMsg = error.response?.data?.error || 'שגיאה באימות המחזור והכיתה';
        newErrors.cohort = errorMsg;
        newErrors.grade = errorMsg;
      }
    }
    
    // Validate study start date matches cohort and grade
    // Academic year is from 01.09.x to 01.09.(x+1)
    // Study start date must be 01.09 of the cohort's start year
    if (formData.studyStartDate) {
      const startDate = new Date(formData.studyStartDate);
      if (isNaN(startDate.getTime())) {
        newErrors.studyStartDate = 'תאריך התחלת לימודים לא תקין';
      } else {
        const dateYear = startDate.getFullYear();
        const dateMonth = startDate.getMonth() + 1; // 1-12
        const dateDay = startDate.getDate();
        
        // Check if date is September 1st
        if (dateMonth !== 9 || dateDay !== 1) {
          newErrors.studyStartDate = 'תאריך התחלת לימודים חייב להיות 01.09 (1 בספטמבר)';
        } else {
          // Validate against cohort if provided
          if (formData.cohort) {
            try {
              const response = await apiClient.post('/cohorts/calculate-start-date', {
                cohort: formData.cohort,
              });
              if (response.data?.startYear) {
                const expectedYear = response.data.startYear;
                if (dateYear !== expectedYear) {
                  newErrors.studyStartDate = `תאריך התחלת לימודים צריך להיות 01.09.${expectedYear} לפי המחזור ${formData.cohort}`;
                }
              }
            } catch (error: any) {
              console.error('Error validating study start date:', error);
            }
          }
          
          // Validate against grade if provided (via cohort)
          if (formData.grade && !formData.cohort) {
            try {
              const response = await apiClient.post('/cohorts/calculate-cohort', {
                grade: formData.grade,
              });
              if (response.data?.cohort) {
                const startDateResponse = await apiClient.post('/cohorts/calculate-start-date', {
                  cohort: response.data.cohort,
                });
                if (startDateResponse.data?.startYear) {
                  const expectedYear = startDateResponse.data.startYear;
                  if (dateYear !== expectedYear) {
                    newErrors.studyStartDate = `תאריך התחלת לימודים צריך להיות 01.09.${expectedYear} לפי הכיתה ${formData.grade}`;
                  }
                }
              }
            } catch (error: any) {
              console.error('Error validating study start date from grade:', error);
            }
          }
          
          // If both cohort and grade provided, validate that they match and date is correct
          if (formData.cohort && formData.grade) {
            try {
              // First check if cohort and grade match
              const matchResponse = await apiClient.post('/cohorts/validate-match', {
                cohort: formData.cohort,
                grade: formData.grade,
              });
              
              if (!matchResponse.data?.matches) {
                newErrors.cohort = matchResponse.data?.error || 'המחזור והכיתה לא תואמים';
                newErrors.grade = matchResponse.data?.error || 'המחזור והכיתה לא תואמים';
              } else {
                // If they match, validate the date
                const cohortResponse = await apiClient.post('/cohorts/calculate-start-date', {
                  cohort: formData.cohort,
                });
                
                if (cohortResponse.data?.startYear) {
                  const expectedYear = cohortResponse.data.startYear;
                  if (dateYear !== expectedYear) {
                    newErrors.studyStartDate = `תאריך התחלת לימודים צריך להיות 01.09.${expectedYear} לפי המחזור ${formData.cohort} והכיתה ${formData.grade}`;
                  }
                }
              }
            } catch (error: any) {
              const errorMsg = error.response?.data?.error || 'שגיאה באימות המחזור, הכיתה ותאריך ההתחלה';
              newErrors.cohort = errorMsg;
              newErrors.grade = errorMsg;
              newErrors.studyStartDate = errorMsg;
            }
          }
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!(await validate())) return;

    try {
      setIsSubmitting(true);
      const payload: any = {
        idNumber: formData.idNumber.trim(),
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        gender: formData.gender,
        parallel: formData.parallel || undefined,
        track: formData.track || undefined,
        studyStartDate: new Date(formData.studyStartDate).toISOString(),
      };

      // Add cohort or grade (or both)
      if (formData.cohort) {
        // If it's a year (4 digits), convert to cohort name first
        let cohortValue = formData.cohort.trim();
        if (/^\d{4}$/.test(cohortValue)) {
          // It's a year - find the cohort name
          const year = parseInt(cohortValue, 10);
          const matchingCohort = cohorts.find(c => c.startYear === year);
          if (matchingCohort) {
            cohortValue = matchingCohort.name;
          }
        }
        // Send as string (cohort name) or number (if it's a valid year that wasn't found)
        payload.cohort = /^\d+$/.test(cohortValue) ? Number(cohortValue) : cohortValue;
      } else if (formData.cohortId) {
        // Legacy support
        payload.cohortId = Number(formData.cohortId);
      }

      if (formData.grade) {
        payload.grade = formData.grade;
      }

      // Add additional fields
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

      await apiClient.post('/students', payload);
      onSuccess();
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || error.message || 'שגיאה בהוספת התלמיד';
      setErrors({ submit: errorMessage });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setFormData({
        idNumber: '',
        firstName: '',
        lastName: '',
        gender: '',
        grade: '',
        parallel: '',
        track: '',
        cohortId: '',
        cohort: '',
        studyStartDate: new Date().toISOString().split('T')[0],
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
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="הוסף תלמיד חדש"
      size="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="w-full justify-start">
            <TabsTrigger value="basic">פרטים בסיסיים</TabsTrigger>
            <TabsTrigger value="academic">פרטים אקדמיים</TabsTrigger>
            <TabsTrigger value="address">פרטי מגורים</TabsTrigger>
            <TabsTrigger value="parents">פרטי הורים</TabsTrigger>
          </TabsList>

          {/* Basic Information Tab */}
          <TabsContent value="basic" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="מספר ת.ז *"
                value={formData.idNumber}
                onChange={(e) => handleChange('idNumber', e.target.value)}
                error={errors.idNumber}
                required
                placeholder="הזן מספר ת.ז"
              />
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
          <TabsContent value="academic" className="space-y-4">
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
                  { value: 'י"ג', label: 'י"ג' },
                  { value: 'י"ד', label: 'י"ד' },
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
                    // Delay hiding suggestions to allow clicking on them
                    // Check if focus is moving to suggestions dropdown
                    const relatedTarget = (e.relatedTarget as HTMLElement);
                    if (!relatedTarget || !relatedTarget.closest('.cohort-suggestions')) {
                      setTimeout(() => setShowCohortSuggestions(false), 200);
                    }
                  }}
                  error={errors.cohort || errors.cohortId}
                  placeholder="הזן מחזור (שנה או גימטריה)"
                />
                {showCohortSuggestions && cohortSuggestions.length > 0 && (
                  <div className="cohort-suggestions absolute z-10 w-full mt-1 bg-white dark:bg-[#080808] border border-gray-200 dark:border-[#1F1F1F] rounded-lg shadow-lg max-h-48 overflow-auto animate-in fade-in slide-in-from-top-2 duration-200">
                    {cohortSuggestions.map((suggestion, index) => (
                      <button
                        key={index}
                        type="button"
                        className="w-full text-right px-3 py-2 hover:bg-gray-100 dark:hover:bg-[#1F1F1F] text-sm transition-colors duration-150"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleChange('cohort', suggestion.value);
                          // Close popup immediately when selection is made
                          setShowCohortSuggestions(false);
                        }}
                        onMouseDown={(e) => e.preventDefault()} // Prevent input blur
                      >
                        {suggestion.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <Input
                label="תאריך התחלת לימודים *"
                type="date"
                value={formData.studyStartDate}
                onChange={(e) => handleChange('studyStartDate', e.target.value)}
                error={errors.studyStartDate}
                required
              />
            </div>
          </TabsContent>

          {/* Address Information Tab */}
          <TabsContent value="address" className="space-y-4">
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
          <TabsContent value="parents" className="space-y-6">
            {/* Parent 1 */}
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

            {/* Parent 2 */}
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
          <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900">
            <p className="text-sm text-red-600 dark:text-red-400">{errors.submit}</p>
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-4 border-t border-gray-200 dark:border-[#1F1F1F] mt-6">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            ביטול
          </Button>
          <Button
            type="submit"
            isLoading={isSubmitting}
            disabled={isSubmitting}
          >
            הוסף תלמיד
          </Button>
        </div>
      </form>
    </Modal>
  );
}
