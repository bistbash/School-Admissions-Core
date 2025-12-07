import { prisma } from '../../server';
import { Department } from '@prisma/client';

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
    async delete(id: number) {
        return prisma.department.delete({
            where: { id },
        });
    }
}
