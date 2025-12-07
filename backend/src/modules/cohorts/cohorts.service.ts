import { prisma } from '../../lib/prisma';
import { NotFoundError, ValidationError } from '../../lib/errors';

export interface CreateCohortData {
  name: string;
  startYear: number;
  currentGrade: string; // ט', י', י"א, י"ב, י"ג, י"ד
}

export interface UpdateCohortData {
  name?: string;
  currentGrade?: string;
  isActive?: boolean;
}

export class CohortsService {
  /**
   * Create a new cohort
   */
  async create(data: CreateCohortData) {
    // Validate startYear range: 1954 to current year + 1
    const currentYear = new Date().getFullYear();
    const minYear = 1954;
    const maxYear = currentYear + 1;
    
    if (data.startYear < minYear || data.startYear > maxYear) {
      throw new ValidationError(
        `שנת מחזור חייבת להיות בין ${minYear} ל-${maxYear}. התקבל: ${data.startYear}`
      );
    }
    
    // Check if name already exists
    const existing = await (prisma as any).cohort.findUnique({
      where: { name: data.name },
    });

    if (existing) {
      throw new ValidationError('Cohort with this name already exists');
    }

    return (prisma as any).cohort.create({
      data: {
        name: data.name,
        startYear: data.startYear,
        currentGrade: data.currentGrade,
        isActive: true,
      },
    });
  }

  /**
   * Get all cohorts
   */
  async getAll(filters?: { isActive?: boolean }) {
    const where: any = {};
    
    if (filters?.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    return (prisma as any).cohort.findMany({
      where,
      include: {
        students: {
          where: {
            status: 'ACTIVE',
          },
        },
        _count: {
          select: {
            students: true,
          },
        },
      },
      orderBy: {
        startYear: 'desc',
      },
    });
  }

  /**
   * Get cohort by ID
   */
  async getById(id: number) {
    const cohort = await (prisma as any).cohort.findUnique({
      where: { id },
      include: {
        students: {
          include: {
            exitRecord: true,
          },
        },
      },
    });

    if (!cohort) {
      throw new NotFoundError('Cohort');
    }

    return cohort;
  }

  /**
   * Update cohort
   */
  async update(id: number, data: UpdateCohortData) {
    const cohort = await (prisma as any).cohort.findUnique({
      where: { id },
    });

    if (!cohort) {
      throw new NotFoundError('Cohort');
    }

    return (prisma as any).cohort.update({
      where: { id },
      data,
      include: {
        students: {
          where: {
            status: 'ACTIVE',
          },
        },
      },
    });
  }

  /**
   * Delete cohort (soft delete)
   */
  async delete(id: number) {
    const cohort = await (prisma as any).cohort.findUnique({
      where: { id },
    });

    if (!cohort) {
      throw new NotFoundError('Cohort');
    }

    return (prisma as any).cohort.update({
      where: { id },
      data: {
        isActive: false,
      },
    });
  }
}

