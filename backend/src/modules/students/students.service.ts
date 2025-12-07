import { prisma } from '../../lib/prisma';
import { NotFoundError, ValidationError } from '../../lib/errors';

export interface CreateStudentData {
  idNumber: string;
  firstName: string;
  lastName: string;
  gender: 'MALE' | 'FEMALE';
  grade: string; // י', י"א, י"ב, י"ג, י"ד
  parallel?: string;
  track?: string;
  cohortId: number;
  // Additional fields
  dateOfBirth?: Date;
  email?: string;
  aliyahDate?: Date;
  locality?: string;
  address?: string;
  address2?: string;
  locality2?: string;
  phone?: string;
  mobilePhone?: string;
  parent1IdNumber?: string;
  parent1FirstName?: string;
  parent1LastName?: string;
  parent1Type?: string;
  parent1Mobile?: string;
  parent1Email?: string;
  parent2IdNumber?: string;
  parent2FirstName?: string;
  parent2LastName?: string;
  parent2Type?: string;
  parent2Mobile?: string;
  parent2Email?: string;
}

export interface UpdateStudentData {
  firstName?: string;
  lastName?: string;
  gender?: 'MALE' | 'FEMALE';
  grade?: string;
  parallel?: string;
  track?: string;
  cohortId?: number;
  status?: 'ACTIVE' | 'GRADUATED' | 'LEFT' | 'ARCHIVED';
  // Additional fields
  dateOfBirth?: Date;
  email?: string;
  aliyahDate?: Date;
  locality?: string;
  address?: string;
  address2?: string;
  locality2?: string;
  phone?: string;
  mobilePhone?: string;
  parent1IdNumber?: string;
  parent1FirstName?: string;
  parent1LastName?: string;
  parent1Type?: string;
  parent1Mobile?: string;
  parent1Email?: string;
  parent2IdNumber?: string;
  parent2FirstName?: string;
  parent2LastName?: string;
  parent2Type?: string;
  parent2Mobile?: string;
  parent2Email?: string;
}

export class StudentsService {
  /**
   * Create a new student
   */
  async create(data: CreateStudentData) {
    // Check if ID number already exists
    const existing = await (prisma as any).student.findUnique({
      where: { idNumber: data.idNumber },
    });

    if (existing) {
      throw new ValidationError('Student with this ID number already exists');
    }

    // Verify cohort exists
    const cohort = await (prisma as any).cohort.findUnique({
      where: { id: data.cohortId },
    });

    if (!cohort) {
      throw new NotFoundError('Cohort');
    }

    return (prisma as any).student.create({
      data: {
        idNumber: data.idNumber,
        firstName: data.firstName,
        lastName: data.lastName,
        gender: data.gender,
        grade: data.grade,
        parallel: data.parallel,
        track: data.track,
        cohortId: data.cohortId,
        status: 'ACTIVE',
      },
      include: {
        cohort: true,
      },
    });
  }

  /**
   * Get all students
   */
  async getAll(filters?: {
    status?: string;
    grade?: string;
    cohortId?: number;
    gender?: string;
  }) {
    const where: any = {};
    
    if (filters?.status) {
      where.status = filters.status;
    }
    if (filters?.grade) {
      where.grade = filters.grade;
    }
    if (filters?.cohortId) {
      where.cohortId = filters.cohortId;
    }
    if (filters?.gender) {
      where.gender = filters.gender;
    }

    return (prisma as any).student.findMany({
      where,
      include: {
        cohort: true,
        exitRecord: true,
      },
      orderBy: [
        { lastName: 'asc' },
        { firstName: 'asc' },
      ],
    });
  }

  /**
   * Get student by ID
   */
  async getById(id: number) {
    const student = await (prisma as any).student.findUnique({
      where: { id },
      include: {
        cohort: true,
        exitRecord: true,
      },
    });

    if (!student) {
      throw new NotFoundError('Student');
    }

    return student;
  }

  /**
   * Get student by ID number
   */
  async getByIdNumber(idNumber: string) {
    const student = await (prisma as any).student.findUnique({
      where: { idNumber },
      include: {
        cohort: true,
        exitRecord: true,
      },
    });

    if (!student) {
      throw new NotFoundError('Student');
    }

    return student;
  }

  /**
   * Update student
   */
  async update(id: number, data: UpdateStudentData) {
    const student = await (prisma as any).student.findUnique({
      where: { id },
    });

    if (!student) {
      throw new NotFoundError('Student');
    }

    // If cohort is being changed, verify it exists
    if (data.cohortId) {
      const cohort = await (prisma as any).cohort.findUnique({
        where: { id: data.cohortId },
      });

      if (!cohort) {
        throw new NotFoundError('Cohort');
      }
    }

    return (prisma as any).student.update({
      where: { id },
      data,
      include: {
        cohort: true,
        exitRecord: true,
      },
    });
  }

  /**
   * Delete student (soft delete - archive)
   */
  async delete(id: number) {
    if (!id || isNaN(Number(id)) || Number(id) <= 0) {
      throw new ValidationError('Invalid student ID');
    }

    const numericId = Number(id);
    const student = await (prisma as any).student.findUnique({
      where: { id: numericId },
    });

    if (!student) {
      throw new NotFoundError('Student');
    }

    // Archive instead of hard delete
    return (prisma as any).student.update({
      where: { id: numericId },
      data: {
        status: 'ARCHIVED',
      },
      include: {
        cohort: true,
        exitRecord: true,
      },
    });
  }

