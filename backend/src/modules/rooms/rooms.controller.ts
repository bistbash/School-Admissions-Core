import { Request, Response, NextFunction } from 'express';
import { RoomsService } from './rooms.service';

const roomsService = new RoomsService();

export class RoomsController {
    async getAll(req: Request, res: Response, next: NextFunction) {
        try {
            const rooms = await roomsService.getAll();
            res.json(rooms);
        } catch (error) {
            next(error);
        }
    }

    async getById(req: Request, res: Response, next: NextFunction) {
        try {
            const room = await roomsService.getById(Number(req.params.id));
            res.json(room);
        } catch (error) {
            next(error);
        }
    }

    async create(req: Request, res: Response, next: NextFunction) {
        try {
            const room = await roomsService.create(req.body);
            res.status(201).json(room);
        } catch (error) {
            next(error);
        }
    }

    async update(req: Request, res: Response, next: NextFunction) {
        try {
            const room = await roomsService.update(Number(req.params.id), req.body);
            res.json(room);
        } catch (error) {
            next(error);
        }
    }

    async delete(req: Request, res: Response, next: NextFunction) {
        try {
            await roomsService.delete(Number(req.params.id));
            res.json({ message: 'Room deleted successfully' });
        } catch (error) {
            next(error);
        }
    }
}
