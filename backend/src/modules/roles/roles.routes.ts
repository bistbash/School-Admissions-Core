import { Router } from 'express';
import { RolesController } from './roles.controller';
import { validateRequest, roleSchema } from '../../lib/validation';
import { authenticate } from '../../lib/auth';

const router = Router();
const rolesController = new RolesController();

// All routes require authentication
router.use(authenticate);

router.get('/', rolesController.getAll.bind(rolesController));
router.get('/:id', rolesController.getById.bind(rolesController));
router.post('/', validateRequest(roleSchema), rolesController.create.bind(rolesController));
router.put('/:id', validateRequest(roleSchema.partial()), rolesController.update.bind(rolesController));
router.delete('/:id', rolesController.delete.bind(rolesController));

export default router;
