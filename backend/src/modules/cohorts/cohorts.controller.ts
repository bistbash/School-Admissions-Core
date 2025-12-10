import { Request, Response, NextFunction } from 'express';
import { CohortsService, CreateCohortData, UpdateCohortData } from './cohorts.service';
import { z } from 'zod';
import { auditFromRequest } from '../../lib/audit/audit';

const cohortsService = new CohortsService();

const createCohortSchema = z.object({
  name: z.string().min(1, 'Name is required').optional(), // Optional - will be auto-generated from startYear
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
   * 
   * Note: Cohorts are created lazily when needed (e.g., when assigning students).
   * Use POST /api/cohorts/refresh to manually refresh all cohorts.
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
   * Calculate grade from cohort input
   * POST /api/cohorts/calculate-grade
   * Body: { cohort: string | number }
   */
  async calculateGrade(req: Request, res: Response, next: NextFunction) {
    try {
      const { cohort } = req.body;
      if (!cohort) {
        return res.status(400).json({ error: 'נדרש לספק מחזור' });
      }

      const { CohortsService, parseCohortInput, generateCohortName } = await import('./cohorts.service');
      const cohortsService = new CohortsService();
      
      const startYear = parseCohortInput(cohort);
      const grade = cohortsService.calculateGradeFromCohort(startYear);
      
      if (!grade) {
        return res.status(400).json({ 
          error: `המחזור ${startYear} לא פעיל כרגע (אין לו כיתה נוכחית)` 
        });
      }

      res.json({ grade, startYear, cohortName: generateCohortName(startYear) });
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'שגיאה בחישוב הכיתה' });
    }
  }

  /**
   * Calculate cohort from grade
   * POST /api/cohorts/calculate-cohort
   * Body: { grade: string }
   */
  async calculateCohort(req: Request, res: Response, next: NextFunction) {
    try {
      const { grade } = req.body;
      if (!grade) {
        return res.status(400).json({ error: 'נדרש לספק כיתה' });
      }

      const { CohortsService, generateCohortName } = await import('./cohorts.service');
      const cohortsService = new CohortsService();
      
      const startYear = cohortsService.calculateCohortFromGrade(grade);
      const cohortName = generateCohortName(startYear);
      
      res.json({ 
        cohort: startYear, // Return as number for frontend
        cohortName,
        startYear 
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'שגיאה בחישוב המחזור' });
    }
  }

  /**
   * Calculate study start date from cohort
   * POST /api/cohorts/calculate-start-date
   * Body: { cohort: string | number }
   * Returns: { startDate: string (ISO), startYear: number }
   */
  async calculateStartDate(req: Request, res: Response, next: NextFunction) {
    try {
      const { cohort } = req.body;
      if (!cohort) {
        return res.status(400).json({ error: 'נדרש לספק מחזור' });
      }

      const { CohortsService, parseCohortInput } = await import('./cohorts.service');
      const startYear = parseCohortInput(cohort);
      
      // Study start date is always September 1st of the cohort start year
      const startDate = new Date(startYear, 8, 1); // Month is 0-indexed, so 8 = September
      
      res.json({ 
        startDate: startDate.toISOString().split('T')[0], // Return as YYYY-MM-DD
        startYear 
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'שגיאה בחישוב תאריך ההתחלה' });
    }
  }

  /**
   * Calculate cohort from study start date
   * POST /api/cohorts/calculate-from-start-date
   * Body: { startDate: string (ISO date) }
   * Returns: { cohort: number, cohortName: string, startYear: number, grade: string }
   */
  async calculateFromStartDate(req: Request, res: Response, next: NextFunction) {
    try {
      const { startDate } = req.body;
      if (!startDate) {
        return res.status(400).json({ error: 'נדרש לספק תאריך התחלת לימודים' });
      }

      const { CohortsService, generateCohortName } = await import('./cohorts.service');
      const cohortsService = new CohortsService();
      
      // Parse the date
      const date = new Date(startDate);
      if (isNaN(date.getTime())) {
        return res.status(400).json({ error: 'תאריך לא תקין' });
      }
      
      // Extract year from date
      const dateYear = date.getFullYear();
      const dateMonth = date.getMonth() + 1; // 1-12
      const dateDay = date.getDate();
      
      // If date is before September 1st, the cohort started the previous year
      // If date is on or after September 1st, the cohort started this year
      let startYear = dateYear;
      if (dateMonth < 9 || (dateMonth === 9 && dateDay < 1)) {
        startYear = dateYear - 1;
      }
      
      // Validate start year range
      const minYear = 1973;
      const maxYear = new Date().getFullYear() + 1;
      if (startYear < minYear || startYear > maxYear) {
        return res.status(400).json({ 
          error: `תאריך התחלת לימודים לא תקין. שנת מחזור חייבת להיות בין ${minYear} ל-${maxYear}` 
        });
      }
      
      const cohortName = generateCohortName(startYear);
      const grade = cohortsService.calculateGradeFromCohort(startYear);
      
      res.json({ 
        cohort: startYear,
        cohortName,
        startYear,
        grade: grade || null
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'שגיאה בחישוב המחזור מתאריך ההתחלה' });
    }
  }

  /**
   * Validate that cohort and grade match
   * POST /api/cohorts/validate-match
   * Body: { cohort: string | number, grade: string }
   */
  async validateMatch(req: Request, res: Response, next: NextFunction) {
    try {
      const { cohort, grade } = req.body;
      if (!cohort || !grade) {
        return res.status(400).json({ 
          error: 'נדרש לספק מחזור וכיתה',
          matches: false 
        });
      }

      const { CohortsService, parseCohortInput } = await import('./cohorts.service');
      const cohortsService = new CohortsService();
      
      const startYear = parseCohortInput(cohort);
      const expectedGrade = cohortsService.calculateGradeFromCohort(startYear);
      
      const matches = expectedGrade === grade;
      
      if (!matches) {
        return res.status(400).json({
          matches: false,
          error: `המחזור והכיתה לא תואמים. מחזור ${startYear} אמור להיות בכיתה ${expectedGrade || 'לא פעיל'}, אבל הוזן ${grade}`
        });
      }

      res.json({ matches: true });
    } catch (error: any) {
      res.status(400).json({ 
        matches: false,
        error: error.message || 'שגיאה באימות המחזור והכיתה' 
      });
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
      
      // Get updated count
      const allCohorts = await cohortsService.getAll();
      
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

