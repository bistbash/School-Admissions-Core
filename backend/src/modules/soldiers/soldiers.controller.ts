import { Request, Response, NextFunction } from 'express';
import { SoldiersService } from './soldiers.service';

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
            await soldiersService.delete(Number(req.params.id));
            res.json({ message: 'Soldier deleted successfully' });
        } catch (error) {
            next(error);
        }
    }
}
