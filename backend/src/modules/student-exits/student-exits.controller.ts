import { Request, Response, NextFunction } from 'express';
import { StudentExitsService, CreateExitData, UpdateExitData } from './student-exits.service';
import { z } from 'zod';

const studentExitsService = new StudentExitsService();

const createExitSchema = z.object({
  studentId: z.number().int().positive(),
  hasLeft: z.boolean().default(true),
  exitReason: z.string().optional(),
  exitCategory: z.string().optional(),
  receivingInstitution: z.string().optional(),
  wasDesiredExit: z.boolean().optional(),
  exitDate: z.string().datetime().optional().transform((val) => val ? new Date(val) : undefined),
  clearanceCompleted: z.boolean().optional(),
  passedSupply: z.boolean().optional(),
  expelledFromSchool: z.boolean().optional(),
});

const updateExitSchema = z.object({
  hasLeft: z.boolean().optional(),
  exitReason: z.string().optional(),
  exitCategory: z.string().optional(),
  receivingInstitution: z.string().optional(),
  wasDesiredExit: z.boolean().optional(),
  exitDate: z.string().datetime().optional().transform((val) => val ? new Date(val) : undefined),
  clearanceCompleted: z.boolean().optional(),
  passedSupply: z.boolean().optional(),
  expelledFromSchool: z.boolean().optional(),
});

export class StudentExitsController {
  /**
   * Create exit record
   * POST /api/student-exits
   */
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = createExitSchema.parse(req.body);
      const result = await studentExitsService.create(validated);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all exit records
   * GET /api/student-exits
   */
  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const filters = {
        exitCategory: req.query.exitCategory as string,
        wasDesiredExit: req.query.wasDesiredExit === 'true' ? true : req.query.wasDesiredExit === 'false' ? false : undefined,
        expelledFromSchool: req.query.expelledFromSchool === 'true' ? true : req.query.expelledFromSchool === 'false' ? false : undefined,
      };

      const exits = await studentExitsService.getAll(filters);
      res.json(exits);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get exit record by student ID
   * GET /api/student-exits/student/:studentId
   */
  async getByStudentId(req: Request, res: Response, next: NextFunction) {
    try {
      const studentId = Number(req.params.studentId);
      const exitRecord = await studentExitsService.getByStudentId(studentId);
      res.json(exitRecord);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update exit record
   * PUT /api/student-exits/:studentId
   */
  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const studentId = Number(req.params.studentId);
      const validated = updateExitSchema.parse(req.body);
      const result = await studentExitsService.update(studentId, validated);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
}

