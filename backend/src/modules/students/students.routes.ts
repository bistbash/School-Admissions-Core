import { Router } from 'express';
import { StudentsController } from './students.controller';
import { StudentsUploadController } from './students-upload.controller';
import { authenticate } from '../../lib/auth';
import { requireAPIKey, strictRateLimiter } from '../../lib/security';
import { validateRequest } from '../../lib/validation';
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
// SECURITY: clear-all requires API key OR JWT authentication + strict rate limiting
// This allows both external API access (via API key) and authenticated frontend users (via JWT)
router.delete('/clear-all', strictRateLimiter, requireAPIKey, studentsController.deleteAll.bind(studentsController));
router.post('/upload', studentsUploadController.upload.bind(studentsUploadController));
router.post('/promote-all', studentsController.promoteAllCohorts.bind(studentsController));
router.post('/cohorts/:cohortId/promote', studentsController.promoteCohort.bind(studentsController));
router.post('/', validateRequest(createStudentSchema), studentsController.create.bind(studentsController));
router.get('/', studentsController.getAll.bind(studentsController));
router.get('/id-number/:idNumber', studentsController.getByIdNumber.bind(studentsController));
// Parameterized routes come last
router.get('/:id', studentsController.getById.bind(studentsController));
router.put('/:id', validateRequest(updateStudentSchema), studentsController.update.bind(studentsController));
router.delete('/:id', studentsController.delete.bind(studentsController));

export default router;

