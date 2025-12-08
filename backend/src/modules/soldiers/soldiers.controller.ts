import { Request, Response, NextFunction } from 'express';
import { SoldiersService } from './soldiers.service';
import { auditFromRequest } from '../../lib/audit/audit';

const soldiersService = new SoldiersService();

export class SoldiersController {
    async getAll(req: Request, res: Response, next: NextFunction) {
        try {
            const soldiers = await soldiersService.getAll();
            res.json(soldiers);
        } catch (error) {
            next(error);
        }
    }

    async getById(req: Request, res: Response, next: NextFunction) {
        try {
            const soldier = await soldiersService.getById(Number(req.params.id));
            res.json(soldier);
        } catch (error) {
            next(error);
        }
    }

    async create(req: Request, res: Response, next: NextFunction) {
        try {
            const soldier = await soldiersService.create(req.body);
            res.status(201).json(soldier);
        } catch (error) {
            next(error);
        }
    }

    async update(req: Request, res: Response, next: NextFunction) {
        try {
            const soldier = await soldiersService.update(Number(req.params.id), req.body);
            res.json(soldier);
        } catch (error) {
            next(error);
        }
    }

    async delete(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = Number(req.params.id);
            const adminUser = (req as any).user;
            
            // Get user info before deletion for logging
            const userInfo = await soldiersService.getById(userId);
            
            await soldiersService.delete(userId);
            
            await auditFromRequest(req, 'DELETE', 'AUTH', {
                status: 'SUCCESS',
                resourceId: userId,
                details: {
                    action: 'delete_user',
                    deletedUserEmail: userInfo.email,
                    deletedBy: adminUser.userId,
                },
            });
            
            res.json({ message: 'User deleted successfully' });
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
