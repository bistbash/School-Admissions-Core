import { Request, Response, NextFunction } from 'express';
import { CohortsService, CreateCohortData, UpdateCohortData, generateCohortName } from './cohorts.service';
import { z } from 'zod';
import { auditFromRequest } from '../../lib/audit/audit';

const cohortsService = new CohortsService();

const createCohortSchema = z.object({
  name: z.string().min(1, 'Name is required').optional(), // Optional - will be auto-generated from startYear
  startYear: z.number().int()
    .min(1973, 'שנת מחזור חייבת להיות 1973 או מאוחר יותר')
    .max(new Date().getFullYear() + 1, `שנת מחזור חייבת להיות ${new Date().getFullYear() + 1} או מוקדם יותר`),
  currentGrade: z.enum(['ט\'', 'י\'', 'י"א', 'י"ב']).nullable().optional(),
});

const updateCohortSchema = z.object({
  name: z.string().min(1).optional(),
  currentGrade: z.enum(['ט\'', 'י\'', 'י"א', 'י"ב']).optional(),
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
          error: `${generateCohortName(startYear)} לא פעיל כרגע (אין לו כיתה נוכחית)` 
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
   * Body: { cohort: string | number, grade: string, studyStartDate?: string (ISO date) }
   * If studyStartDate is provided, validates against the grade at that date
   * Otherwise, validates against the current grade
   */
  async validateMatch(req: Request, res: Response, next: NextFunction) {
    try {
      const { cohort, grade, studyStartDate } = req.body;
      if (!cohort || !grade) {
        return res.status(400).json({ 
          error: 'נדרש לספק מחזור וכיתה',
          matches: false 
        });
      }

      const { CohortsService, parseCohortInput, generateCohortName } = await import('./cohorts.service');
      const cohortsService = new CohortsService();
      
      const startYear = parseCohortInput(cohort);
      
      // If studyStartDate is provided, check the grade at that date
      // Otherwise, check the current grade
      let expectedGrade: string | null;
      let cohortStatusMessage: string | null = null;
      
      if (studyStartDate) {
        const targetDate = new Date(studyStartDate);
        if (isNaN(targetDate.getTime())) {
          return res.status(400).json({
            matches: false,
            error: 'תאריך התחלת לימודים לא תקין'
          });
        }
        
        // Check if the date is within the cohort's active period
        const cohortStartDate = new Date(startYear, 8, 1); // September 1st of start year
        const cohortEndDate = new Date(startYear + 3, 8, 1); // September 1st of start year + 3 (י"ב)
        
        if (targetDate < cohortStartDate) {
          const startDateStr = `${cohortStartDate.getDate().toString().padStart(2, '0')}.${(cohortStartDate.getMonth() + 1).toString().padStart(2, '0')}.${cohortStartDate.getFullYear()}`;
          const cohortName = generateCohortName(startYear);
          cohortStatusMessage = `${cohortName} טרם התחיל. המחזור יתחיל ב-${startDateStr}`;
        } else if (targetDate >= cohortEndDate) {
          const endDateStr = `${cohortEndDate.getDate().toString().padStart(2, '0')}.${(cohortEndDate.getMonth() + 1).toString().padStart(2, '0')}.${cohortEndDate.getFullYear()}`;
          const cohortName = generateCohortName(startYear);
          cohortStatusMessage = `${cohortName} הסתיים. המחזור הסתיים ב-${endDateStr}`;
        } else {
          expectedGrade = cohortsService.calculateGradeAtDate(startYear, targetDate);
        }
      } else {
        expectedGrade = cohortsService.calculateGradeFromCohort(startYear);
      }
      
      const matches = expectedGrade === grade;
      
      if (!matches) {
        if (cohortStatusMessage) {
          // If cohort is not active, show the specific message
          return res.status(400).json({
            matches: false,
            error: cohortStatusMessage
          });
        } else {
          // If cohort is active but grade doesn't match
          const dateContext = studyStartDate ? ` בתאריך ${studyStartDate}` : ' כרגע';
          const cohortName = generateCohortName(startYear);
          return res.status(400).json({
            matches: false,
            error: `המחזור והכיתה לא תואמים. ${cohortName}${dateContext} אמור להיות בכיתה ${expectedGrade || 'לא פעיל'}, אבל הוזן ${grade}`
          });
        }
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
   * Validate study start date based on cohort and grade
   * POST /api/cohorts/validate-start-date
   * Body: { cohort: string | number, grade: string, studyStartDate: string (ISO date) }
   * Returns: { valid: boolean, error?: string, minDate?: string, maxDate?: string }
   */
  async validateStartDate(req: Request, res: Response, next: NextFunction) {
    try {
      const { cohort, grade, studyStartDate } = req.body;
      
      if (!cohort || !grade || !studyStartDate) {
        return res.status(400).json({ 
          valid: false,
          error: 'נדרש לספק מחזור, כיתה ותאריך התחלת לימודים'
        });
      }

      const { parseCohortInput } = await import('./cohorts.service');
      const cohortStartYear = parseCohortInput(cohort);
      
      // Parse the study start date
      const startDate = new Date(studyStartDate);
      if (isNaN(startDate.getTime())) {
        return res.status(400).json({ 
          valid: false,
          error: 'תאריך התחלת לימודים לא תקין'
        });
      }

      // First, check if the date is within the cohort's active period
      // Cohorts are active from ט' (start year) to י"ב (start year + 3)
      const cohortStartDate = new Date(cohortStartYear, 8, 1); // September 1st of start year (ט')
      const cohortEndDate = new Date(cohortStartYear + 3, 8, 1); // September 1st of start year + 3 (י"ב)
      
      if (startDate < cohortStartDate) {
        const startDateStr = `${cohortStartDate.getDate().toString().padStart(2, '0')}.${(cohortStartDate.getMonth() + 1).toString().padStart(2, '0')}.${cohortStartDate.getFullYear()}`;
        const cohortName = generateCohortName(cohortStartYear);
        return res.json({
          valid: false,
          error: `תאריך התחלת הלימודים שנבחר קודם לתחילת המחזור. ${cohortName} יתחיל ב-${startDateStr}`,
          minDate: cohortStartDate.toISOString().split('T')[0],
          maxDate: cohortEndDate.toISOString().split('T')[0],
        });
      } else if (startDate >= cohortEndDate) {
        const endDateStr = `${cohortEndDate.getDate().toString().padStart(2, '0')}.${(cohortEndDate.getMonth() + 1).toString().padStart(2, '0')}.${cohortEndDate.getFullYear()}`;
        const cohortName = generateCohortName(cohortStartYear);
        return res.json({
          valid: false,
          error: `תאריך התחלת הלימודים שנבחר לאחר סיום המחזור. ${cohortName} הסתיים ב-${endDateStr}`,
          minDate: cohortStartDate.toISOString().split('T')[0],
          maxDate: cohortEndDate.toISOString().split('T')[0],
        });
      }

      // Grade to number mapping
      const gradeToNumber: Record<string, number> = {
        'ט\'': 9,
        'י\'': 10,
        'י"א': 11,
        'י"ב': 12,
      };

      const gradeNumber = gradeToNumber[grade];
      if (!gradeNumber) {
        return res.status(400).json({ 
          valid: false,
          error: `כיתה לא תקינה: "${grade}"`
        });
      }

      // Calculate the expected start date range
      // For cohort year X and grade ג':
      // - Grade ט' (9) → start date should be between Sept 1, X and Sept 1, X+1
      // - Grade י' (10) → start date should be between Sept 1, X+1 and Sept 1, X+2
      // - Grade י"א (11) → start date should be between Sept 1, X+2 and Sept 1, X+3
      // Formula: yearsToAdd = gradeNumber - 9
      const yearsToAdd = gradeNumber - 9;
      const minYear = cohortStartYear + yearsToAdd;
      const maxYear = cohortStartYear + yearsToAdd + 1;

      const minDate = new Date(minYear, 8, 1); // September 1st (month is 0-indexed)
      const maxDate = new Date(maxYear, 8, 1); // September 1st of next year

      // Check if date is within range (inclusive of minDate, exclusive of maxDate)
      if (startDate < minDate || startDate >= maxDate) {
        const minDateStr = `${minDate.getDate().toString().padStart(2, '0')}.${(minDate.getMonth() + 1).toString().padStart(2, '0')}.${minDate.getFullYear()}`;
        const maxDateStr = `${maxDate.getDate().toString().padStart(2, '0')}.${(maxDate.getMonth() + 1).toString().padStart(2, '0')}.${maxDate.getFullYear()}`;
        
        return res.json({
          valid: false,
          error: `תאריך התחלת לימודים חייב להיות בין ${minDateStr} ל-${maxDateStr} לפי ${generateCohortName(cohortStartYear)} והכיתה ${grade}`,
          minDate: minDate.toISOString().split('T')[0],
          maxDate: maxDate.toISOString().split('T')[0],
        });
      }

      res.json({ 
        valid: true,
        minDate: minDate.toISOString().split('T')[0],
        maxDate: maxDate.toISOString().split('T')[0],
      });
    } catch (error: any) {
      res.status(400).json({ 
        valid: false,
        error: error.message || 'שגיאה באימות תאריך התחלת הלימודים' 
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

