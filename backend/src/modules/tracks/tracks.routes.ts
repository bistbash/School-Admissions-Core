import { Router } from 'express';
import { TracksController } from './tracks.controller';
import { authenticate } from '../../lib/auth/auth';
import { validateRequest } from '../../lib/utils/validation';
import { requireResourcePagePermission } from '../../lib/permissions/page-permission-middleware';
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

// View permissions - requires 'tracks' page with 'view' permission
router.get('/', requireResourcePagePermission('tracks', 'read'), tracksController.getAll.bind(tracksController));
router.get('/:id', requireResourcePagePermission('tracks', 'read'), tracksController.getById.bind(tracksController));

// Edit permissions - requires 'tracks' page with 'edit' permission
router.post('/', requireResourcePagePermission('tracks', 'create'), validateRequest(createTrackSchema), tracksController.create.bind(tracksController));
router.put('/:id', requireResourcePagePermission('tracks', 'update'), validateRequest(updateTrackSchema), tracksController.update.bind(tracksController));
router.delete('/:id', requireResourcePagePermission('tracks', 'delete'), tracksController.delete.bind(tracksController));

export default router;
