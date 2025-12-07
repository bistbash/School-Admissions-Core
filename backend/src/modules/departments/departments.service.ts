import { prisma } from '../../lib/prisma';
import { Department } from '@prisma/client';
import { NotFoundError } from '../../lib/errors';

export class DepartmentsService {
    async getAll() {
        return prisma.department.findMany({
            include: {
                soldiers: true,
            },
        });
    }

    async create(data: { name: string }) {
        return prisma.department.create({
            data: {
                name: data.name,
            },
        });
    }

    async getCommanders(id: number) {
        return prisma.soldier.findMany({
            where: {
                departmentId: id,
                isCommander: true,
            },
        });
    }
    async getById(id: number) {
        const department = await prisma.department.findUnique({
            where: { id },
            include: {
                soldiers: true,
            },
        });
        if (!department) {
            throw new NotFoundError('Department');
        }
        return department;
    }

    async update(id: number, data: Partial<Department>) {
        await this.getById(id); // Check if exists
        return prisma.department.update({
            where: { id },
            data,
        });
    }

    async delete(id: number) {
        await this.getById(id); // Check if exists
        return prisma.department.delete({
            where: { id },
        });
    }
}
