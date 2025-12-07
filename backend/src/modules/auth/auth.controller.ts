import { Request, Response, NextFunction } from 'express';
import { AuthService } from './auth.service';
import { auditFromRequest } from '../../lib/audit';

const authService = new AuthService();

export class AuthController {
  /**
   * Create a new user (Admin only)
   * Admin creates user with email and temporary password
   */
  async createUser(req: Request, res: Response, next: NextFunction) {
    try {
      const adminUser = (req as any).user;
      const result = await authService.createUser(req.body, adminUser.userId);
      await auditFromRequest(req, 'CREATE', 'AUTH', {
        status: 'SUCCESS',
        resourceId: result.id,
        details: { 
          email: result.email,
          createdBy: adminUser.userId,
        },
      });
      res.status(201).json(result);
    } catch (error) {
      await auditFromRequest(req, 'CREATE', 'AUTH', {
        status: 'FAILURE',
        errorMessage: error instanceof Error ? error.message : 'Failed to create user',
        details: { 
          email: req.body.email,
        },
      });
      next(error);
    }
  }

  /**
   * Complete user profile (called on first login)
   */
  async completeProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const user = (req as any).user;
      const result = await authService.completeProfile(user.userId, req.body);
      await auditFromRequest(req, 'UPDATE', 'AUTH', {
        status: 'SUCCESS',
        resourceId: user.userId,
        details: { 
          action: 'complete_profile',
          email: result.email,
        },
      });
      res.json(result);
    } catch (error) {
      await auditFromRequest(req, 'UPDATE', 'AUTH', {
        status: 'FAILURE',
        resourceId: (req as any).user?.userId,
        errorMessage: error instanceof Error ? error.message : 'Failed to complete profile',
        details: { action: 'complete_profile' },
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

  async getCreatedUsers(req: Request, res: Response, next: NextFunction) {
    try {
      const createdUsers = await authService.getCreatedUsers();
      await auditFromRequest(req, 'READ', 'AUTH', {
        status: 'SUCCESS',
        details: { action: 'get_created_users', count: createdUsers.length },
      });
      res.json(createdUsers);
    } catch (error) {
      next(error);
    }
  }

  async getPendingUsers(req: Request, res: Response, next: NextFunction) {
    try {
      const pendingUsers = await authService.getPendingUsers();
      await auditFromRequest(req, 'READ', 'AUTH', {
        status: 'SUCCESS',
        details: { action: 'get_pending_users', count: pendingUsers.length },
      });
      res.json(pendingUsers);
    } catch (error) {
      next(error);
    }
  }

  async approveUser(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = Number(req.params.id);
      const adminUser = (req as any).user;
      const approvedUser = await authService.approveUser(userId, adminUser.userId);
      await auditFromRequest(req, 'UPDATE', 'AUTH', {
        status: 'SUCCESS',
        resourceId: userId,
        details: { 
          action: 'approve_user',
          approvedUserEmail: approvedUser.email,
          approvedBy: adminUser.userId,
        },
      });
      res.json(approvedUser);
    } catch (error) {
      await auditFromRequest(req, 'UPDATE', 'AUTH', {
        status: 'FAILURE',
        resourceId: Number(req.params.id),
        errorMessage: error instanceof Error ? error.message : 'Failed to approve user',
        details: { action: 'approve_user' },
      });
      next(error);
    }
  }

  async rejectUser(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = Number(req.params.id);
      const adminUser = (req as any).user;
      const rejectedUser = await authService.rejectUser(userId, adminUser.userId);
      await auditFromRequest(req, 'UPDATE', 'AUTH', {
        status: 'SUCCESS',
        resourceId: userId,
        details: { 
          action: 'reject_user',
          rejectedUserEmail: rejectedUser.email,
          rejectedBy: adminUser.userId,
        },
      });
      res.json(rejectedUser);
    } catch (error) {
      await auditFromRequest(req, 'UPDATE', 'AUTH', {
        status: 'FAILURE',
        resourceId: Number(req.params.id),
        errorMessage: error instanceof Error ? error.message : 'Failed to reject user',
        details: { action: 'reject_user' },
      });
      next(error);
    }
  }

  async resetUserPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = Number(req.params.id);
      const adminUser = (req as any).user;
      const { newPassword } = req.body;

      if (!newPassword || newPassword.length < 8) {
        return res.status(400).json({ error: 'Password must be at least 8 characters' });
      }

      const result = await authService.resetUserPassword(userId, newPassword, adminUser.userId);
      await auditFromRequest(req, 'UPDATE', 'AUTH', {
        status: 'SUCCESS',
        resourceId: userId,
        details: { 
          action: 'reset_password',
          userEmail: result.email,
          resetBy: adminUser.userId,
        },
      });
      res.json({ message: 'Password reset successfully', user: result });
    } catch (error) {
      await auditFromRequest(req, 'UPDATE', 'AUTH', {
        status: 'FAILURE',
        resourceId: Number(req.params.id),
        errorMessage: error instanceof Error ? error.message : 'Failed to reset password',
        details: { action: 'reset_password' },
      });
      next(error);
    }
  }

  async updateUser(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = Number(req.params.id);
      const adminUser = (req as any).user;
      const updatedUser = await authService.updateUser(userId, req.body, adminUser.userId);
      await auditFromRequest(req, 'UPDATE', 'AUTH', {
        status: 'SUCCESS',
        resourceId: userId,
        details: { 
          action: 'update_user',
          userEmail: updatedUser.email,
          updatedBy: adminUser.userId,
        },
      });
      res.json(updatedUser);
    } catch (error) {
      await auditFromRequest(req, 'UPDATE', 'AUTH', {
        status: 'FAILURE',
        resourceId: Number(req.params.id),
        errorMessage: error instanceof Error ? error.message : 'Failed to update user',
        details: { action: 'update_user' },
      });
      next(error);
    }
  }

  async deleteUser(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = Number(req.params.id);
      const adminUser = (req as any).user;
      const deletedUser = await authService.deleteUser(userId, adminUser.userId);
      await auditFromRequest(req, 'DELETE', 'AUTH', {
        status: 'SUCCESS',
        resourceId: userId,
        details: { 
          action: 'delete_user',
          deletedUserEmail: deletedUser.email,
          deletedBy: adminUser.userId,
        },
      });
      res.json({ message: 'User deleted successfully', user: deletedUser });
    } catch (error) {
      await auditFromRequest(req, 'DELETE', 'AUTH', {
        status: 'FAILURE',
        resourceId: Number(req.params.id),
        errorMessage: error instanceof Error ? error.message : 'Failed to delete user',
        details: { action: 'delete_user' },
      });
      next(error);
    }
  }
}



