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
  name: z.string().min(1, 'Name is required'),
  startYear: z.number().int()
    .min(1954, 'שנת מחזור חייבת להיות 1954 או מאוחר יותר')
    .max(new Date().getFullYear() + 1, `שנת מחזור חייבת להיות ${new Date().getFullYear() + 1} או מוקדם יותר`),
  currentGrade: z.enum(['ט\'', 'י\'', 'י"א', 'י"ב', 'י"ג', 'י"ד'], {
    errorMap: () => ({ message: 'Grade must be ט\', י\', י"א, י"ב, י"ג, or י"ד' }),
  }),
});

const updateCohortSchema = z.object({
  name: z.string().min(1).optional(),
  currentGrade: z.enum(['ט\'', 'י\'', 'י"א', 'י"ב', 'י"ג', 'י"ד']).optional(),
  isActive: z.boolean().optional(),
});

router.post('/', validateRequest(createCohortSchema), cohortsController.create.bind(cohortsController));
router.get('/', cohortsController.getAll.bind(cohortsController));
router.get('/:id', cohortsController.getById.bind(cohortsController));
router.put('/:id', validateRequest(updateCohortSchema), cohortsController.update.bind(cohortsController));
router.delete('/:id', cohortsController.delete.bind(cohortsController));

export default router;

