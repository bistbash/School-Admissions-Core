import { Request, Response, NextFunction } from 'express';
import { StudentsService, CreateStudentData, UpdateStudentData } from './students.service';
import { auditFromRequest } from '../../lib/audit/audit';
import { z } from 'zod';

const studentsService = new StudentsService();

const createStudentSchema = z.object({
  idNumber: z.string().min(1, 'ID number is required'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  gender: z.enum(['MALE', 'FEMALE'], {
    errorMap: () => ({ message: 'Gender must be MALE or FEMALE' }),
  }),
  grade: z.enum(['ט\'', 'י\'', 'י"א', 'י"ב', 'י"ג', 'י"ד'], {
    errorMap: () => ({ message: 'Grade must be ט\', י\', י"א, י"ב, י"ג, or י"ד' }),
  }),
  parallel: z.enum(['1', '2', '3', '4', '5', '6', '7', '8']).optional(),
  track: z.string().optional(),
  cohortId: z.number().int().positive('Cohort ID must be a positive integer'),
  studyStartDate: z.string().datetime({ message: 'Study start date must be a valid ISO date string' })
    .or(z.date({ message: 'Study start date must be a valid date' })),
});

const updateStudentSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  gender: z.enum(['MALE', 'FEMALE']).optional(),
  grade: z.enum(['ט\'', 'י\'', 'י"א', 'י"ב', 'י"ג', 'י"ד']).optional(),
  parallel: z.enum(['1', '2', '3', '4', '5', '6', '7', '8']).optional(),
  track: z.string().optional(),
  cohortId: z.number().int().positive().optional(),
  status: z.enum(['ACTIVE', 'GRADUATED', 'LEFT', 'ARCHIVED']).optional(),
  academicYear: z.number().int().positive().optional(), // For class changes
});

export class StudentsController {
  /**
   * Create a new student
   * POST /api/students
   */
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = createStudentSchema.parse(req.body);
      const result = await studentsService.create(validated);
      
      if (!result) {
        throw new Error('Failed to create student');
      }
      
      // Log creation
      await auditFromRequest(req, 'CREATE', 'STUDENT', {
        status: 'SUCCESS',
        resourceId: result.id,
        details: {
          idNumber: validated.idNumber,
          firstName: validated.firstName,
          lastName: validated.lastName,
          grade: validated.grade,
        },
      }).catch(console.error);
      
