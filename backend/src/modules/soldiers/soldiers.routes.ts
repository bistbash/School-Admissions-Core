import { Router } from 'express';
import { SoldiersController } from './soldiers.controller';
import { validateRequest, soldierSchema } from '../../lib/validation';
import { authenticate } from '../../lib/auth';

const router = Router();
const soldiersController = new SoldiersController();

// All soldier routes require authentication
router.use(authenticate);

router.get('/', soldiersController.getAll.bind(soldiersController));
router.get('/:id', soldiersController.getById.bind(soldiersController));
router.post('/', validateRequest(soldierSchema), soldiersController.create.bind(soldiersController));
router.put('/:id', validateRequest(soldierSchema.partial()), soldiersController.update.bind(soldiersController));
router.delete('/:id', soldiersController.delete.bind(soldiersController));

export default router;
