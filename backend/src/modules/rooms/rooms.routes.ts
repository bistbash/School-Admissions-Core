import { Router } from 'express';
import { RoomsController } from './rooms.controller';
import { validateRequest, roomSchema } from '../../lib/validation';
import { authenticate } from '../../lib/auth';

const router = Router();
const roomsController = new RoomsController();

// All routes require authentication
router.use(authenticate);

router.get('/', roomsController.getAll.bind(roomsController));
router.get('/:id', roomsController.getById.bind(roomsController));
router.post('/', validateRequest(roomSchema), roomsController.create.bind(roomsController));
router.put('/:id', validateRequest(roomSchema.partial()), roomsController.update.bind(roomsController));
router.delete('/:id', roomsController.delete.bind(roomsController));

export default router;
