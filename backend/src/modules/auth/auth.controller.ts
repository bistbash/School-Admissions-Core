import { Request, Response, NextFunction } from 'express';
import { AuthService } from './auth.service';
import { auditFromRequest } from '../../lib/audit';

const authService = new AuthService();

export class AuthController {
  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await authService.register(req.body);
      // Log successful registration
      await auditFromRequest(req, 'REGISTER', 'AUTH', {
        status: 'SUCCESS',
        details: { email: req.body.email },
      });
      res.status(201).json(result);
    } catch (error) {
      // Log failed registration
      await auditFromRequest(req, 'REGISTER', 'AUTH', {
        status: 'FAILURE',
        errorMessage: error instanceof Error ? error.message : 'Registration failed',
        details: { email: req.body.email },
      });
      next(error);
    }
  }

  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await authService.login(req.body);
      // Log successful login
      await auditFromRequest(req, 'LOGIN', 'AUTH', {
        status: 'SUCCESS',
        details: { 
          email: req.body.email,
          attemptedEmail: req.body.email, // For consistency
        },
      });
      res.json(result);
    } catch (error) {
      // Log failed login attempt with attempted email
      await auditFromRequest(req, 'LOGIN_FAILED', 'AUTH', {
        status: 'FAILURE',
        errorMessage: error instanceof Error ? error.message : 'Login failed',
        details: { 
          attemptedEmail: req.body.email, // Email that was attempted
          error: error instanceof Error ? error.message : 'Login failed',
        },
      });
      next(error);
    }
  }

  async me(req: Request, res: Response, next: NextFunction) {
    try {
      const user = (req as any).user;
      const currentUser = await authService.getCurrentUser(user.userId);
      res.json(currentUser);
    } catch (error) {
      next(error);
    }
  }
}



