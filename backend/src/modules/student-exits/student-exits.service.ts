import { prisma } from '../../lib/database/prisma';
import { NotFoundError, ConflictError } from '../../lib/utils/errors';
import { logger } from '../../lib/utils/logger';
import { PrismaClient } from '@prisma/client';

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
   * Uses transaction to ensure atomicity
   */
  async create(data: CreateExitData) {
    return prisma.$transaction(async (tx: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>) => {
      // Verify student exists
      const student = await tx.student.findUnique({
        where: { id: data.studentId },
      });

      if (!student) {
        throw new NotFoundError('Student');
      }

      // Check if exit record already exists
      const existing = await tx.studentExit.findUnique({
        where: { studentId: data.studentId },
      });

      if (existing) {
        throw new ConflictError('Exit record already exists for this student');
      }

      // Create exit record and update student status atomically
      const [exitRecord] = await Promise.all([
        tx.studentExit.create({
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
        }),
        tx.student.update({
          where: { id: data.studentId },
          data: { status: 'LEFT' },
        }),
      ]);

      logger.info({
        studentId: data.studentId,
        exitCategory: data.exitCategory,
      }, 'Student exit record created');

      return exitRecord;
    });
  }

  /**
   * Get exit record by student ID
   */
  async getByStudentId(studentId: number) {
    const exitRecord = await prisma.studentExit.findUnique({
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
    const where: {
      exitCategory?: string;
      wasDesiredExit?: boolean;
      expelledFromSchool?: boolean;
    } = {};
    
    if (filters?.exitCategory) {
      where.exitCategory = filters.exitCategory;
    }
    if (filters?.wasDesiredExit !== undefined) {
      where.wasDesiredExit = filters.wasDesiredExit;
    }
    if (filters?.expelledFromSchool !== undefined) {
      where.expelledFromSchool = filters.expelledFromSchool;
    }

    return prisma.studentExit.findMany({
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
    const exitRecord = await prisma.studentExit.findUnique({
      where: { studentId },
    });

    if (!exitRecord) {
      throw new NotFoundError('Exit record');
    }

    const updated = await prisma.studentExit.update({
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

    logger.info({
      studentId,
    }, 'Student exit record updated');

    return updated;
  }
}

