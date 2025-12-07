import { Router } from 'express';
import { RoomsController } from './rooms.controller';

const router = Router();
const roomsController = new RoomsController();

router.get('/', roomsController.getAll);
router.post('/', roomsController.create);
router.delete('/:id', roomsController.delete);

export default router;
