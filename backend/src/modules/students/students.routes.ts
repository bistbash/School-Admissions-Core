import { Router } from 'express';
import { StudentsController } from './students.controller';
import { StudentsUploadController } from './students-upload.controller';
import { authenticate } from '../../lib/auth/auth';
import { requireAPIKey, strictRateLimiter, fileUploadRateLimiter, requireAdmin } from '../../lib/security/security';
import { requireResourcePagePermission } from '../../lib/permissions/page-permission-middleware';
import { validateRequest } from '../../lib/utils/validation';
import { z } from 'zod';

const router = Router();
const studentsController = new StudentsController();
const studentsUploadController = new StudentsUploadController();

// All routes require authentication
router.use(authenticate);

const createStudentSchema = z.object({
  idNumber: z.string().min(1, 'ID number is required'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  gender: z.enum(['MALE', 'FEMALE']),
  grade: z.enum(['ט\'', 'י\'', 'י"א', 'י"ב', 'י"ג', 'י"ד'], {
    errorMap: () => ({ message: 'Grade must be ט\', י\', י"א, י"ב, י"ג, or י"ד' }),
  }),
  parallel: z.enum(['1', '2', '3', '4', '5', '6', '7', '8']).optional(),
  track: z.string().optional(),
  cohortId: z.number().int().positive('Cohort ID must be a positive integer'),
  studyStartDate: z.string().datetime({ message: 'Study start date must be a valid ISO date string' })
    .or(z.date({ message: 'Study start date must be a valid date' })),
});

const updateStudentSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  gender: z.enum(['MALE', 'FEMALE']).optional(),
  grade: z.enum(['ט\'', 'י\'', 'י"א', 'י"ב', 'י"ג', 'י"ד']).optional(),
  parallel: z.enum(['1', '2', '3', '4', '5', '6', '7', '8']).optional(),
  track: z.string().optional(),
  cohortId: z.number().int().positive().optional(),
  status: z.enum(['ACTIVE', 'GRADUATED', 'LEFT', 'ARCHIVED']).optional(),
});

// Specific routes must come BEFORE parameterized routes (/:id)
// SECURITY: clear-all requires admin access (first registered user only)
router.delete('/clear-all', strictRateLimiter, requireAdmin, studentsController.deleteAll.bind(studentsController));
// File upload with special rate limiting (trusted users get higher limits)
// Requires 'students' page with 'edit' permission
router.post('/upload', requireResourcePagePermission('students', 'create'), fileUploadRateLimiter, studentsUploadController.upload.bind(studentsUploadController));
// Promotion endpoints - admin only (sensitive operations)
router.post('/promote-all', requireAdmin, studentsController.promoteAllCohorts.bind(studentsController));
router.post('/cohorts/:cohortId/promote', requireAdmin, studentsController.promoteCohort.bind(studentsController));

// View permissions - requires 'students' page with 'view' permission
router.get('/', requireResourcePagePermission('students', 'read'), studentsController.getAll.bind(studentsController));
router.get('/id-number/:idNumber', requireResourcePagePermission('students', 'read'), studentsController.getByIdNumber.bind(studentsController));
router.get('/:id', requireResourcePagePermission('students', 'read'), studentsController.getById.bind(studentsController));

// Edit permissions - requires 'students' page with 'edit' permission
router.post('/', requireResourcePagePermission('students', 'create'), validateRequest(createStudentSchema), studentsController.create.bind(studentsController));
router.put('/:id', requireResourcePagePermission('students', 'update'), validateRequest(updateStudentSchema), studentsController.update.bind(studentsController));
router.delete('/:id', requireResourcePagePermission('students', 'delete'), studentsController.delete.bind(studentsController));

export default router;

