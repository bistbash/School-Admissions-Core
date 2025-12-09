import { Router } from 'express';
import { APIKeysController } from './api-keys.controller';
import { authenticate } from '../../lib/auth/auth';
import { validateRequest } from '../../lib/utils/validation';
import { requireResourcePagePermission } from '../../lib/permissions/page-permission-middleware';
import { z } from 'zod';

const router = Router();
const apiKeysController = new APIKeysController();

// All API key routes require authentication
router.use(authenticate);

const createAPIKeySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  expiresAt: z.string().datetime().optional(),
  permissions: z.record(z.any()).optional(),
});

// Create API key requires 'api-keys' page with 'edit' permission
router.post('/', requireResourcePagePermission('api-keys', 'create'), validateRequest(createAPIKeySchema), apiKeysController.create.bind(apiKeysController));
router.get('/', apiKeysController.getUserKeys.bind(apiKeysController));
router.get('/all', apiKeysController.getAllKeys.bind(apiKeysController));
router.delete('/:id', apiKeysController.revoke.bind(apiKeysController));

export default router;