  /**
   * Promote all students in a cohort to next grade
   */
  async promoteCohort(cohortId: number) {
    const cohort = await (prisma as any).cohort.findUnique({
      where: { id: cohortId },
    });

    if (!cohort) {
      throw new NotFoundError('Cohort');
    }

    // Grade progression: ט' -> י' -> י"א -> י"ב (י"ב מסיים, י"ג-י"ד נכנסים ידנית)
    const gradeProgression: Record<string, string | null> = {
      'ט\'': 'י\'',
      'י\'': 'י"א',
      'י"א': 'י"ב',
      'י"ב': null, // י"ב is the final grade - students graduate (unless manually added to י"ג-י"ד)
      // י"ג and י"ד are not in automatic progression - students must be manually added
    };

    const nextGrade = gradeProgression[cohort.currentGrade];
    if (!nextGrade) {
      throw new ValidationError(`Cannot promote from grade ${cohort.currentGrade}`);
    }

    // Update cohort's current grade
    await (prisma as any).cohort.update({
      where: { id: cohortId },
      data: { currentGrade: nextGrade },
    });

    // Update all active students in this cohort
    return (prisma as any).student.updateMany({
      where: {
        cohortId,
        status: 'ACTIVE',
      },
      data: {
        grade: nextGrade,
      },
    });
  }

  /**
   * Promote all active cohorts to next grade (annual promotion on 01.09)
   * Each student is promoted one grade based on their current grade
   * IMPORTANT: This processes ALL active students regardless of cohort
   */
  async promoteAllCohorts() {
    const results = {
      promoted: 0,
      graduated: 0,
      skipped: 0,
      errors: [] as Array<{ studentId?: number; error: string }>,
    };

    // Grade progression: each student moves one grade up
    const gradeProgression: Record<string, string | null> = {
      'ט\'': 'י\'',
      'י\'': 'י"א',
      'י"א': 'י"ב',
      'י"ב': null, // י"ב is the final grade - students graduate
      // י"ג and י"ד are not in automatic progression - they stay as is
    };

    try {
      // Get ALL active students (not just by cohort)
      const allActiveStudents = await (prisma as any).student.findMany({
        where: {
          status: 'ACTIVE',
        },
        include: {
          cohort: true,
        },
      });

      console.log(`Found ${allActiveStudents.length} active students to process`);

      // Process each student individually based on their current grade
      for (const student of allActiveStudents) {
        try {
          const currentGrade = student.grade;
          const nextGrade = gradeProgression[currentGrade];
          
          if (nextGrade === undefined) {
            // Grade not in progression (e.g., י"ג, י"ד) - skip
            console.log(`Skipping student ${student.id} (${student.firstName} ${student.lastName}) - grade ${currentGrade} not in automatic progression`);
            results.skipped++;
            continue;
          }
          
          if (nextGrade === null) {
            // Student is in final grade (י"ב) - mark as graduated
            await (prisma as any).student.update({
              where: { id: student.id },
              data: { status: 'GRADUATED' },
            });
            console.log(`Graduated student ${student.id} (${student.firstName} ${student.lastName}) from grade ${currentGrade}`);
            results.graduated++;
          } else {
            // Promote student to next grade
            await (prisma as any).student.update({
              where: { id: student.id },
              data: { grade: nextGrade },
            });
            console.log(`Promoted student ${student.id} (${student.firstName} ${student.lastName}) from ${currentGrade} to ${nextGrade}`);
            results.promoted++;
          }
        } catch (error: any) {
          console.error(`Error promoting student ${student.id}:`, error);
          results.errors.push({
            studentId: student.id,
            error: error.message || 'Unknown error',
          });
        }
      }

      // Update all cohorts' current grade based on their students
      const activeCohorts = await (prisma as any).cohort.findMany({
        where: {
          isActive: true,
        },
      });

      for (const cohort of activeCohorts) {
        try {
          const cohortStudents = await (prisma as any).student.findMany({
            where: {
              cohortId: cohort.id,
              status: 'ACTIVE',
            },
            select: { grade: true },
          });

          if (cohortStudents.length > 0) {
            // Find the most common grade
            const gradeCounts: Record<string, number> = {};
            cohortStudents.forEach((s: any) => {
              gradeCounts[s.grade] = (gradeCounts[s.grade] || 0) + 1;
            });

            const grades = ['ט\'', 'י\'', 'י"א', 'י"ב', 'י"ג', 'י"ד'];
            let mostCommonGrade = 'ט\'';
            let maxCount = 0;

            for (const grade of grades) {
              if (gradeCounts[grade] && gradeCounts[grade] > maxCount) {
                maxCount = gradeCounts[grade];
                mostCommonGrade = grade;
              }
            }

            await (prisma as any).cohort.update({
              where: { id: cohort.id },
              data: { currentGrade: mostCommonGrade },
            });
          }
        } catch (error: any) {
          console.error(`Error updating cohort ${cohort.id}:`, error);
          results.errors.push({
            error: `Cohort ${cohort.id}: ${error.message || 'Unknown error'}`,
          });
        }
      }
    } catch (error: any) {
      console.error('Error in promoteAllCohorts:', error);
      results.errors.push({
        error: error.message || 'Unknown error',
      });
    }

    return results;
  }

  /**
   * Delete all students (for testing purposes)
   * WARNING: This permanently deletes all students from the database
   */
  async deleteAll() {
    try {
      console.log('deleteAll service - starting deleteMany');
      const result = await (prisma as any).student.deleteMany({});
      console.log(`deleteAll service - deleted ${result.count} students`);
      return {
        deleted: result.count,
      };
    } catch (error: any) {
      console.error('Error in deleteAll service:', error);
      throw error;
    }
  }
}

