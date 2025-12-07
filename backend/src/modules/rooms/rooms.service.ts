import { prisma } from '../../server';
import { Room } from '@prisma/client';

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
    async delete(id: number) {
        return prisma.room.delete({
            where: { id },
        });
    }
}
