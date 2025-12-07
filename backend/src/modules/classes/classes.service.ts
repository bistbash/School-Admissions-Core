import { prisma } from '../../lib/prisma';
import { Class } from '@prisma/client';
import { NotFoundError, ConflictError } from '../../lib/errors';

export class ClassesService {
  async getAll(academicYear?: number) {
    const where: any = {};
    if (academicYear) {
      where.academicYear = academicYear;
    }

    return prisma.class.findMany({
      where,
      include: {
        enrollments: {
          include: {
            student: true,
          },
        },
      },
      orderBy: [
        { academicYear: 'desc' },
        { grade: 'asc' },
        { parallel: 'asc' },
      ],
    });
  }

  async getById(id: number) {
    const classRecord = await prisma.class.findUnique({
      where: { id },
      include: {
        enrollments: {
          include: {
            student: true,
          },
        },
      },
    });

    if (!classRecord) {
      throw new NotFoundError('Class');
    }

    return classRecord;
  }

  async create(data: {
    grade: string;
    parallel?: string;
    track?: string;
    academicYear: number;
    name?: string;
  }) {
    // Check if class already exists
    const existing = await prisma.class.findFirst({
      where: {
        grade: data.grade,
        parallel: data.parallel || null,
        track: data.track || null,
        academicYear: data.academicYear,
      },
    });

    if (existing) {
      throw new ConflictError('Class already exists for this grade, parallel, track, and academic year');
    }

    // Generate name if not provided
    const name = data.name || [data.grade, data.parallel, data.track].filter(Boolean).join(' - ') || data.grade;

    return prisma.class.create({
      data: {
        grade: data.grade,
        parallel: data.parallel || null,
        track: data.track || null,
        academicYear: data.academicYear,
        name,
        isActive: true,
      },
    });
  }

  async update(id: number, data: Partial<Class>) {
    await this.getById(id); // Check if exists

    // If updating unique fields, check for conflicts
    if (data.grade || data.parallel !== undefined || data.track !== undefined || data.academicYear) {
      const current = await prisma.class.findUnique({ where: { id } });
      if (!current) throw new NotFoundError('Class');

      const grade = data.grade || current.grade;
      const parallel = data.parallel !== undefined ? data.parallel : current.parallel;
      const track = data.track !== undefined ? data.track : current.track;
      const academicYear = data.academicYear || current.academicYear;

      const existing = await prisma.class.findFirst({
        where: {
          grade,
          parallel: parallel || null,
          track: track || null,
          academicYear,
          NOT: { id },
        },
      });

      if (existing) {
        throw new ConflictError('Class already exists for this grade, parallel, track, and academic year');
      }
    }

    return prisma.class.update({
      where: { id },
      data,
    });
  }

  async delete(id: number) {
    await this.getById(id); // Check if exists

    // Check if class has enrollments
    const enrollments = await prisma.enrollment.count({
      where: { classId: id },
    });

    if (enrollments > 0) {
      throw new ConflictError('Cannot delete class with existing enrollments. Deactivate it instead.');
    }

    return prisma.class.delete({
      where: { id },
    });
  }
}
