import { Router } from 'express';
import { TracksController } from './tracks.controller';
import { authenticate } from '../../lib/auth/auth';
import { validateRequest } from '../../lib/utils/validation';
import { z } from 'zod';

const router = Router();
const tracksController = new TracksController();

// All routes require authentication
router.use(authenticate);

const createTrackSchema = z.object({
  name: z.string().min(1, 'שם מגמה הוא שדה חובה'),
  description: z.string().optional(),
});

const updateTrackSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
});

router.post('/', validateRequest(createTrackSchema), tracksController.create.bind(tracksController));
router.get('/', tracksController.getAll.bind(tracksController));
router.get('/:id', tracksController.getById.bind(tracksController));
router.put('/:id', validateRequest(updateTrackSchema), tracksController.update.bind(tracksController));
router.delete('/:id', tracksController.delete.bind(tracksController));

export default router;
