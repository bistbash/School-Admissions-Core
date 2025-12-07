import { Request, Response } from 'express';
import { SoldiersService } from './soldiers.service';

const soldiersService = new SoldiersService();

export class SoldiersController {
    async getAll(req: Request, res: Response) {
        try {
            const soldiers = await soldiersService.getAll();
            res.json(soldiers);
        } catch (error) {
            res.status(500).json({ error: 'Failed to fetch soldiers' });
        }
    }

    async create(req: Request, res: Response) {
        try {
            const soldier = await soldiersService.create(req.body);
            res.json(soldier);
        } catch (error) {
            res.status(500).json({ error: 'Failed to create soldier', details: error });
        }
    }

    async update(req: Request, res: Response) {
        try {
            const soldier = await soldiersService.update(Number(req.params.id), req.body);
            res.json(soldier);
        } catch (error) {
            res.status(500).json({ error: 'Failed to update soldier' });
        }
    }

    async delete(req: Request, res: Response) {
        try {
            await soldiersService.delete(Number(req.params.id));
            res.json({ message: 'Soldier deleted successfully' });
        } catch (error) {
            res.status(500).json({ error: 'Failed to delete soldier' });
        }
    }
}
