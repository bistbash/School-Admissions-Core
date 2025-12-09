import { Request, Response, NextFunction } from 'express';
import { CohortsService, CreateCohortData, UpdateCohortData } from './cohorts.service';
import { z } from 'zod';
import { auditFromRequest } from '../../lib/audit/audit';

const cohortsService = new CohortsService();

const createCohortSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  startYear: z.number().int()
    .min(1973, 'שנת מחזור חייבת להיות 1973 או מאוחר יותר')
    .max(new Date().getFullYear() + 1, `שנת מחזור חייבת להיות ${new Date().getFullYear() + 1} או מוקדם יותר`),
  currentGrade: z.enum(['ט\'', 'י\'', 'י"א', 'י"ב', 'י"ג', 'י"ד']).nullable().optional(),
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
   * Query params:
   * - isActive: filter by active status (true/false)
   * - skipAutoCreate: skip automatic cohort creation/update (default: false)
   * - forceRefresh: force refresh of all cohorts (bypasses cache, default: false)
   */
  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const filters = {
        isActive: req.query.isActive === 'true' ? true : req.query.isActive === 'false' ? false : undefined,
        skipAutoCreate: req.query.skipAutoCreate === 'true',
        forceRefresh: req.query.forceRefresh === 'true',
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
   * Refresh all cohorts - update grades and create new cohorts
   * POST /api/cohorts/refresh
   * This manually triggers the update of all cohorts (happens automatically on GET /api/cohorts)
   * Useful for manual refresh or scheduled tasks
   * Forces a refresh (bypasses cache)
   */
  async refresh(req: Request, res: Response, next: NextFunction) {
    try {
      const apiKey = (req as any).apiKey;
      const user = (req as any).user;
      
      // Log the refresh operation
      await auditFromRequest(req, 'UPDATE', 'COHORT', {
        status: 'SUCCESS',
        priority: 'LOW',
        details: {
          action: 'REFRESH_ALL_COHORTS',
          apiKeyId: apiKey?.id,
          apiKeyName: apiKey?.name,
          userId: user?.userId,
        },
      }).catch((err) => {
        console.error('Failed to log REFRESH_ALL_COHORTS:', err);
      });

      // Force refresh - update all cohorts and create missing ones
      await cohortsService.ensureAllCohortsExist();
      
      // Get updated count (force refresh to get latest data)
      const allCohorts = await cohortsService.getAll({ skipAutoCreate: true, forceRefresh: true });
      
      res.json({
        message: 'כל המחזורים עודכנו בהצלחה',
        total: allCohorts.length,
        active: allCohorts.filter((c: any) => c.isActive).length,
        inactive: allCohorts.filter((c: any) => !c.isActive).length,
      });
    } catch (error) {
      next(error);
    }
  }
}

