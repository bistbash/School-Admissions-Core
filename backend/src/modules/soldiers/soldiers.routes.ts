import { Router } from 'express';
import { SoldiersController } from './soldiers.controller';

const router = Router();
const soldiersController = new SoldiersController();

router.get('/', soldiersController.getAll);
router.post('/', soldiersController.create);
router.put('/:id', soldiersController.update);
router.delete('/:id', soldiersController.delete);

export default router;
