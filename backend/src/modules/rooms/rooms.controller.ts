import { Request, Response } from 'express';
import { RoomsService } from './rooms.service';

const roomsService = new RoomsService();

export class RoomsController {
    async getAll(req: Request, res: Response) {
        try {
            const rooms = await roomsService.getAll();
            res.json(rooms);
        } catch (error) {
            res.status(500).json({ error: 'Failed to fetch rooms' });
        }
    }

    async create(req: Request, res: Response) {
        try {
            const room = await roomsService.create(req.body);
            res.json(room);
        } catch (error) {
            res.status(500).json({
                error: 'Failed to create room'
            });
        }
    }

    async delete(req: Request, res: Response) {
        try {
            await roomsService.delete(Number(req.params.id));
            res.json({ message: 'Room deleted successfully' });
        } catch (error) {
            res.status(500).json({ error: 'Failed to delete room' });
        }
    }
}