      res.status(201).json(result);
    } catch (error) {
      // Log failed creation
      await auditFromRequest(req, 'CREATE', 'STUDENT', {
        status: 'FAILURE',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      }).catch(console.error);
      next(error);
    }
  }

  /**
   * Get all students
   * GET /api/students
   */
  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const filters = {
        status: req.query.status as string,
        grade: req.query.grade as string,
        cohortId: req.query.cohortId ? Number(req.query.cohortId) : undefined,
        gender: req.query.gender as string,
        academicYear: req.query.academicYear ? Number(req.query.academicYear) : undefined,
      };

      const students = await studentsService.getAll(filters);
      res.json(students);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get student by ID
   * GET /api/students/:id
   */
  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id);
      const student = await studentsService.getById(id);
      res.json(student);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get student by ID number
   * GET /api/students/id-number/:idNumber
   */
  async getByIdNumber(req: Request, res: Response, next: NextFunction) {
    try {
      const { idNumber } = req.params;
      const student = await studentsService.getByIdNumber(idNumber);
      res.json(student);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update student
   * PUT /api/students/:id
   */
  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id);
      const validated = updateStudentSchema.parse(req.body);
      const result = await studentsService.update(id, validated);
      
      // Log update
      await auditFromRequest(req, 'UPDATE', 'STUDENT', {
        status: 'SUCCESS',
        resourceId: id,
        details: {
          updatedFields: Object.keys(validated),
        },
      }).catch(console.error);
      
      res.json(result);
    } catch (error) {
      // Log failed update
      await auditFromRequest(req, 'UPDATE', 'STUDENT', {
        status: 'FAILURE',
        resourceId: Number(req.params.id),
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      }).catch(console.error);
      next(error);
    }
  }

  /**
   * Delete student (archive)
   * DELETE /api/students/:id
   */
  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id);
      if (isNaN(id) || id <= 0) {
        return res.status(400).json({ error: 'Invalid student ID' });
      }
      
      // Get student info before deletion for logging
      const student = await studentsService.getById(id);
      
      const result = await studentsService.delete(id);
      
      // Log deletion
      await auditFromRequest(req, 'DELETE', 'STUDENT', {
        status: 'SUCCESS',
        resourceId: id,
        details: {
          idNumber: student.idNumber,
          firstName: student.firstName,
          lastName: student.lastName,
          action: 'ARCHIVED',
        },
      }).catch(console.error);
      
      res.json(result);
    } catch (error) {
      // Log failed deletion
      await auditFromRequest(req, 'DELETE', 'STUDENT', {
        status: 'FAILURE',
        resourceId: Number(req.params.id),
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      }).catch(console.error);
      next(error);
    }
  }

  /**
   * Promote cohort to next grade
   * POST /api/students/cohorts/:cohortId/promote
   */
  async promoteCohort(req: Request, res: Response, next: NextFunction) {
    try {
      const cohortId = Number(req.params.cohortId);
      const academicYear = req.body.academicYear ? Number(req.body.academicYear) : undefined;
      const result = await studentsService.promoteCohort(cohortId, academicYear);
      res.json({
        message: 'Cohort promoted successfully',
        promoted: result.promoted,
        graduated: result.graduated,
        total: result.promoted + result.graduated,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Promote all active cohorts to next grade (annual promotion on 01.09)
   * POST /api/students/promote-all
   */
  async promoteAllCohorts(req: Request, res: Response, next: NextFunction) {
    try {
      // Log promotion attempt
      await auditFromRequest(req, 'UPDATE', 'STUDENT', {
        status: 'SUCCESS',
        details: {
          action: 'ANNUAL_PROMOTION_STARTED',
        },
      }).catch(console.error);
      
      const academicYear = req.body.academicYear ? Number(req.body.academicYear) : undefined;
      const result = await studentsService.promoteAllCohorts(academicYear);
      
      // Log successful promotion
      await auditFromRequest(req, 'UPDATE', 'STUDENT', {
        status: 'SUCCESS',
        details: {
          action: 'ANNUAL_PROMOTION_COMPLETED',
          promoted: result.promoted,
          graduated: result.graduated,
          errors: result.errors.length,
        },
      }).catch(console.error);
      
      res.json({
        message: 'Annual promotion completed',
        promoted: result.promoted,
        graduated: result.graduated,
        skipped: result.skipped,
        errors: result.errors.length,
        errorDetails: result.errors,
      });
    } catch (error) {
      // Log failed promotion
      await auditFromRequest(req, 'UPDATE', 'STUDENT', {
        status: 'FAILURE',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        details: {
          action: 'ANNUAL_PROMOTION_FAILED',
        },
      }).catch(console.error);
      next(error);
    }
  }

  /**
   * Delete all students (for testing purposes)
   * DELETE /api/students/clear-all
   * WARNING: This permanently deletes all students
   * SECURITY: Requires API key authentication only (not JWT)
   */
  async deleteAll(req: Request, res: Response, next: NextFunction) {
    try {
      const apiKey = (req as any).apiKey;
      const user = (req as any).user;
      
      // Log the operation attempt
      const { auditFromRequest } = await import('../../lib/audit');
      await auditFromRequest(req, 'DELETE', 'STUDENT', {
        status: 'SUCCESS',
        details: {
          action: 'DELETE_ALL_STUDENTS',
          apiKeyId: apiKey?.id,
          apiKeyName: apiKey?.name,
          userId: user?.userId,
          // Never log sensitive data
        },
      }).catch(console.error);

      const result = await studentsService.deleteAll();
      
      // Log successful deletion
      await auditFromRequest(req, 'DELETE', 'STUDENT', {
        status: 'SUCCESS',
        details: {
          action: 'DELETE_ALL_STUDENTS_COMPLETED',
          deletedCount: result.deleted,
          apiKeyId: apiKey?.id,
          apiKeyName: apiKey?.name,
          userId: user?.userId,
        },
      }).catch(console.error);

      res.json({
        message: 'All students deleted successfully',
        deleted: result.deleted,
      });
    } catch (error: any) {
      // Log failed deletion attempt
      const { auditFromRequest } = await import('../../lib/audit');
      await auditFromRequest(req, 'DELETE', 'STUDENT', {
        status: 'FAILURE',
        errorMessage: error.message || 'Unknown error',
        details: {
          action: 'DELETE_ALL_STUDENTS',
          apiKeyId: (req as any).apiKey?.id,
        },
      }).catch(console.error);
      
      next(error);
    }
  }
}

