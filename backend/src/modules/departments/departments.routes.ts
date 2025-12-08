import { Router } from 'express';
import { DepartmentsController } from './departments.controller';
import { validateRequest, departmentSchema } from '../../lib/utils/validation';
import { authenticate } from '../../lib/auth/auth';

const router = Router();
const departmentsController = new DepartmentsController();

// All routes require authentication
router.use(authenticate);

router.get('/', departmentsController.getAll.bind(departmentsController));
router.post('/', validateRequest(departmentSchema), departmentsController.create.bind(departmentsController));
// More specific routes must come before generic :id routes
router.get('/:id/commanders', departmentsController.getCommanders.bind(departmentsController));
router.get('/:id', departmentsController.getById.bind(departmentsController));
router.put('/:id', validateRequest(departmentSchema.partial()), departmentsController.update.bind(departmentsController));
router.delete('/:id', departmentsController.delete.bind(departmentsController));

export default router;
