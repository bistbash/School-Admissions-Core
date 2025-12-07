import { Router } from 'express';
import { RolesController } from './roles.controller';

const router = Router();
const rolesController = new RolesController();

router.get('/', rolesController.getAll);
router.post('/', rolesController.create);
router.delete('/:id', rolesController.delete);

export default router;
