import { prisma } from '../../lib/prisma';
import { Room } from '@prisma/client';
import { NotFoundError } from '../../lib/errors';

export class RoomsService {
    async getAll() {
        return prisma.room.findMany();
    }

    async create(data: { name: string; capacity: number }) {
        return prisma.room.create({
            data: {
                name: data.name,
                capacity: data.capacity,
            },
        });
    }
    async getById(id: number) {
        const room = await prisma.room.findUnique({
            where: { id },
        });
        if (!room) {
            throw new NotFoundError('Room');
        }
        return room;
    }

    async update(id: number, data: Partial<Room>) {
        await this.getById(id); // Check if exists
        return prisma.room.update({
            where: { id },
            data,
        });
    }

    async delete(id: number) {
        await this.getById(id); // Check if exists
        return prisma.room.delete({
            where: { id },
        });
    }
}
