import { useState, useEffect } from 'react';
import apiClient from '../lib/api';

interface Cohort {
  id: number;
  name: string;
  startYear: number;
  currentGrade: string;
  isActive: boolean;
}

interface Student {
  id: number;
  idNumber: string;
  firstName: string;
  lastName: string;
  gender: string;
  grade: string;
  parallel?: string;
  track?: string;
  cohortId: number;
  status: string;
  cohort?: Cohort;
  exitRecord?: any;
  // Additional fields
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
}

export function StudentsPanel() {
  const [students, setStudents] = useState<Student[]>([]);
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [showStudentDetailsModal, setShowStudentDetailsModal] = useState(false);
  const [viewingStudent, setViewingStudent] = useState<Student | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadResult, setUploadResult] = useState<any>(null);
  const [formData, setFormData] = useState({
    idNumber: '',
    firstName: '',
    lastName: '',
    gender: 'MALE',
    grade: 'ט\'',
    parallel: '',
    track: '',
    cohortId: '',
  });

  const fetchStudents = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.get<Student[]>('/students');
      setStudents(response.data);
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'שגיאה בטעינת תלמידים');
    } finally {
      setLoading(false);
    }
  };

  const fetchCohorts = async () => {
    try {
      const response = await apiClient.get<Cohort[]>('/cohorts?isActive=true');
      setCohorts(response.data);
    } catch (err: any) {
      console.error('Error fetching cohorts:', err);
    }
  };

  useEffect(() => {
    fetchStudents();
    fetchCohorts();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError(null);
      const data = {
        ...formData,
        cohortId: Number(formData.cohortId),
        parallel: formData.parallel || undefined,
        track: formData.track || undefined,
      };

      await apiClient.post('/students', data);
      setShowCreateForm(false);
      setFormData({
        idNumber: '',
        firstName: '',
        lastName: '',
        gender: 'MALE',
        grade: 'ט\'',
        parallel: '',
        track: '',
        cohortId: '',
      });
      await fetchStudents();
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'שגיאה ביצירת תלמיד');
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) return;

    try {
      setError(null);
      const data = {
        ...formData,
        cohortId: formData.cohortId ? Number(formData.cohortId) : undefined,
        parallel: formData.parallel || undefined,
        track: formData.track || undefined,
      };

      await apiClient.put(`/students/${selectedStudent.id}`, data);
      setSelectedStudent(null);
      setFormData({
        idNumber: '',
        firstName: '',
        lastName: '',
        gender: 'MALE',
        grade: 'ט\'',
        parallel: '',
        track: '',
        cohortId: '',
      });
      await fetchStudents();
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'שגיאה בעדכון תלמיד');
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('האם אתה בטוח שברצונך למחוק תלמיד זה?')) {
      return;
    }

    try {
      setError(null);
      await apiClient.delete(`/students/${id}`);
      await fetchStudents();
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'שגיאה במחיקת תלמיד');
    }
  };

  const handleEdit = (student: Student) => {
    setSelectedStudent(student);
    setFormData({
      idNumber: student.idNumber,
      firstName: student.firstName,
      lastName: student.lastName,
      gender: student.gender,
      grade: student.grade,
      parallel: student.parallel || '',
      track: student.track || '',
      cohortId: String(student.cohortId),
    });
    setShowCreateForm(true);
  };

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) return;

    try {
      setError(null);
      setUploadResult(null);
      const formData = new FormData();
      formData.append('file', uploadFile);

      // axios will automatically set Content-Type with boundary for FormData
      const response = await apiClient.post('/students/upload', formData);

      setUploadResult(response.data);
      setUploadFile(null);
      await fetchStudents();
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'שגיאה בהעלאת קובץ');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-100 text-green-800';
      case 'GRADUATED':
        return 'bg-blue-100 text-blue-800';
      case 'LEFT':
        return 'bg-yellow-100 text-yellow-800';
      case 'ARCHIVED':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'פעיל';
      case 'GRADUATED':
        return 'סיים';
      case 'LEFT':
        return 'עזב';
      case 'ARCHIVED':
        return 'בארכיון';
      default:
        return status;
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">תלמידים</h2>
          <p className="text-gray-500 mt-1">ניהול תלמידי בית הספר</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowUploadModal(true)}
            className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors"
          >
            העלה Excel
          </button>
          <button
            onClick={() => {
              setShowCreateForm(true);
              setSelectedStudent(null);
              setFormData({
                idNumber: '',
                firstName: '',
                lastName: '',
                gender: 'MALE',
                grade: 'ט\'',
                parallel: '',
                track: '',
                cohortId: '',
              });
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            הוסף תלמיד
          </button>
          <button
            onClick={async () => {
              if (!window.confirm('האם אתה בטוח שברצונך לקדם את כל המחזורים? פעולה זו תקדם את כל התלמידים הפעילים לכיתה הבאה. תלמידים ב-י"ב יסומנו כסיימו לימודים.')) {
                return;
              }
              try {
                setError(null);
                const response = await apiClient.post('/students/promote-all');
                alert(`קידום שנתי הושלם בהצלחה!\nקודמו: ${response.data.promoted} תלמידים\nסיימו לימודים: ${response.data.graduated} תלמידים`);
                await fetchStudents();
              } catch (err: any) {
                setError(err?.response?.data?.error || err?.message || 'שגיאה בקידום שנתי');
              }
            }}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
          >
            קידום שנתי (01.09)
          </button>
          <button
            onClick={async () => {
              if (!window.confirm('⚠️ אזהרה: האם אתה בטוח שברצונך למחוק את כל התלמידים? פעולה זו לא ניתנת לביטול!')) {
                return;
              }
              if (!window.confirm('האם אתה באמת בטוח? כל התלמידים יימחקו לצמיתות!')) {
                return;
              }
              try {
                setError(null);
                console.log('Calling DELETE /students/clear-all');
                const response = await apiClient.delete('/students/clear-all');
                console.log('Response:', response.data);
                alert(`כל התלמידים נמחקו בהצלחה!\nנמחקו: ${response.data.deleted} תלמידים`);
                await fetchStudents();
              } catch (err: any) {
                console.error('Error deleting all students:', err);
                console.error('Error response:', err?.response?.data);
                setError(err?.response?.data?.error || err?.message || 'שגיאה במחיקת תלמידים');
              }
            }}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
          >
            מחק הכל (בדיקות)
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded">
          {error}
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" dir="rtl">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full m-4">
            <div className="p-6 border-b">
              <h3 className="text-xl font-bold text-gray-900">העלה קובץ Excel</h3>
              <p className="text-sm text-gray-500 mt-1">
                העלה קובץ Excel מהמשו"ב. הקובץ צריך לכלול את העמודות: ת.ז, שם פרטי, שם משפחה, מין, כיתה, מקבילה, מגמה, מחזור
              </p>
            </div>
            <form onSubmit={handleFileUpload} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  קובץ Excel
                </label>
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                  className="w-full border p-2 rounded"
                  required
                />
              </div>
              {uploadResult && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded">
                  <h4 className="font-semibold text-blue-900 mb-2">תוצאות העלאה:</h4>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>סה"כ שורות: {uploadResult.summary?.totalRows}</li>
                    <li>נוצרו: {uploadResult.summary?.created}</li>
                    <li>עודכנו: {uploadResult.summary?.updated}</li>
                    <li>שגיאות: {uploadResult.summary?.errors}</li>
                  </ul>
                  {uploadResult.errors && uploadResult.errors.length > 0 && (
                    <div className="mt-3">
                      <p className="font-semibold text-red-700">שגיאות:</p>
                      <ul className="text-xs text-red-600 space-y-1 mt-1">
                        {uploadResult.errors.map((err: any, idx: number) => (
                          <li key={idx}>שורה {err.row}: {err.error}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white p-2 rounded hover:bg-blue-700 transition-colors font-medium"
                  disabled={!uploadFile}
                >
                  העלה ועדכן
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowUploadModal(false);
                    setUploadFile(null);
                    setUploadResult(null);
                  }}
                  className="px-4 bg-gray-300 text-gray-700 p-2 rounded hover:bg-gray-400 transition-colors font-medium"
                >
                  ביטול
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create/Edit Form */}
      {showCreateForm && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">
            {selectedStudent ? 'ערוך תלמיד' : 'הוסף תלמיד חדש'}
          </h3>
          <form onSubmit={selectedStudent ? handleUpdate : handleCreate} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ת.ז *
                </label>
                <input
                  type="text"
                  value={formData.idNumber}
                  onChange={(e) => setFormData({ ...formData, idNumber: e.target.value })}
                  required={!selectedStudent}
                  disabled={!!selectedStudent}
                  className="w-full border p-2 rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  שם פרטי *
                </label>
                <input
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  required
                  className="w-full border p-2 rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  שם משפחה *
                </label>
                <input
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  required
                  className="w-full border p-2 rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  מין *
                </label>
                <select
                  value={formData.gender}
                  onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                  required
                  className="w-full border p-2 rounded"
                >
                  <option value="MALE">זכר</option>
                  <option value="FEMALE">נקבה</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  כיתה *
                </label>
                <select
                  value={formData.grade}
                  onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                  required
                  className="w-full border p-2 rounded"
                >
                  <option value="ט'">ט'</option>
                  <option value="י'">י'</option>
                  <option value='י"א'>י"א</option>
                  <option value='י"ב'>י"ב</option>
                  <option value='י"ג'>י"ג</option>
                  <option value='י"ד'>י"ד</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  מקבילה
                </label>
                <select
                  value={formData.parallel}
                  onChange={(e) => setFormData({ ...formData, parallel: e.target.value })}
                  className="w-full border p-2 rounded"
                >
                  <option value="">בחר מקבילה</option>
                  <option value="1">1</option>
                  <option value="2">2</option>
                  <option value="3">3</option>
                  <option value="4">4</option>
                  <option value="5">5</option>
                  <option value="6">6</option>
                  <option value="7">7</option>
                  <option value="8">8</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  מגמה
                </label>
                <input
                  type="text"
                  value={formData.track}
                  onChange={(e) => setFormData({ ...formData, track: e.target.value })}
                  className="w-full border p-2 rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  מחזור *
                </label>
                <select
                  value={formData.cohortId}
                  onChange={(e) => setFormData({ ...formData, cohortId: e.target.value })}
                  required
                  className="w-full border p-2 rounded"
                >
                  <option value="">בחר מחזור</option>
                  {cohorts.map((cohort) => (
                    <option key={cohort.id} value={cohort.id}>
                      {cohort.name} ({cohort.startYear})
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                className="flex-1 bg-blue-600 text-white p-2 rounded hover:bg-blue-700 transition-colors font-medium"
              >
                {selectedStudent ? 'עדכן' : 'צור'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCreateForm(false);
                  setSelectedStudent(null);
                  setFormData({
                    idNumber: '',
                    firstName: '',
                    lastName: '',
                    gender: 'MALE',
                    grade: 'ט\'',
                    parallel: '',
                    track: '',
                    cohortId: '',
                  });
                }}
                className="px-4 bg-gray-300 text-gray-700 p-2 rounded hover:bg-gray-400 transition-colors font-medium"
              >
                ביטול
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Students Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-3 border-b font-semibold text-gray-600">ת.ז</th>
                <th className="p-3 border-b font-semibold text-gray-600">שם פרטי</th>
                <th className="p-3 border-b font-semibold text-gray-600">שם משפחה</th>
                <th className="p-3 border-b font-semibold text-gray-600">מין</th>
                <th className="p-3 border-b font-semibold text-gray-600">כיתה</th>
                <th className="p-3 border-b font-semibold text-gray-600">מקבילה</th>
                <th className="p-3 border-b font-semibold text-gray-600">מגמה</th>
                <th className="p-3 border-b font-semibold text-gray-600">מחזור</th>
                <th className="p-3 border-b font-semibold text-gray-600">סטטוס</th>
                <th className="p-3 border-b font-semibold text-gray-600">פעולות</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={10} className="p-4 text-center text-gray-500">
                    טוען...
                  </td>
                </tr>
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-4 text-center text-gray-500">
                    אין תלמידים. הוסף תלמיד חדש או העלה קובץ Excel.
                  </td>
                </tr>
              ) : (
                students.map((student) => (
                  <tr 
                    key={student.id} 
                    className="border-b hover:bg-gray-50 cursor-pointer"
                    onClick={async () => {
                      // Fetch full student details
                      try {
                        const response = await apiClient.get<Student>(`/students/${student.id}`);
                        setViewingStudent(response.data);
                        setShowStudentDetailsModal(true);
                      } catch (err: any) {
                        setError(err?.response?.data?.error || err?.message || 'שגיאה בטעינת פרטי התלמיד');
                      }
                    }}
                  >
                    <td className="p-3 text-sm font-mono">{student.idNumber}</td>
                    <td className="p-3 text-sm">{student.firstName}</td>
                    <td className="p-3 text-sm">{student.lastName}</td>
                    <td className="p-3 text-sm">{student.gender === 'MALE' ? 'זכר' : 'נקבה'}</td>
                    <td className="p-3 text-sm">{student.grade}</td>
                    <td className="p-3 text-sm">{student.parallel || '-'}</td>
                    <td className="p-3 text-sm">{student.track || '-'}</td>
                    <td className="p-3 text-sm">{student.cohort?.name || '-'}</td>
                    <td className="p-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(student.status)}`}>
                        {getStatusLabel(student.status)}
                      </span>
                    </td>
                    <td className="p-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(student)}
                          className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
                        >
                          ערוך
                        </button>
                        <button
                          onClick={() => handleDelete(student.id)}
                          className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors"
                        >
                          מחק
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Student Details Modal */}
      {showStudentDetailsModal && viewingStudent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" dir="rtl">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full m-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex justify-between items-center">
              <div>
                <h3 className="text-2xl font-bold text-gray-900">
                  {viewingStudent.firstName} {viewingStudent.lastName}
                </h3>
                <p className="text-sm text-gray-500 mt-1">ת.ז: {viewingStudent.idNumber}</p>
              </div>
              <button
                onClick={() => {
                  setShowStudentDetailsModal(false);
                  setViewingStudent(null);
                }}
                className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
              >
                ×
              </button>
            </div>
            <div className="p-6 space-y-6">
              {/* Basic Information */}
              <div>
                <h4 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">מידע בסיסי</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">ת.ז</label>
                    <div className="p-2 bg-gray-50 rounded font-mono">{viewingStudent.idNumber}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">שם פרטי</label>
                    <div className="p-2 bg-gray-50 rounded">{viewingStudent.firstName}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">שם משפחה</label>
                    <div className="p-2 bg-gray-50 rounded">{viewingStudent.lastName}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">מין</label>
                    <div className="p-2 bg-gray-50 rounded">{viewingStudent.gender === 'MALE' ? 'זכר' : 'נקבה'}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">תאריך לידה</label>
                    <div className="p-2 bg-gray-50 rounded">
                      {viewingStudent.dateOfBirth ? new Date(viewingStudent.dateOfBirth).toLocaleDateString('he-IL') : '-'}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">כיתה</label>
                    <div className="p-2 bg-gray-50 rounded">{viewingStudent.grade}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">מקבילה</label>
                    <div className="p-2 bg-gray-50 rounded">{viewingStudent.parallel || '-'}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">מגמה</label>
                    <div className="p-2 bg-gray-50 rounded">{viewingStudent.track || '-'}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">מחזור</label>
                    <div className="p-2 bg-gray-50 rounded">{viewingStudent.cohort?.name || '-'}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">סטטוס</label>
                    <div className="p-2">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(viewingStudent.status)}`}>
                        {getStatusLabel(viewingStudent.status)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div>
                <h4 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">פרטי התקשרות</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">דואר אלקטרוני</label>
                    <div className="p-2 bg-gray-50 rounded">{viewingStudent.email || '-'}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">טלפון</label>
                    <div className="p-2 bg-gray-50 rounded">{viewingStudent.phone || '-'}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">טלפון נייד</label>
                    <div className="p-2 bg-gray-50 rounded">{viewingStudent.mobilePhone || '-'}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">תאריך עליה</label>
                    <div className="p-2 bg-gray-50 rounded">
                      {viewingStudent.aliyahDate ? new Date(viewingStudent.aliyahDate).toLocaleDateString('he-IL') : '-'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Address Information */}
              <div>
                <h4 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">כתובת</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">יישוב</label>
                    <div className="p-2 bg-gray-50 rounded">{viewingStudent.locality || '-'}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">כתובת</label>
                    <div className="p-2 bg-gray-50 rounded">{viewingStudent.address || '-'}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">יישוב 2</label>
                    <div className="p-2 bg-gray-50 rounded">{viewingStudent.locality2 || '-'}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">כתובת 2</label>
                    <div className="p-2 bg-gray-50 rounded">{viewingStudent.address2 || '-'}</div>
                  </div>
                </div>
              </div>

              {/* Parent 1 Information */}
              {(viewingStudent.parent1FirstName || viewingStudent.parent1LastName) && (
                <div>
                  <h4 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">הורה 1</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">ת.ז</label>
                      <div className="p-2 bg-gray-50 rounded font-mono">{viewingStudent.parent1IdNumber || '-'}</div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">שם פרטי</label>
                      <div className="p-2 bg-gray-50 rounded">{viewingStudent.parent1FirstName || '-'}</div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">שם משפחה</label>
                      <div className="p-2 bg-gray-50 rounded">{viewingStudent.parent1LastName || '-'}</div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">סוג</label>
                      <div className="p-2 bg-gray-50 rounded">{viewingStudent.parent1Type || '-'}</div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">טלפון נייד</label>
                      <div className="p-2 bg-gray-50 rounded">{viewingStudent.parent1Mobile || '-'}</div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">דואר אלקטרוני</label>
                      <div className="p-2 bg-gray-50 rounded">{viewingStudent.parent1Email || '-'}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Parent 2 Information */}
              {(viewingStudent.parent2FirstName || viewingStudent.parent2LastName) && (
                <div>
                  <h4 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">הורה 2</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">ת.ז</label>
                      <div className="p-2 bg-gray-50 rounded font-mono">{viewingStudent.parent2IdNumber || '-'}</div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">שם פרטי</label>
                      <div className="p-2 bg-gray-50 rounded">{viewingStudent.parent2FirstName || '-'}</div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">שם משפחה</label>
                      <div className="p-2 bg-gray-50 rounded">{viewingStudent.parent2LastName || '-'}</div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">סוג</label>
                      <div className="p-2 bg-gray-50 rounded">{viewingStudent.parent2Type || '-'}</div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">טלפון נייד</label>
                      <div className="p-2 bg-gray-50 rounded">{viewingStudent.parent2Mobile || '-'}</div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">דואר אלקטרוני</label>
                      <div className="p-2 bg-gray-50 rounded">{viewingStudent.parent2Email || '-'}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Exit Record */}
              {viewingStudent.exitRecord && (
                <div>
                  <h4 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">פרטי עזיבה</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">עזב</label>
                      <div className="p-2 bg-gray-50 rounded">{viewingStudent.exitRecord.hasLeft ? 'כן' : 'לא'}</div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">תאריך עזיבה</label>
                      <div className="p-2 bg-gray-50 rounded">
                        {viewingStudent.exitRecord.exitDate ? new Date(viewingStudent.exitRecord.exitDate).toLocaleDateString('he-IL') : '-'}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">סיבת עזיבה</label>
                      <div className="p-2 bg-gray-50 rounded">{viewingStudent.exitRecord.exitReason || '-'}</div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">קטגוריית עזיבה</label>
                      <div className="p-2 bg-gray-50 rounded">{viewingStudent.exitRecord.exitCategory || '-'}</div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">מוסד קולט</label>
                      <div className="p-2 bg-gray-50 rounded">{viewingStudent.exitRecord.receivingInstitution || '-'}</div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">עזיבה רצויה</label>
                      <div className="p-2 bg-gray-50 rounded">{viewingStudent.exitRecord.wasDesiredExit ? 'כן' : 'לא'}</div>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4 border-t">
                <button
                  onClick={() => {
                    setShowStudentDetailsModal(false);
                    setViewingStudent(null);
                  }}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 transition-colors"
                >
                  סגור
                </button>
                <button
                  onClick={() => {
                    setShowStudentDetailsModal(false);
                    handleEdit(viewingStudent);
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                >
                  ערוך
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

