import { Request, Response, NextFunction } from 'express';
import { StudentsUploadService } from './students-upload.service';
import { auditFromRequest } from '../../lib/audit';
import { isRequestFromTrustedUser } from '../../lib/trustedUsers';
import multer from 'multer';

const studentsUploadService = new StudentsUploadService();

/**
 * Validate file signature (magic bytes) to prevent file type spoofing
 * SECURITY: Checks actual file content, not just MIME type
 * 
 * Excel file signatures:
 * - .xlsx: PK (ZIP archive) - starts with 50 4B 03 04 or 50 4B 05 06
 * - .xls: D0 CF 11 E0 A1 B1 1A E1 (OLE2 format)
 * - .csv: No specific signature, but should be text
 */
function validateFileSignature(buffer: Buffer, mimeType: string): boolean {
  if (buffer.length < 8) {
    return false; // File too small
  }

  // Get first bytes (magic bytes)
  const signature = buffer.slice(0, 8);

  // Excel .xlsx (Office Open XML) - ZIP archive format
  // Signature: PK (50 4B) followed by 03 04 or 05 06
  if (mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
    const isZip = signature[0] === 0x50 && signature[1] === 0x4B && 
                  (signature[2] === 0x03 || signature[2] === 0x05) &&
                  (signature[3] === 0x04 || signature[3] === 0x06);
    if (isZip) {
      // Additional check: .xlsx files should contain [Content_Types].xml in ZIP
      // For simplicity, we check if it's a valid ZIP structure
      return true;
    }
    return false;
  }

  // Excel .xls (OLE2 format)
  // Signature: D0 CF 11 E0 A1 B1 1A E1
  if (mimeType === 'application/vnd.ms-excel') {
    const oleSignature = Buffer.from([0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1]);
    return signature.slice(0, 8).equals(oleSignature);
  }

  // CSV files - check if it's text (all bytes should be printable ASCII or UTF-8)
  if (mimeType === 'text/csv') {
    // Check first 512 bytes for text content
    const textBuffer = buffer.slice(0, Math.min(512, buffer.length));
    for (let i = 0; i < textBuffer.length; i++) {
      const byte = textBuffer[i];
      // Allow printable ASCII (32-126), newline (10), carriage return (13), tab (9)
      // And UTF-8 continuation bytes (128-191) and start bytes (194-244)
      if (byte < 9 || (byte > 13 && byte < 32 && byte !== 127)) {
        // Check if it might be UTF-8
        if (byte < 128 || byte > 244) {
          return false; // Not valid text
        }
      }
    }
    return true;
  }

  return false; // Unknown MIME type
}

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

      // SECURITY: Validate file content by checking magic bytes (file signature)
      // This prevents file type spoofing attacks where MIME type is fake
      const fileBuffer = req.file.buffer;
      const isValidFileType = validateFileSignature(fileBuffer, req.file.mimetype);
      
      if (!isValidFileType) {
        await auditFromRequest(req, 'CREATE', 'STUDENT', {
          status: 'FAILURE',
          errorMessage: 'Invalid file type detected - file signature does not match MIME type',
          details: {
            action: 'EXCEL_UPLOAD_FAILED',
            fileName: req.file.originalname,
            mimeType: req.file.mimetype,
          },
        }).catch(console.error);
        
        return res.status(400).json({ 
          error: 'Invalid file type. File content does not match the declared file type.' 
        });
      }

      // Check file size limits based on user trust status and admin status
      const isTrusted = await isRequestFromTrustedUser(req);
      const user = (req as any).user;
      
      // Check if user is admin
      let isAdmin = false;
      if (user?.userId) {
        try {
          const { prisma } = await import('../../lib/prisma');
          const soldier = await prisma.soldier.findUnique({
            where: { id: user.userId },
          }) as any;
          isAdmin = soldier?.isAdmin ?? false;
        } catch (error) {
          // If check fails, continue with normal rate limiting
          console.error('Error checking admin status for file upload:', error);
        }
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

