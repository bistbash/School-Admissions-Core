import { Request, Response } from 'express';
import { RolesService } from './roles.service';

const rolesService = new RolesService();

export class RolesController {
    async getAll(req: Request, res: Response) {
        try {
            const roles = await rolesService.getAll();
            res.json(roles);
        } catch (error) {
            res.status(500).json({ error: 'Failed to fetch roles' });
        }
    }

    async create(req: Request, res: Response) {
        try {
            const role = await rolesService.create(req.body);
            res.json(role);
        } catch (error) {
            res.status(500).json({ error: 'Failed to create role' });
        }
    }

    async delete(req: Request, res: Response) {
        try {
            await rolesService.delete(Number(req.params.id));
            res.json({ message: 'Role deleted successfully' });
        } catch (error) {
            res.status(500).json({ error: 'Failed to delete role' });
        }
    }
}
