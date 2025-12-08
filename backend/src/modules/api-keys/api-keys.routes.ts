import { Router } from 'express';
import { APIKeysController } from './api-keys.controller';
import { authenticate } from '../../lib/auth/auth';
import { validateRequest } from '../../lib/utils/validation';
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

router.post('/', validateRequest(createAPIKeySchema), apiKeysController.create.bind(apiKeysController));
router.get('/', apiKeysController.getUserKeys.bind(apiKeysController));
router.get('/all', apiKeysController.getAllKeys.bind(apiKeysController));
router.delete('/:id', apiKeysController.revoke.bind(apiKeysController));

export default router;

