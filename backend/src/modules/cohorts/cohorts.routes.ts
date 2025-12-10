import { Router } from 'express';
import { CohortsController } from './cohorts.controller';
import { authenticate } from '../../lib/auth/auth';
import { validateRequest } from '../../lib/utils/validation';
import { z } from 'zod';

const router = Router();
const cohortsController = new CohortsController();

// All routes require authentication
router.use(authenticate);

const createCohortSchema = z.object({
  name: z.string().min(1, 'Name is required').optional(), // Optional - will be auto-generated from startYear with correct Gematria
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

// Specific routes must come BEFORE parameterized routes
router.post('/calculate-grade', cohortsController.calculateGrade.bind(cohortsController));
router.post('/calculate-cohort', cohortsController.calculateCohort.bind(cohortsController));
router.post('/calculate-start-date', cohortsController.calculateStartDate.bind(cohortsController));
router.post('/calculate-from-start-date', cohortsController.calculateFromStartDate.bind(cohortsController));
router.post('/validate-match', cohortsController.validateMatch.bind(cohortsController));
router.post('/refresh', cohortsController.refresh.bind(cohortsController));
router.post('/', validateRequest(createCohortSchema), cohortsController.create.bind(cohortsController));
router.get('/', cohortsController.getAll.bind(cohortsController));
router.get('/:id', cohortsController.getById.bind(cohortsController));
router.put('/:id', validateRequest(updateCohortSchema), cohortsController.update.bind(cohortsController));

export default router;

