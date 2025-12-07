import { Request, Response } from 'express';
import { DepartmentsService } from './departments.service';

const departmentsService = new DepartmentsService();

export class DepartmentsController {
    async getAll(req: Request, res: Response) {
        try {
            const departments = await departmentsService.getAll();
            res.json(departments);
        } catch (error) {
            res.status(500).json({ error: 'Failed to fetch departments' });
        }
    }

    async create(req: Request, res: Response) {
        try {
            const department = await departmentsService.create(req.body);
            res.json(department);
        } catch (error) {
            res.status(500).json({ error: 'Failed to create department' });
        }
    }

    async getCommanders(req: Request, res: Response) {
        try {
            const commanders = await departmentsService.getCommanders(Number(req.params.id));
            res.json(commanders);
        } catch (error) {
            res.status(500).json({ error: 'Failed to fetch commanders' });
        }
    }
    async delete(req: Request, res: Response) {
        try {
            await departmentsService.delete(Number(req.params.id));
            res.json({ message: 'Department deleted successfully' });
        } catch (error) {
            res.status(500).json({ error: 'Failed to delete department' });
        }
    }
}
