import { prisma } from '../../server';
import { Role } from '@prisma/client';

export class RolesService {
    async getAll() {
        return prisma.role.findMany();
    }

    async create(data: { name: string }) {
        return prisma.role.create({
            data: {
                name: data.name,
            },
        });
    }
    async delete(id: number) {
        return prisma.role.delete({
            where: { id },
        });
    }
}
