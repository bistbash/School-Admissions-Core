import { prisma } from '../../lib/database/prisma';
import { NotFoundError } from '../../lib/utils/errors';

export interface CreateExitData {
  studentId: number;
  hasLeft: boolean;
  exitReason?: string;
  exitCategory?: string;
  receivingInstitution?: string;
  wasDesiredExit?: boolean;
  exitDate?: Date;
  clearanceCompleted?: boolean;
  passedSupply?: boolean;
  expelledFromSchool?: boolean;
}

export interface UpdateExitData {
  hasLeft?: boolean;
  exitReason?: string;
  exitCategory?: string;
  receivingInstitution?: string;
  wasDesiredExit?: boolean;
  exitDate?: Date;
  clearanceCompleted?: boolean;
  passedSupply?: boolean;
  expelledFromSchool?: boolean;
}

export class StudentExitsService {
  /**
   * Create exit record for a student
   */
  async create(data: CreateExitData) {
    // Verify student exists
    const student = await (prisma as any).student.findUnique({
      where: { id: data.studentId },
    });

    if (!student) {
      throw new NotFoundError('Student');
    }

    // Check if exit record already exists
    const existing = await (prisma as any).studentExit.findUnique({
      where: { studentId: data.studentId },
    });

    if (existing) {
      throw new Error('Exit record already exists for this student');
    }

    // Create exit record and update student status
    const exitRecord = await (prisma as any).studentExit.create({
      data: {
        studentId: data.studentId,
        hasLeft: data.hasLeft,
        exitReason: data.exitReason,
        exitCategory: data.exitCategory,
        receivingInstitution: data.receivingInstitution,
        wasDesiredExit: data.wasDesiredExit,
        exitDate: data.exitDate,
        clearanceCompleted: data.clearanceCompleted ?? false,
        passedSupply: data.passedSupply ?? false,
        expelledFromSchool: data.expelledFromSchool ?? false,
      },
      include: {
        student: {
          include: {
            cohort: true,
          },
        },
      },
    });

    // Update student status to LEFT
    await (prisma as any).student.update({
      where: { id: data.studentId },
      data: { status: 'LEFT' },
    });

    return exitRecord;
  }

  /**
   * Get exit record by student ID
   */
  async getByStudentId(studentId: number) {
    const exitRecord = await (prisma as any).studentExit.findUnique({
      where: { studentId },
      include: {
        student: {
          include: {
            cohort: true,
          },
        },
      },
    });

    if (!exitRecord) {
      throw new NotFoundError('Exit record');
    }

    return exitRecord;
  }

  /**
   * Get all exit records
   */
  async getAll(filters?: {
    exitCategory?: string;
    wasDesiredExit?: boolean;
    expelledFromSchool?: boolean;
  }) {
    const where: any = {};
    
    if (filters?.exitCategory) {
      where.exitCategory = filters.exitCategory;
    }
    if (filters?.wasDesiredExit !== undefined) {
      where.wasDesiredExit = filters.wasDesiredExit;
    }
    if (filters?.expelledFromSchool !== undefined) {
      where.expelledFromSchool = filters.expelledFromSchool;
    }

    return (prisma as any).studentExit.findMany({
      where,
      include: {
        student: {
          include: {
            cohort: true,
          },
        },
      },
      orderBy: {
        exitDate: 'desc',
      },
    });
  }

  /**
   * Update exit record
   */
  async update(studentId: number, data: UpdateExitData) {
    const exitRecord = await (prisma as any).studentExit.findUnique({
      where: { studentId },
    });

    if (!exitRecord) {
      throw new NotFoundError('Exit record');
    }

    return (prisma as any).studentExit.update({
      where: { studentId },
      data,
      include: {
        student: {
          include: {
            cohort: true,
          },
        },
      },
    });
  }
}

