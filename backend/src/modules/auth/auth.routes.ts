import { Router } from 'express';
import { AuthController } from './auth.controller';
import { validateRequest } from '../../lib/validation';
import { z } from 'zod';
import { authenticate } from '../../lib/auth';

const router = Router();
const authController = new AuthController();

// Validation schemas
const registerSchema = z.object({
  personalNumber: z.string().min(1, 'Personal number is required'),
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  type: z.enum(['CONSCRIPT', 'PERMANENT']),
  departmentId: z.number().int().positive('Department ID must be a positive integer'),
  roleId: z.number().int().positive('Role ID must be a positive integer').optional(),
  isCommander: z.boolean().optional().default(false),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

// Public routes
router.post('/register', validateRequest(registerSchema), authController.register.bind(authController));
router.post('/login', validateRequest(loginSchema), authController.login.bind(authController));

// Protected route - get current user
router.get('/me', authenticate, authController.me.bind(authController));

export default router;


