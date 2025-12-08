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
  const [showAddTrack, setShowAddTrack] = useState(false);
  const [newTrackName, setNewTrackName] = useState('');
  const [isAddingTrack, setIsAddingTrack] = useState(false);

  const [formData, setFormData] = useState({
    idNumber: '',
    firstName: '',
    lastName: '',
    gender: '' as 'MALE' | 'FEMALE' | '',
    grade: '',
    parallel: '',
    track: '',
    cohortId: '',
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

  // Load tracks when modal opens
  React.useEffect(() => {
    if (isOpen) {
      loadTracks();
    }
  }, [isOpen]);

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

  const handleAddTrack = async () => {
    if (!newTrackName.trim()) return;

    try {
      setIsAddingTrack(true);
      await apiClient.post('/tracks', { name: newTrackName.trim() });
      await loadTracks();
      setFormData((prev) => ({ ...prev, track: newTrackName.trim() }));
      setNewTrackName('');
      setShowAddTrack(false);
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || error.message || 'שגיאה בהוספת המגמה';
      setErrors({ track: errorMessage });
    } finally {
      setIsAddingTrack(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.idNumber.trim()) newErrors.idNumber = 'מספר ת.ז הוא שדה חובה';
    if (!formData.firstName.trim()) newErrors.firstName = 'שם פרטי הוא שדה חובה';
    if (!formData.lastName.trim()) newErrors.lastName = 'שם משפחה הוא שדה חובה';
    if (!formData.gender) newErrors.gender = 'מין הוא שדה חובה';
    if (!formData.grade) newErrors.grade = 'כיתה היא שדה חובה';
    if (!formData.cohortId) newErrors.cohortId = 'מחזור הוא שדה חובה';
    if (!formData.studyStartDate) newErrors.studyStartDate = 'תאריך התחלת לימודים הוא שדה חובה';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    try {
      setIsSubmitting(true);
      const payload = {
        idNumber: formData.idNumber.trim(),
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        gender: formData.gender,
        grade: formData.grade,
        parallel: formData.parallel || undefined,
        track: formData.track || undefined,
        cohortId: Number(formData.cohortId),
        studyStartDate: new Date(formData.studyStartDate).toISOString(),
        dateOfBirth: formData.dateOfBirth ? new Date(formData.dateOfBirth).toISOString() : undefined,
        email: formData.email.trim() || undefined,
        aliyahDate: formData.aliyahDate ? new Date(formData.aliyahDate).toISOString() : undefined,
        locality: formData.locality.trim() || undefined,
        address: formData.address.trim() || undefined,
        address2: formData.address2.trim() || undefined,
        locality2: formData.locality2.trim() || undefined,
        phone: formData.phone.trim() || undefined,
        mobilePhone: formData.mobilePhone.trim() || undefined,
        parent1IdNumber: formData.parent1IdNumber.trim() || undefined,
        parent1FirstName: formData.parent1FirstName.trim() || undefined,
        parent1LastName: formData.parent1LastName.trim() || undefined,
        parent1Type: formData.parent1Type.trim() || undefined,
        parent1Mobile: formData.parent1Mobile.trim() || undefined,
        parent1Email: formData.parent1Email.trim() || undefined,
        parent2IdNumber: formData.parent2IdNumber.trim() || undefined,
        parent2FirstName: formData.parent2FirstName.trim() || undefined,
        parent2LastName: formData.parent2LastName.trim() || undefined,
        parent2Type: formData.parent2Type.trim() || undefined,
        parent2Mobile: formData.parent2Mobile.trim() || undefined,
        parent2Email: formData.parent2Email.trim() || undefined,
      };

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
                label="כיתה *"
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
                required
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
              <div className="space-y-2">
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
                {!showAddTrack ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowAddTrack(true)}
                    className="w-full text-xs"
                  >
                    + הוסף מגמה חדשה
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Input
                      placeholder="שם מגמה חדשה"
                      value={newTrackName}
                      onChange={(e) => setNewTrackName(e.target.value)}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleAddTrack}
                      isLoading={isAddingTrack}
                      disabled={!newTrackName.trim() || isAddingTrack}
                    >
                      הוסף
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setShowAddTrack(false);
                        setNewTrackName('');
                      }}
                    >
                      ביטול
                    </Button>
                  </div>
                )}
              </div>
              <Select
                label="מחזור *"
                value={formData.cohortId}
                onChange={(e) => handleChange('cohortId', e.target.value)}
                error={errors.cohortId}
                options={[
                  { value: '', label: 'בחר מחזור' },
                  ...cohorts.map((cohort) => ({
                    value: String(cohort.id),
                    label: cohort.name,
                  })),
                ]}
                required
              />
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
