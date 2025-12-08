import React, { useState, useRef } from 'react';
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2, X } from 'lucide-react';
import { Modal } from '../../shared/ui/Modal';
import { Button } from '../../shared/ui/Button';
import { apiClient } from '../../shared/lib/api';
import { cn } from '../../shared/lib/utils';

interface UploadExcelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface UploadResult {
  message: string;
  summary: {
    totalRows: number;
    created: number;
    updated: number;
    errors: number;
  };
  errors: Array<{ row: number; error: string }>;
}

export function UploadExcelModal({ isOpen, onClose, onSuccess }: UploadExcelModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [error, setError] = useState<string>('');
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
      
      // If successful, refresh the students list after a short delay
      if (response.data.summary.errors === 0 || response.data.summary.created > 0 || response.data.summary.updated > 0) {
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

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="העלאת קובץ אקסל ממשו״ב"
      size="lg"
    >
      <div className="space-y-6">
        {/* Instructions */}
        <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900">
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
              <p className="text-xs text-blue-900 dark:text-blue-100">
                <strong>חשוב:</strong> שורת הכותרות חייבת להיות בשורה הראשונה של הקובץ. שמות העמודות חייבים להתאים בדיוק (כולל רווחים וסימני פיסוק).
              </p>
            </div>
          </div>
        </div>

        {/* File Upload Area */}
        <div
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          className={cn(
            'border-2 border-dashed rounded-lg p-8 text-center transition-colors',
            file
              ? 'border-green-300 dark:border-green-800 bg-green-50 dark:bg-green-950/20'
              : 'border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-[#0F0F0F] hover:border-gray-400 dark:hover:border-gray-600'
          )}
        >
          {file ? (
            <div className="space-y-2">
              <FileSpreadsheet className="h-12 w-12 mx-auto text-green-600 dark:text-green-400" />
              <p className="text-sm font-medium text-black dark:text-white">{file.name}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </p>
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
              >
                הסר קובץ
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <Upload className="h-12 w-12 mx-auto text-gray-400 dark:text-gray-500" />
              <p className="text-sm text-gray-600 dark:text-gray-400">
                גרור קובץ לכאן או לחץ לבחירה
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileSelect}
                className="hidden"
                id="excel-upload"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
              >
                בחר קובץ
              </Button>
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
              uploadResult.summary.errors === 0
                ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900'
                : 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900'
            )}>
              <div className="flex items-start gap-2">
                {uploadResult.summary.errors === 0 ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <p className={cn(
                    'text-sm font-semibold mb-2',
                    uploadResult.summary.errors === 0
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
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">נוצרו: </span>
                      <span className="font-medium text-green-600 dark:text-green-400">{uploadResult.summary.created}</span>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">עודכנו: </span>
                      <span className="font-medium text-blue-600 dark:text-blue-400">{uploadResult.summary.updated}</span>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">שגיאות: </span>
                      <span className="font-medium text-red-600 dark:text-red-400">{uploadResult.summary.errors}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Errors List */}
            {uploadResult.errors.length > 0 && (
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
        <div className="flex items-center justify-end gap-2 pt-4 border-t border-gray-200 dark:border-[#1F1F1F]">
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
          >
            העלה קובץ
          </Button>
        </div>
      </div>
    </Modal>
  );
}
