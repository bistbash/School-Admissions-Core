import { Request, Response, NextFunction } from 'express';
import { StudentsUploadService } from './students-upload.service';
import { auditFromRequest } from '../../lib/audit';
import { isRequestFromTrustedUser } from '../../lib/trustedUsers';
import multer from 'multer';

const studentsUploadService = new StudentsUploadService();

// Configure multer for file upload
// Trusted users can upload up to 200MB, regular users limited to 10MB
// Admin users can upload even larger files (up to 500MB)
// We'll use 500MB as the limit and check file size in the controller
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB max (for admin/trusted users)
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

      // Check file size limits based on user trust status and admin status
      const isTrusted = await isRequestFromTrustedUser(req);
      const user = (req as any).user;
      
      // Check if user is admin
      let isAdmin = false;
      if (user?.userId) {
        const { prisma } = await import('../../lib/prisma');
        const soldier = await prisma.soldier.findUnique({
          where: { id: user.userId },
          select: { isAdmin: true },
        });
        isAdmin = soldier?.isAdmin || false;
      }
      
      // Determine max file size: Admin (500MB), Trusted (200MB), Regular (10MB)
      let maxFileSize = 10 * 1024 * 1024; // 10MB default
      if (isAdmin) {
        maxFileSize = 500 * 1024 * 1024; // 500MB for admin
      } else if (isTrusted) {
        maxFileSize = 200 * 1024 * 1024; // 200MB for trusted users
      }
      
      if (req.file.size > maxFileSize) {
        await auditFromRequest(req, 'CREATE', 'STUDENT', {
          status: 'FAILURE',
          errorMessage: `File size exceeds limit. Max size: ${maxFileSize / (1024 * 1024)}MB`,
          details: {
            action: 'EXCEL_UPLOAD_FAILED',
            fileName: req.file.originalname,
            fileSize: req.file.size,
            maxFileSize,
            isTrusted,
          },
        }).catch(console.error);
        
        return res.status(400).json({ 
          error: `File size exceeds limit. Maximum file size: ${maxFileSize / (1024 * 1024)}MB`,
          maxFileSize: maxFileSize,
          fileSize: req.file.size,
        });
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

        // Process data with batch processing for large files
        // Batch size: 50 rows at a time for better performance
        const batchSize = rows.length > 1000 ? 50 : 100; // Smaller batches for very large files
        const result = await studentsUploadService.processExcelData(rows, batchSize);

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

