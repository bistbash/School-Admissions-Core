import { prisma } from '../../lib/prisma';
import { Role } from '@prisma/client';
import { NotFoundError } from '../../lib/errors';

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
    async getById(id: number) {
        const role = await prisma.role.findUnique({
            where: { id },
        });
        if (!role) {
            throw new NotFoundError('Role');
        }
        return role;
    }

    async update(id: number, data: Partial<Role>) {
        await this.getById(id); // Check if exists
        return prisma.role.update({
            where: { id },
            data,
        });
    }

    async delete(id: number) {
        await this.getById(id); // Check if exists
        return prisma.role.delete({
            where: { id },
        });
    }
}
