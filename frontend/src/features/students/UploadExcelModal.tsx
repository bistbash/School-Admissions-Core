import React, { useState, useRef } from 'react';
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2, X, Download, FileCheck, Info, ChevronLeft } from 'lucide-react';
import { Modal } from '../../shared/ui/Modal';
import { Button } from '../../shared/ui/Button';
import { apiClient } from '../../shared/lib/api';
import { cn } from '../../shared/lib/utils';
import { ConflictsModal } from './ConflictsModal';

interface UploadExcelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface ConflictSuggestion {
  type: string;
  message: string;
  messageHebrew: string;
  suggestions?: string[];
}

interface RowConflict {
  row: number;
  idNumber?: string;
  firstName?: string;
  lastName?: string;
  conflicts: ConflictSuggestion[];
}

interface UploadResult {
  message: string;
  hasConflicts?: boolean;
  summary: {
    totalRows: number;
    created?: number;
    updated?: number;
    errors?: number;
    validRows?: number;
    conflictsCount?: number;
    conflictsResolved?: number;
  };
  errors?: Array<{ row: number; error: string }>;
  conflicts?: RowConflict[];
}

export function UploadExcelModal({ isOpen, onClose, onSuccess }: UploadExcelModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [error, setError] = useState<string>('');
  const [showConflictsModal, setShowConflictsModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // Validate file type
      const validTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
        'application/vnd.ms-excel', // .xls
        'text/csv', // .csv
      ];
      
      if (!validTypes.includes(selectedFile.type) && !selectedFile.name.match(/\.(xlsx|xls|csv)$/i)) {
        setError('קובץ לא תקין. יש להעלות קובץ Excel (.xlsx, .xls) או CSV בלבד.');
        setFile(null);
        return;
      }

      setFile(selectedFile);
      setError('');
      setUploadResult(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    try {
      setIsUploading(true);
      setError('');
      setUploadResult(null);

      const formData = new FormData();
      formData.append('file', file);

      const response = await apiClient.post<UploadResult>('/students/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setUploadResult(response.data);
      
      // If there are conflicts, show conflicts modal
      if (response.data.hasConflicts && response.data.conflicts && response.data.conflicts.length > 0) {
        setShowConflictsModal(true);
      }
      
      // If successful and no conflicts, refresh the students list after a short delay
      if (!response.data.hasConflicts && 
          (response.data.summary.errors === 0 || 
           (response.data.summary.created && response.data.summary.created > 0) || 
           (response.data.summary.updated && response.data.summary.updated > 0))) {
        setTimeout(() => {
          onSuccess();
        }, 2000);
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || 'שגיאה בהעלאת הקובץ';
      setError(errorMessage);
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    if (!isUploading) {
      setFile(null);
      setError('');
      setUploadResult(null);
      setShowConflictsModal(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      onClose();
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      const validTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel',
        'text/csv',
      ];
      
      if (!validTypes.includes(droppedFile.type) && !droppedFile.name.match(/\.(xlsx|xls|csv)$/i)) {
        setError('קובץ לא תקין. יש להעלות קובץ Excel (.xlsx, .xls) או CSV בלבד.');
        return;
      }

      setFile(droppedFile);
      setError('');
      setUploadResult(null);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const response = await apiClient.get('/students/upload/template', {
        responseType: 'blob',
      });
      
      // Create a blob URL and trigger download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'פורמט_העלאת_תלמידים.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || 'שגיאה בהורדת הפורמט';
      setError(errorMessage);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="העלאת קובץ אקסל ממשו״ב"
      size="lg"
    >
      <div className="space-y-6">
        {/* Instructions - Collapsible */}
        <details className="group">
          <summary className="cursor-pointer list-none">
            <div className="p-4 rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border border-blue-200 dark:border-blue-900 hover:border-blue-300 dark:hover:border-blue-800 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                    <Info className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                      הוראות העלאה
                    </h4>
                    <p className="text-xs text-blue-700 dark:text-blue-300 mt-0.5">
                      לחץ לפרטים נוספים
                    </p>
                  </div>
                </div>
                <ChevronLeft className="h-5 w-5 text-blue-600 dark:text-blue-400 transition-transform group-open:rotate-90" />
              </div>
            </div>
          </summary>
          <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 border-t-0 rounded-t-none mt-[-4px]">
            <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-3">
              הוראות העלאה:
            </h4>
            <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-2 list-disc list-inside mb-4">
              <li>העלה קובץ Excel (.xlsx, .xls) או CSV מהמערכת משו״ב</li>
              <li>הקובץ צריך להיות טבלה עם שורת כותרות (header) בשורה הראשונה</li>
              <li>המערכת תזהה תלמידים קיימים לפי ת.ז ותעדכן אותם, ותוסיף תלמידים חדשים</li>
            </ul>
            
            <div className="mt-4 pt-4 border-t border-blue-200 dark:border-blue-800">
              <h5 className="text-xs font-semibold text-blue-900 dark:text-blue-100 mb-2 uppercase tracking-wide">
                מבנה הקובץ - שמות עמודות נדרשות:
              </h5>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                <div className="space-y-1">
                  <p className="font-semibold text-blue-900 dark:text-blue-100">עמודות חובה:</p>
                  <ul className="text-blue-800 dark:text-blue-200 space-y-0.5 list-disc list-inside ml-2">
                    <li><code className="bg-blue-100 dark:bg-blue-900/50 px-1 rounded">מספר ת.ז</code> או <code className="bg-blue-100 dark:bg-blue-900/50 px-1 rounded">ת.ז</code></li>
                    <li><code className="bg-blue-100 dark:bg-blue-900/50 px-1 rounded">שם פרטי</code></li>
                    <li><code className="bg-blue-100 dark:bg-blue-900/50 px-1 rounded">שם משפחה</code></li>
                    <li><code className="bg-blue-100 dark:bg-blue-900/50 px-1 rounded">מין</code> (זכר/נקבה)</li>
                    <li><code className="bg-blue-100 dark:bg-blue-900/50 px-1 rounded">כיתה</code> (ט', י', י"א, י"ב, י"ג, י"ד)</li>
                  </ul>
                </div>
                <div className="space-y-1">
                  <p className="font-semibold text-blue-900 dark:text-blue-100">עמודות אופציונליות:</p>
                  <ul className="text-blue-800 dark:text-blue-200 space-y-0.5 list-disc list-inside ml-2">
                    <li><code className="bg-blue-100 dark:bg-blue-900/50 px-1 rounded">מקבילה</code></li>
                    <li><code className="bg-blue-100 dark:bg-blue-900/50 px-1 rounded">מגמה</code></li>
                    <li><code className="bg-blue-100 dark:bg-blue-900/50 px-1 rounded">מחזור</code></li>
                    <li><code className="bg-blue-100 dark:bg-blue-900/50 px-1 rounded">תאריך לידה</code></li>
                    <li><code className="bg-blue-100 dark:bg-blue-900/50 px-1 rounded">דואר אלקטרוני</code></li>
                    <li><code className="bg-blue-100 dark:bg-blue-900/50 px-1 rounded">יישוב</code>, <code className="bg-blue-100 dark:bg-blue-900/50 px-1 rounded">כתובת</code></li>
                    <li><code className="bg-blue-100 dark:bg-blue-900/50 px-1 rounded">טלפון</code>, <code className="bg-blue-100 dark:bg-blue-900/50 px-1 rounded">טלפון נייד</code></li>
                    <li>פרטי הורים (ת.ז הורים 1/2, שם פרטי/משפחה, טלפון, דואר אלקטרוני)</li>
                  </ul>
                </div>
              </div>
              <div className="mt-3 p-2 rounded bg-blue-100 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800">
                <p className="text-xs text-blue-900 dark:text-blue-100 mb-2">
                  <strong>חשוב:</strong> שורת הכותרות חייבת להיות בשורה הראשונה של הקובץ. שמות העמודות חייבים להתאים בדיוק (כולל רווחים וסימני פיסוק).
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadTemplate}
                  className="w-full mt-2"
                >
                  <Download className="h-4 w-4 mr-2" />
                  הורד פורמט Excel לדוגמה
                </Button>
              </div>
            </div>
          </div>
        </details>

        {/* File Upload Area - Enhanced */}
        <div
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          className={cn(
            'border-2 border-dashed rounded-xl p-12 text-center transition-all duration-200',
            file
              ? 'border-green-400 dark:border-green-700 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 shadow-lg shadow-green-100/50 dark:shadow-green-900/20'
              : 'border-gray-300 dark:border-gray-700 bg-gradient-to-br from-gray-50 to-slate-50 dark:from-[#0F0F0F] dark:to-[#1A1A1A] hover:border-blue-400 dark:hover:border-blue-600 hover:shadow-lg hover:shadow-blue-100/50 dark:hover:shadow-blue-900/20'
          )}
        >
          {file ? (
            <div className="space-y-4">
              <div className="relative">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="h-20 w-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <FileCheck className="h-10 w-10 text-green-600 dark:text-green-400" />
                  </div>
                </div>
                <FileSpreadsheet className="h-16 w-16 mx-auto text-green-600 dark:text-green-400 relative z-10" />
              </div>
              <div className="space-y-1">
                <p className="text-base font-semibold text-black dark:text-white">{file.name}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setFile(null);
                  if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                  }
                }}
                disabled={isUploading}
                className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
              >
                <X className="h-4 w-4 ml-1" />
                הסר קובץ
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="relative">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="h-20 w-20 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center animate-pulse">
                    <Upload className="h-10 w-10 text-blue-600 dark:text-blue-400" />
                  </div>
                </div>
                <Upload className="h-16 w-16 mx-auto text-gray-400 dark:text-gray-500 relative z-10" />
              </div>
              <div className="space-y-2">
                <p className="text-base font-medium text-gray-700 dark:text-gray-300">
                  גרור קובץ לכאן
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  או
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileSelect}
                className="hidden"
                id="excel-upload"
              />
              <Button
                variant="default"
                size="lg"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="px-6 py-3"
              >
                <FileSpreadsheet className="h-5 w-5 ml-2" />
                בחר קובץ Excel
              </Button>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                תמיכה בקבצי .xlsx, .xls, .csv
              </p>
            </div>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 flex items-start gap-2">
            <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-600 dark:text-red-400 flex-1">{error}</p>
          </div>
        )}

        {/* Upload Result */}
        {uploadResult && (
          <div className="space-y-3">
            <div className={cn(
              'p-4 rounded-lg border',
              uploadResult.hasConflicts
                ? 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900'
                : (uploadResult.summary.errors === 0 || !uploadResult.summary.errors)
                ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900'
                : 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900'
            )}>
              <div className="flex items-start gap-2">
                {uploadResult.hasConflicts ? (
                  <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                ) : (uploadResult.summary.errors === 0 || !uploadResult.summary.errors) ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <p className={cn(
                    'text-sm font-semibold mb-2',
                    uploadResult.hasConflicts
                      ? 'text-amber-900 dark:text-amber-100'
                      : (uploadResult.summary.errors === 0 || !uploadResult.summary.errors)
                      ? 'text-green-900 dark:text-green-100'
                      : 'text-amber-900 dark:text-amber-100'
                  )}>
                    {uploadResult.message}
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">סה״כ שורות: </span>
                      <span className="font-medium text-black dark:text-white">{uploadResult.summary.totalRows}</span>
                    </div>
                    {uploadResult.hasConflicts ? (
                      <>
                        <div>
                          <span className="text-gray-600 dark:text-gray-400">שורות תקינות: </span>
                          <span className="font-medium text-green-600 dark:text-green-400">{uploadResult.summary.validRows || 0}</span>
                        </div>
                        <div>
                          <span className="text-gray-600 dark:text-gray-400">קונפליקטים: </span>
                          <span className="font-medium text-red-600 dark:text-red-400">{uploadResult.summary.conflictsCount || 0}</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div>
                          <span className="text-gray-600 dark:text-gray-400">נוצרו: </span>
                          <span className="font-medium text-green-600 dark:text-green-400">{uploadResult.summary.created || 0}</span>
                        </div>
                        <div>
                          <span className="text-gray-600 dark:text-gray-400">עודכנו: </span>
                          <span className="font-medium text-blue-600 dark:text-blue-400">{uploadResult.summary.updated || 0}</span>
                        </div>
                        <div>
                          <span className="text-gray-600 dark:text-gray-400">שגיאות: </span>
                          <span className="font-medium text-red-600 dark:text-red-400">{uploadResult.summary.errors || 0}</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Conflicts Summary - Show button to open conflicts modal */}
            {uploadResult.hasConflicts && uploadResult.conflicts && uploadResult.conflicts.length > 0 && (
              <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-950/20 border-2 border-amber-200 dark:border-amber-800">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                    <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">
                      נמצאו {uploadResult.conflicts.length} קונפליקטים
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowConflictsModal(true)}
                    className="border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/30"
                  >
                    צפה בקונפליקטים
                  </Button>
                </div>
                <p className="text-xs text-amber-800 dark:text-amber-200">
                  אנא תקן את הקונפליקטים בקובץ Excel והעלה אותו שוב.
                </p>
              </div>
            )}

            {/* Errors List */}
            {!uploadResult.hasConflicts && uploadResult.errors && uploadResult.errors.length > 0 && (
              <div className="max-h-48 overflow-y-auto p-3 rounded-lg bg-gray-50 dark:bg-[#0F0F0F] border border-gray-200 dark:border-[#1F1F1F]">
                <p className="text-xs font-semibold text-black dark:text-white mb-2">פרטי שגיאות:</p>
                <div className="space-y-1">
                  {uploadResult.errors.slice(0, 10).map((err, idx) => (
                    <div key={idx} className="text-xs text-gray-600 dark:text-gray-400">
                      <span className="font-medium">שורה {err.row}:</span> {err.error}
                    </div>
                  ))}
                  {uploadResult.errors.length > 10 && (
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                      ועוד {uploadResult.errors.length - 10} שגיאות...
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-[#1F1F1F]">
          <div>
            {uploadResult?.hasConflicts && uploadResult.conflicts && uploadResult.conflicts.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowConflictsModal(true)}
                className="text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700"
              >
                <AlertCircle className="h-4 w-4 ml-2" />
                צפה בקונפליקטים ({uploadResult.conflicts.length})
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={isUploading}
            >
              סגור
            </Button>
            <Button
              onClick={handleUpload}
              disabled={!file || isUploading}
              isLoading={isUploading}
              className="min-w-[120px]"
            >
              {isUploading ? 'מעלה...' : 'העלה קובץ'}
            </Button>
          </div>
        </div>
      </div>

      {/* Conflicts Modal */}
      {uploadResult?.conflicts && uploadResult.conflicts.length > 0 && (
        <ConflictsModal
          isOpen={showConflictsModal}
          onClose={() => setShowConflictsModal(false)}
          conflicts={uploadResult.conflicts}
        />
      )}
    </Modal>
  );
}
