import { Request, Response, NextFunction } from 'express';
import { StudentsUploadService } from './students-upload.service';
import { auditFromRequest } from '../../lib/audit';
import multer from 'multer';

const studentsUploadService = new StudentsUploadService();

// Configure multer for file upload
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'text/csv', // .csv
    ];

    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only Excel files (.xlsx, .xls) are allowed.'));
    }
  },
});

export class StudentsUploadController {
  /**
   * Upload Excel file and process students
   * POST /api/students/upload
   */
  async upload(req: Request, res: Response, next: NextFunction) {
    const uploadMiddleware = upload.single('file');

    uploadMiddleware(req, res, async (err) => {
      if (err) {
        return next(err);
      }

      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      try {
        // Log upload attempt
        await auditFromRequest(req, 'CREATE', 'STUDENT', {
          status: 'SUCCESS',
          details: {
            action: 'EXCEL_UPLOAD_STARTED',
            fileName: req.file.originalname,
            fileSize: req.file.size,
          },
        }).catch(console.error);
        
        // Parse Excel file
        const rows = await studentsUploadService.parseExcelFile(req.file.buffer);

        if (rows.length === 0) {
          await auditFromRequest(req, 'CREATE', 'STUDENT', {
            status: 'FAILURE',
            errorMessage: 'Excel file is empty or invalid',
          }).catch(console.error);
          return res.status(400).json({ error: 'Excel file is empty or invalid' });
        }

        // Process data
        const result = await studentsUploadService.processExcelData(rows);

        // Log successful upload
        await auditFromRequest(req, 'CREATE', 'STUDENT', {
          status: 'SUCCESS',
          details: {
            action: 'EXCEL_UPLOAD_COMPLETED',
            fileName: req.file.originalname,
            totalRows: rows.length,
            created: result.created,
            updated: result.updated,
            errors: result.errors.length,
          },
        }).catch(console.error);

        res.json({
          message: 'File processed successfully',
          summary: {
            totalRows: rows.length,
            created: result.created,
            updated: result.updated,
            errors: result.errors.length,
          },
          errors: result.errors,
        });
      } catch (error) {
        // Log failed upload
        await auditFromRequest(req, 'CREATE', 'STUDENT', {
          status: 'FAILURE',
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
          details: {
            action: 'EXCEL_UPLOAD_FAILED',
            fileName: req.file?.originalname,
          },
        }).catch(console.error);
        next(error);
      }
    });
  }
}

