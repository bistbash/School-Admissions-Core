import { Request, Response, NextFunction } from 'express';
import { CohortsService, CreateCohortData, UpdateCohortData } from './cohorts.service';
import { z } from 'zod';

const cohortsService = new CohortsService();

const createCohortSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  startYear: z.number().int().min(2000).max(2100),
  currentGrade: z.enum(['ט\'', 'י\'', 'י"א', 'י"ב', 'י"ג', 'י"ד'], {
    errorMap: () => ({ message: 'Grade must be ט\', י\', י"א, י"ב, י"ג, or י"ד' }),
  }),
});

const updateCohortSchema = z.object({
  name: z.string().min(1).optional(),
  currentGrade: z.enum(['ט\'', 'י\'', 'י"א', 'י"ב', 'י"ג', 'י"ד']).optional(),
  isActive: z.boolean().optional(),
});

export class CohortsController {
  /**
   * Create a new cohort
   * POST /api/cohorts
   */
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = createCohortSchema.parse(req.body);
      const result = await cohortsService.create(validated);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all cohorts
   * GET /api/cohorts
   */
  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const filters = {
        isActive: req.query.isActive === 'true' ? true : req.query.isActive === 'false' ? false : undefined,
      };

      const cohorts = await cohortsService.getAll(filters);
      res.json(cohorts);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get cohort by ID
   * GET /api/cohorts/:id
   */
  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id);
      const cohort = await cohortsService.getById(id);
      res.json(cohort);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update cohort
   * PUT /api/cohorts/:id
   */
  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id);
      const validated = updateCohortSchema.parse(req.body);
      const result = await cohortsService.update(id, validated);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete cohort (soft delete)
   * DELETE /api/cohorts/:id
   */
  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id);
      const result = await cohortsService.delete(id);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
}

