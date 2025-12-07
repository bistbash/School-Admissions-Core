import { Request, Response, NextFunction } from 'express';
import { RolesService } from './roles.service';

const rolesService = new RolesService();

export class RolesController {
    async getAll(req: Request, res: Response, next: NextFunction) {
        try {
            const roles = await rolesService.getAll();
            res.json(roles);
        } catch (error) {
            next(error);
        }
    }

    async getById(req: Request, res: Response, next: NextFunction) {
        try {
            const role = await rolesService.getById(Number(req.params.id));
            res.json(role);
        } catch (error) {
            next(error);
        }
    }

    async create(req: Request, res: Response, next: NextFunction) {
        try {
            const role = await rolesService.create(req.body);
            res.status(201).json(role);
        } catch (error) {
            next(error);
        }
    }

    async update(req: Request, res: Response, next: NextFunction) {
        try {
            const role = await rolesService.update(Number(req.params.id), req.body);
            res.json(role);
        } catch (error) {
            next(error);
        }
    }

    async delete(req: Request, res: Response, next: NextFunction) {
        try {
            await rolesService.delete(Number(req.params.id));
            res.json({ message: 'Role deleted successfully' });
        } catch (error) {
            next(error);
        }
    }
}
