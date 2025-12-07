import { prisma } from '../../server';
import { Soldier } from '@prisma/client';

export class SoldiersService {
    async getAll() {
        return prisma.soldier.findMany({
            include: {
                department: true,
                role: true,
            },
        });
    }

    async create(data: {
        personalNumber: string;
        name: string;
        type: string;
        departmentId: number;
        roleId: number;
        isCommander: boolean;
    }) {
        return prisma.soldier.create({
            data: {
                personalNumber: data.personalNumber,
                name: data.name,
                type: data.type,
                departmentId: data.departmentId,
                roleId: data.roleId,
                isCommander: data.isCommander,
            },
        });
    }

    async update(id: number, data: Partial<Soldier>) {
        return prisma.soldier.update({
            where: { id },
            data,
        });
    }

    async delete(id: number) {
        return prisma.soldier.delete({
            where: { id },
        });
    }
}
