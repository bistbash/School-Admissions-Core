import { prisma } from '../../lib/prisma';
import { Soldier } from '@prisma/client';
import { NotFoundError } from '../../lib/errors';

export class SoldiersService {
    async getAll() {
        return prisma.soldier.findMany({
            select: {
                id: true,
                personalNumber: true,
                name: true,
                email: true,
                type: true,
                departmentId: true,
                roleId: true,
                isCommander: true,
                createdAt: true,
                updatedAt: true,
                department: true,
                role: true,
                // Explicitly exclude password
            },
        });
    }

    // Note: Creating soldiers with passwords should be done through /api/auth/register
    // This method is kept for backward compatibility but should not be used for creating users
    async create(data: {
        personalNumber: string;
        name: string;
        email: string;
        type: string;
        departmentId: number;
        roleId?: number;
        isCommander?: boolean;
    }) {
        const created = await prisma.soldier.create({
            data: {
                personalNumber: data.personalNumber,
                name: data.name,
                email: data.email,
                password: '', // Empty password - should use auth/register instead
                type: data.type,
                departmentId: data.departmentId,
                roleId: data.roleId,
                isCommander: data.isCommander || false,
            },
            select: {
                id: true,
                personalNumber: true,
                name: true,
                email: true,
                type: true,
                departmentId: true,
                roleId: true,
                isCommander: true,
                createdAt: true,
                updatedAt: true,
                department: true,
                role: true,
                // Explicitly exclude password
            },
        });
        return created;
    }

    async getById(id: number) {
        const soldier = await prisma.soldier.findUnique({
            where: { id },
            select: {
                id: true,
                personalNumber: true,
                name: true,
                email: true,
                type: true,
                departmentId: true,
                roleId: true,
                isCommander: true,
                createdAt: true,
                updatedAt: true,
                department: true,
                role: true,
                // Explicitly exclude password
            },
        });
        if (!soldier) {
            throw new NotFoundError('Soldier');
        }
        return soldier;
    }

    async update(id: number, data: Partial<Soldier>) {
        await this.getById(id); // Check if exists
        
        // Remove password from update data if present (password updates should go through auth)
        const { password, ...updateData } = data as any;
        
        const updated = await prisma.soldier.update({
            where: { id },
            data: updateData,
            select: {
                id: true,
                personalNumber: true,
                name: true,
                email: true,
                type: true,
                departmentId: true,
                roleId: true,
                isCommander: true,
                createdAt: true,
                updatedAt: true,
                department: true,
                role: true,
                // Explicitly exclude password
            },
        });
        return updated;
    }

    async delete(id: number) {
        await this.getById(id); // Check if exists
        return prisma.soldier.delete({
            where: { id },
        });
    }
}
