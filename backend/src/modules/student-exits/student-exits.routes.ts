import { Router } from 'express';
import { StudentExitsController } from './student-exits.controller';
import { authenticate } from '../../lib/auth';
import { validateRequest } from '../../lib/validation';
import { z } from 'zod';

const router = Router();
const studentExitsController = new StudentExitsController();

// All routes require authentication
router.use(authenticate);

const createExitSchema = z.object({
  studentId: z.number().int().positive(),
  hasLeft: z.boolean().default(true),
  exitReason: z.string().optional(),
  exitCategory: z.string().optional(),
  receivingInstitution: z.string().optional(),
  wasDesiredExit: z.boolean().optional(),
  exitDate: z.string().datetime().optional(),
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
  exitDate: z.string().datetime().optional(),
  clearanceCompleted: z.boolean().optional(),
  passedSupply: z.boolean().optional(),
  expelledFromSchool: z.boolean().optional(),
});

router.post('/', validateRequest(createExitSchema), studentExitsController.create.bind(studentExitsController));
router.get('/', studentExitsController.getAll.bind(studentExitsController));
router.get('/student/:studentId', studentExitsController.getByStudentId.bind(studentExitsController));
router.put('/:studentId', validateRequest(updateExitSchema), studentExitsController.update.bind(studentExitsController));

export default router;

