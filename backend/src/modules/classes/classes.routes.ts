import { Router } from 'express';
import { ClassesController } from './classes.controller';
import { validateRequest } from '../../lib/validation';
import { z } from 'zod';
import { authenticate } from '../../lib/auth';

const router = Router();
const classesController = new ClassesController();

// Validation schema
const classSchema = z.object({
  grade: z.string().min(1, 'Grade is required'),
  parallel: z.string().optional(),
  track: z.string().optional(),
  academicYear: z.number().int().positive('Academic year must be a positive integer'),
  name: z.string().optional(),
  isActive: z.boolean().optional(),
});

// All routes require authentication
router.use(authenticate);

router.get('/', classesController.getAll.bind(classesController));
router.get('/:id', classesController.getById.bind(classesController));
router.post('/', validateRequest(classSchema), classesController.create.bind(classesController));
router.put('/:id', validateRequest(classSchema.partial()), classesController.update.bind(classesController));
router.delete('/:id', classesController.delete.bind(classesController));

export default router;
