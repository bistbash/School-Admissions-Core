import { Router } from 'express';
import { DepartmentsController } from './departments.controller';

const router = Router();
const departmentsController = new DepartmentsController();

router.get('/', departmentsController.getAll);
router.post('/', departmentsController.create);
router.get('/:id/commanders', departmentsController.getCommanders);
router.delete('/:id', departmentsController.delete);

export default router;
