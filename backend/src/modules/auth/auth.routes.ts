import { Router } from 'express';
import { AuthController } from './auth.controller';
import { validateRequest, strongPasswordSchema } from '../../lib/validation';
import { z } from 'zod';
import { authenticate } from '../../lib/auth';
import { requireAdmin, loginRateLimiter } from '../../lib/security';

const router = Router();
const authController = new AuthController();

// Validation schemas
const createUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  temporaryPassword: strongPasswordSchema, // Use strong password validation
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

const completeProfileSchema = z.object({
  personalNumber: z.string().min(1, 'Personal number is required'),
  name: z.string().min(1, 'Name is required'),
  type: z.enum(['CONSCRIPT', 'PERMANENT']),
  departmentId: z.number().int().positive('Department ID must be a positive integer'),
  roleId: z.number().int().positive('Role ID must be a positive integer').optional(),
  isCommander: z.boolean().optional().default(false),
  newPassword: strongPasswordSchema, // Use strong password validation
});

const updateUserSchema = z.object({
  name: z.string().min(1).optional(),
  personalNumber: z.string().min(1).optional(),
  email: z.string().email('Invalid email address').optional(),
  type: z.enum(['CONSCRIPT', 'PERMANENT']).optional(),
  departmentId: z.number().int().positive('Department ID must be a positive integer').optional(),
  roleId: z.number().int().positive('Role ID must be a positive integer').optional().nullable(),
  isCommander: z.boolean().optional(),
  isAdmin: z.boolean().optional(),
  approvalStatus: z.enum(['CREATED', 'PENDING', 'APPROVED', 'REJECTED']).optional(),
});

// Public routes
// SECURITY: Apply brute force protection to login endpoint
router.post('/login', loginRateLimiter, validateRequest(loginSchema), authController.login.bind(authController));

// Protected routes
router.get('/me', authenticate, authController.me.bind(authController));
router.post('/complete-profile', authenticate, validateRequest(completeProfileSchema), authController.completeProfile.bind(authController));

// Admin routes - user management
// IMPORTANT: Specific routes must come before parameterized routes (:id)
router.post('/create-user', authenticate, requireAdmin, validateRequest(createUserSchema), authController.createUser.bind(authController));
router.get('/created', authenticate, requireAdmin, authController.getCreatedUsers.bind(authController));
router.get('/pending', authenticate, requireAdmin, authController.getPendingUsers.bind(authController));

// Parameterized routes (:id) - must come after specific routes
router.post('/:id/approve', authenticate, requireAdmin, authController.approveUser.bind(authController));
router.post('/:id/reject', authenticate, requireAdmin, authController.rejectUser.bind(authController));
router.post('/:id/reset-password', authenticate, requireAdmin, validateRequest(z.object({
  newPassword: strongPasswordSchema, // Use strong password validation
})), authController.resetUserPassword.bind(authController));
router.delete('/:id', authenticate, requireAdmin, authController.deleteUser.bind(authController));
router.put('/:id', authenticate, requireAdmin, validateRequest(updateUserSchema), authController.updateUser.bind(authController));

// Note: PUT /:id must be the last route to avoid conflicts with other routes

export default router;



