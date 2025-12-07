import { Request, Response, NextFunction } from 'express';
import { DepartmentsService } from './departments.service';

const departmentsService = new DepartmentsService();

export class DepartmentsController {
    async getAll(req: Request, res: Response, next: NextFunction) {
        try {
            const departments = await departmentsService.getAll();
            res.json(departments);
        } catch (error) {
            next(error);
        }
    }

    async getById(req: Request, res: Response, next: NextFunction) {
        try {
            const department = await departmentsService.getById(Number(req.params.id));
            res.json(department);
        } catch (error) {
            next(error);
        }
    }

    async create(req: Request, res: Response, next: NextFunction) {
        try {
            const department = await departmentsService.create(req.body);
            res.status(201).json(department);
        } catch (error) {
            next(error);
        }
    }

    async update(req: Request, res: Response, next: NextFunction) {
        try {
            const department = await departmentsService.update(Number(req.params.id), req.body);
            res.json(department);
        } catch (error) {
            next(error);
        }
    }

    async getCommanders(req: Request, res: Response, next: NextFunction) {
        try {
            const commanders = await departmentsService.getCommanders(Number(req.params.id));
            res.json(commanders);
        } catch (error) {
            next(error);
        }
    }

    async delete(req: Request, res: Response, next: NextFunction) {
        try {
            await departmentsService.delete(Number(req.params.id));
            res.json({ message: 'Department deleted successfully' });
        } catch (error) {
            next(error);
        }
    }
}
