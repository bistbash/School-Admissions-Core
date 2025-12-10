import { prisma } from '../../lib/database/prisma';
import { NotFoundError, ValidationError } from '../../lib/utils/errors';
import { logger } from '../../lib/utils/logger';
import { PrismaClient } from '@prisma/client';
import { generateCohortName } from '../cohorts/cohorts.service';

export interface CreateStudentData {
  idNumber: string;
  firstName: string;
  lastName: string;
  gender: 'MALE' | 'FEMALE';
  grade?: string; // ט', י', י"א, י"ב - optional, will be calculated from cohort if not provided
  parallel?: string;
  track?: string;
  cohortId?: number; // Optional - cohort ID (legacy)
  cohort?: string | number; // Optional - cohort as year (2024) or Gematria ("מחזור נ"ב" or "נ"ב")
  studyStartDate: Date | string; // Required - date when student started studying
  academicYear?: number; // Optional - defaults to current academic year
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
  academicYear?: number; // For class changes
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
   * Get current academic year (defaults to current calendar year)
   * In a real system, this might be configurable or based on a date range
   */
  private getCurrentAcademicYear(): number {
    const now = new Date();
    // Academic year typically starts in September, so if we're after September, use current year
    // Otherwise use previous year. For simplicity, using current year as default.
    return now.getFullYear();
  }

  /**
   * Find or create a Class record for the given grade/parallel/track combination
   * @param tx - Optional transaction client. If provided, all operations use the transaction.
   *             If not provided, uses the global prisma client.
   */
  private async findOrCreateClass(
    grade: string,
    parallel: string | undefined,
    track: string | undefined,
    academicYear: number,
    tx?: Parameters<Parameters<typeof prisma.$transaction>[0]>[0]
  ) {
    const client = tx || prisma;
    
    // When track or parallel is null, we can't use findUnique with the composite key
    // Use findFirst instead to handle null values properly
    const existingClass = await client.class.findFirst({
      where: {
        grade,
        parallel: parallel || null,
        track: track || null,
        academicYear,
      },
    });

    if (existingClass) {
      return existingClass;
    }

    // Create new class if it doesn't exist
    const className = [grade, parallel, track].filter(Boolean).join(' - ') || grade;
    return client.class.create({
      data: {
        grade,
        parallel: parallel || null,
        track: track || null,
        academicYear,
        name: className,
        isActive: true,
      },
    });
  }

  /**
   * Get student's current class enrollment (for the current academic year)
   */
  async getCurrentEnrollment(studentId: number, academicYear?: number) {
    const year = academicYear || this.getCurrentAcademicYear();
    return prisma.enrollment.findFirst({
      where: {
        studentId,
        class: {
          academicYear: year,
        },
      },
      include: {
        class: true,
      },
      orderBy: {
        enrollmentDate: 'desc',
      },
    });
  }

  /**
   * Get student's enrollment history
   */
  async getEnrollmentHistory(studentId: number) {
    return prisma.enrollment.findMany({
      where: {
        studentId,
      },
      include: {
        class: true,
      },
      orderBy: {
        enrollmentDate: 'desc',
      },
    });
  }

  /**
   * Create a new student
   * Uses transaction to ensure atomicity of student and enrollment creation
   * Supports automatic completion:
   * - If cohort is provided, calculates grade automatically
   * - If grade is provided, calculates cohort automatically
   * - Validates that cohort and grade match if both are provided
   */
  async create(data: CreateStudentData) {
    return prisma.$transaction(async (tx) => {
      // Check if ID number already exists
      const existing = await tx.student.findUnique({
        where: { idNumber: data.idNumber },
      });

      if (existing) {
        throw new ValidationError('Student with this ID number already exists');
      }

      // Import CohortsService for cohort operations
      const { CohortsService, parseCohortInput } = await import('../cohorts/cohorts.service');
      const cohortsService = new CohortsService();

      let cohortId: number;
      let finalGrade: string;

      // Determine cohort and grade with automatic completion
      if (data.cohort || data.cohortId) {
        // Cohort is provided (either as string/number or ID)
        let cohortStartYear: number;
        
        if (data.cohort) {
          // Parse cohort input (year or Gematria)
          cohortStartYear = parseCohortInput(data.cohort);
          cohortId = await cohortsService.findOrCreateCohortByInput(data.cohort);
        } else if (data.cohortId) {
          // Legacy: cohortId provided
          const cohort = await tx.cohort.findUnique({
            where: { id: data.cohortId },
          });
          if (!cohort) {
            throw new NotFoundError('Cohort');
          }
          cohortId = data.cohortId;
          cohortStartYear = cohort.startYear;
        } else {
          throw new ValidationError('Cohort is required');
        }

        // Calculate grade from cohort if not provided
        if (data.grade) {
          // Both provided - validate they match at the study start date
          const studyStartDate = data.studyStartDate instanceof Date 
            ? data.studyStartDate 
            : new Date(data.studyStartDate);
          
          // Validate against the grade at the study start date, not current grade
          const expectedGrade = cohortsService.calculateGradeAtDate(cohortStartYear, studyStartDate);
          if (data.grade !== expectedGrade) {
            const dateStr = studyStartDate.toISOString().split('T')[0];
            const cohortName = generateCohortName(cohortStartYear);
            throw new ValidationError(
              `המחזור והכיתה לא תואמים. ` +
              `${cohortName} בתאריך ${dateStr} אמור להיות בכיתה ${expectedGrade || 'לא פעיל'}, ` +
              `אבל הוזן ${data.grade}`
            );
          }
          finalGrade = data.grade;
        } else {
          // Only cohort provided - calculate grade at study start date
          const studyStartDate = data.studyStartDate instanceof Date 
            ? data.studyStartDate 
            : new Date(data.studyStartDate);
          finalGrade = cohortsService.calculateGradeAtDate(cohortStartYear, studyStartDate);
          if (!finalGrade) {
            const dateStr = studyStartDate.toISOString().split('T')[0];
            const cohortName = generateCohortName(cohortStartYear);
            throw new ValidationError(
              `${cohortName} לא היה פעיל בתאריך ${dateStr} (המחזור טרם התחיל או כבר הסתיים)`
            );
          }
        }
      } else if (data.grade) {
        // Only grade provided - calculate cohort
        const cohortStartYear = cohortsService.calculateCohortFromGrade(data.grade);
        cohortId = await cohortsService.findOrCreateCohortByInput(cohortStartYear);
        finalGrade = data.grade;
      } else {
        throw new ValidationError('נדרש לספק מחזור או כיתה (או שניהם)');
      }

      // Verify cohort exists (double check)
      const cohort = await tx.cohort.findUnique({
        where: { id: cohortId },
      });

      if (!cohort) {
        throw new NotFoundError('Cohort');
      }

      // Validate study start date if both cohort and grade are available
      if (finalGrade && cohort.startYear) {
        const studyStartDate = data.studyStartDate instanceof Date 
          ? data.studyStartDate 
          : new Date(data.studyStartDate);
        
        if (isNaN(studyStartDate.getTime())) {
          throw new ValidationError('תאריך התחלת לימודים לא תקין');
        }

        // First, check if the date is within the cohort's active period
        // Cohorts are active from ט' (start year) to י"ב (start year + 3)
        const cohortStartDate = new Date(cohort.startYear, 8, 1); // September 1st of start year (ט')
        const cohortEndDate = new Date(cohort.startYear + 3, 8, 1); // September 1st of start year + 3 (י"ב)
        
        if (studyStartDate < cohortStartDate) {
          const startDateStr = `${cohortStartDate.getDate().toString().padStart(2, '0')}.${(cohortStartDate.getMonth() + 1).toString().padStart(2, '0')}.${cohortStartDate.getFullYear()}`;
          const cohortName = generateCohortName(cohort.startYear);
          throw new ValidationError(
            `תאריך התחלת הלימודים שנבחר קודם לתחילת המחזור. ${cohortName} יתחיל ב-${startDateStr}`
          );
        } else if (studyStartDate >= cohortEndDate) {
          const endDateStr = `${cohortEndDate.getDate().toString().padStart(2, '0')}.${(cohortEndDate.getMonth() + 1).toString().padStart(2, '0')}.${cohortEndDate.getFullYear()}`;
          const cohortName = generateCohortName(cohort.startYear);
          throw new ValidationError(
            `תאריך התחלת הלימודים שנבחר לאחר סיום המחזור. ${cohortName} הסתיים ב-${endDateStr}`
          );
        }

        // Grade to number mapping
        const gradeToNumber: Record<string, number> = {
          'ט\'': 9,
          'י\'': 10,
          'י"א': 11,
          'י"ב': 12,
        };

        const gradeNumber = gradeToNumber[finalGrade];
        if (gradeNumber) {
          // Calculate the expected start date range
          // For cohort year X and grade ג':
          // - Grade ט' (9) → start date should be between Sept 1, X and Sept 1, X+1
          // - Grade י' (10) → start date should be between Sept 1, X+1 and Sept 1, X+2
          // Formula: yearsToAdd = gradeNumber - 9
          const yearsToAdd = gradeNumber - 9;
          const minYear = cohort.startYear + yearsToAdd;
          const maxYear = cohort.startYear + yearsToAdd + 1;

          const minDate = new Date(minYear, 8, 1); // September 1st (month is 0-indexed)
          const maxDate = new Date(maxYear, 8, 1); // September 1st of next year

          // Check if date is within range (inclusive of minDate, exclusive of maxDate)
          if (studyStartDate < minDate || studyStartDate >= maxDate) {
            const minDateStr = `${minDate.getDate().toString().padStart(2, '0')}.${(minDate.getMonth() + 1).toString().padStart(2, '0')}.${minDate.getFullYear()}`;
            const maxDateStr = `${maxDate.getDate().toString().padStart(2, '0')}.${(maxDate.getMonth() + 1).toString().padStart(2, '0')}.${maxDate.getFullYear()}`;
            
            throw new ValidationError(
              `תאריך התחלת לימודים חייב להיות בין ${minDateStr} ל-${maxDateStr} לפי ${generateCohortName(cohort.startYear)} והכיתה ${finalGrade}`
            );
          }
        }
      }

      const academicYear = data.academicYear || this.getCurrentAcademicYear();

      // Create student
      const student = await tx.student.create({
        data: {
          idNumber: data.idNumber,
          firstName: data.firstName,
          lastName: data.lastName,
          gender: data.gender,
          // Keep deprecated fields for backward compatibility during migration
          grade: finalGrade,
          parallel: data.parallel,
          track: data.track,
          cohortId: cohortId,
          studyStartDate: data.studyStartDate instanceof Date ? data.studyStartDate : new Date(data.studyStartDate),
          status: 'ACTIVE',
          // Additional fields
          dateOfBirth: data.dateOfBirth,
          email: data.email,
          aliyahDate: data.aliyahDate,
          locality: data.locality,
          address: data.address,
          address2: data.address2,
          locality2: data.locality2,
          phone: data.phone,
          mobilePhone: data.mobilePhone,
          parent1IdNumber: data.parent1IdNumber,
          parent1FirstName: data.parent1FirstName,
          parent1LastName: data.parent1LastName,
          parent1Type: data.parent1Type,
          parent1Mobile: data.parent1Mobile,
          parent1Email: data.parent1Email,
          parent2IdNumber: data.parent2IdNumber,
          parent2FirstName: data.parent2FirstName,
          parent2LastName: data.parent2LastName,
          parent2Type: data.parent2Type,
          parent2Mobile: data.parent2Mobile,
          parent2Email: data.parent2Email,
        },
      });

      // Create enrollment record atomically
      const classRecord = await this.findOrCreateClass(
        finalGrade,
        data.parallel,
        data.track,
        academicYear,
        tx
      );

      await tx.enrollment.create({
        data: {
          studentId: student.id,
          classId: classRecord.id,
          enrollmentDate: new Date(),
        },
      });

      logger.info({
        studentId: student.id,
        idNumber: data.idNumber,
        cohortId: cohortId,
      }, 'Student created with enrollment');

      // Return student with enrollment data
      return tx.student.findUnique({
        where: { id: student.id },
        include: {
          cohort: true,
          exitRecord: true,
          enrollments: {
            include: {
              class: true,
            },
            orderBy: {
              enrollmentDate: 'desc',
            },
          },
        },
      });
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
    academicYear?: number; // Filter by academic year for current enrollment
  }) {
    const where: any = {};
    
    if (filters?.status) {
      where.status = filters.status;
    }
    if (filters?.cohortId) {
      where.cohortId = filters.cohortId;
    }
    if (filters?.gender) {
      where.gender = filters.gender;
    }

    // If grade filter is provided, we need to filter by enrollment
    const academicYear = filters?.academicYear || this.getCurrentAcademicYear();
    let enrollmentFilter: any = undefined;
    if (filters?.grade) {
      enrollmentFilter = {
        class: {
          grade: filters.grade,
          academicYear: academicYear,
        },
      };
    }

    const students = await prisma.student.findMany({
      where,
      include: {
        cohort: true,
        exitRecord: true,
        enrollments: {
          include: {
            class: true,
          },
          orderBy: {
            enrollmentDate: 'desc',
          },
        },
      },
      orderBy: [
        { lastName: 'asc' },
        { firstName: 'asc' },
      ],
    });

    // Filter enrollments by academic year in JavaScript
    const studentsWithFilteredEnrollments = students.map((student: any) => ({
      ...student,
      enrollments: student.enrollments
        .filter((e: any) => {
          if (filters?.grade) {
            return e.class.academicYear === academicYear && e.class.grade === filters.grade;
          }
          return e.class.academicYear === academicYear;
        })
        .slice(0, 1), // Only get current enrollment
    }));

    // If grade filter is provided, filter students who have enrollment in that grade
    if (filters?.grade) {
      return studentsWithFilteredEnrollments.filter((s: any) => 
        s.enrollments && s.enrollments.length > 0
      );
    }

    return studentsWithFilteredEnrollments;
  }

  /**
   * Get student by ID
   * Includes retry logic to handle Prisma panics during high load
   * Uses separate queries to avoid complex nested queries that cause Prisma panics
   */
  async getById(id: number, includeHistory: boolean = true) {
    const { retryPrismaOperation } = await import('../../lib/database/prisma-retry');
    
    return retryPrismaOperation(async () => {
      // Fetch student with basic includes first (simpler query)
      const student = await prisma.student.findUnique({
        where: { id },
        include: {
          cohort: true,
          exitRecord: true,
        },
      });

      if (!student) {
        throw new NotFoundError('Student');
      }

      // Fetch enrollments separately to avoid complex nested queries that cause Prisma panics
      // This is more reliable than nested where clauses in includes
      let enrollments: any[] = [];
      if (includeHistory) {
        // Get all enrollments
        enrollments = await prisma.enrollment.findMany({
          where: { studentId: id },
          include: {
            class: true,
          },
          orderBy: {
            enrollmentDate: 'desc',
          },
        });
      } else {
        // Get only current academic year enrollment
        const currentYear = this.getCurrentAcademicYear();
        const allEnrollments = await prisma.enrollment.findMany({
          where: { studentId: id },
          include: {
            class: true,
          },
          orderBy: {
            enrollmentDate: 'desc',
          },
        });
        
          // Filter in JavaScript to avoid complex nested where clause
          enrollments = allEnrollments.filter(
            (e: any) => e.class.academicYear === currentYear
          ).slice(0, 1);
      }

      return {
        ...student,
        enrollments,
      };
    });
  }

  /**
   * Get student by ID number
   * Includes retry logic to handle Prisma panics during high load
   * Uses separate queries to avoid complex nested queries
   */
  async getByIdNumber(idNumber: string) {
    const { retryPrismaOperation } = await import('../../lib/database/prisma-retry');
    
    return retryPrismaOperation(async () => {
      // Fetch student with basic includes first (simpler query)
      const student = await prisma.student.findUnique({
        where: { idNumber },
        include: {
          cohort: true,
          exitRecord: true,
        },
      });

      if (!student) {
        throw new NotFoundError('Student');
      }

      // Fetch enrollments separately to avoid complex nested queries
      const enrollments = await prisma.enrollment.findMany({
        where: { studentId: student.id },
        include: {
          class: true,
        },
        orderBy: {
          enrollmentDate: 'desc',
        },
      });

      return {
        ...student,
        enrollments,
      };
    });
  }

  /**
   * Update student
   */
  async update(id: number, data: UpdateStudentData) {
    const student = await prisma.student.findUnique({
      where: { id },
    });

    if (!student) {
      throw new NotFoundError('Student');
    }

    // If cohort is being changed, verify it exists
    if (data.cohortId) {
      const cohort = await prisma.cohort.findUnique({
        where: { id: data.cohortId },
      });

      if (!cohort) {
        throw new NotFoundError('Cohort');
      }
    }

    // Prepare update data (excluding class-related fields that go to Enrollment)
    const updateData: any = {};
    if (data.firstName !== undefined) updateData.firstName = data.firstName;
    if (data.lastName !== undefined) updateData.lastName = data.lastName;
    if (data.gender !== undefined) updateData.gender = data.gender;
    if (data.cohortId !== undefined) updateData.cohortId = data.cohortId;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.dateOfBirth !== undefined) updateData.dateOfBirth = data.dateOfBirth;
    if (data.email !== undefined) updateData.email = data.email;
    if (data.aliyahDate !== undefined) updateData.aliyahDate = data.aliyahDate;
    if (data.locality !== undefined) updateData.locality = data.locality;
    if (data.address !== undefined) updateData.address = data.address;
    if (data.address2 !== undefined) updateData.address2 = data.address2;
    if (data.locality2 !== undefined) updateData.locality2 = data.locality2;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.mobilePhone !== undefined) updateData.mobilePhone = data.mobilePhone;
    if (data.parent1IdNumber !== undefined) updateData.parent1IdNumber = data.parent1IdNumber;
    if (data.parent1FirstName !== undefined) updateData.parent1FirstName = data.parent1FirstName;
    if (data.parent1LastName !== undefined) updateData.parent1LastName = data.parent1LastName;
    if (data.parent1Type !== undefined) updateData.parent1Type = data.parent1Type;
    if (data.parent1Mobile !== undefined) updateData.parent1Mobile = data.parent1Mobile;
    if (data.parent1Email !== undefined) updateData.parent1Email = data.parent1Email;
    if (data.parent2IdNumber !== undefined) updateData.parent2IdNumber = data.parent2IdNumber;
    if (data.parent2FirstName !== undefined) updateData.parent2FirstName = data.parent2FirstName;
    if (data.parent2LastName !== undefined) updateData.parent2LastName = data.parent2LastName;
    if (data.parent2Type !== undefined) updateData.parent2Type = data.parent2Type;
    if (data.parent2Mobile !== undefined) updateData.parent2Mobile = data.parent2Mobile;
    if (data.parent2Email !== undefined) updateData.parent2Email = data.parent2Email;

    // Keep deprecated fields for backward compatibility
    if (data.grade !== undefined) updateData.grade = data.grade;
    if (data.parallel !== undefined) updateData.parallel = data.parallel;
    if (data.track !== undefined) updateData.track = data.track;

    // Update student
    const updatedStudent = await prisma.student.update({
      where: { id },
      data: updateData,
    });

    // If class information (grade/parallel/track) is being updated, create new enrollment
    if (data.grade !== undefined || data.parallel !== undefined || data.track !== undefined) {
      const academicYear = data.academicYear || this.getCurrentAcademicYear();
      const grade = data.grade !== undefined ? data.grade : student.grade;
      const parallel = data.parallel !== undefined ? data.parallel : student.parallel;
      const track = data.track !== undefined ? data.track : student.track;

      if (grade) {
        // Convert null to undefined for findOrCreateClass
        const classRecord = await this.findOrCreateClass(
          grade, 
          parallel ?? undefined, 
          track ?? undefined, 
          academicYear
        );
        
        // Check if enrollment already exists for this class and year
        const existingEnrollment = await prisma.enrollment.findFirst({
          where: {
            studentId: id,
            classId: classRecord.id,
          },
        });

        if (!existingEnrollment) {
          // Create new enrollment record
          await prisma.enrollment.create({
            data: {
              studentId: id,
              classId: classRecord.id,
              enrollmentDate: new Date(),
            },
          });
        }
      }
    }

    // Return updated student with enrollment data
    return prisma.student.findUnique({
      where: { id },
      include: {
        cohort: true,
        exitRecord: true,
        enrollments: {
          include: {
            class: true,
          },
          orderBy: {
            enrollmentDate: 'desc',
          },
        },
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
    const student = await prisma.student.findUnique({
      where: { id: numericId },
    });

    if (!student) {
      throw new NotFoundError('Student');
    }

    // Archive instead of hard delete
    return prisma.student.update({
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
  async promoteCohort(cohortId: number, newAcademicYear?: number) {
    const cohort = await prisma.cohort.findUnique({
      where: { id: cohortId },
    });

    if (!cohort) {
      throw new NotFoundError('Cohort');
    }

    // Grade progression: ט' -> י' -> י"א -> י"ב (י"ב מסיים)
    const gradeProgression: Record<string, string | null> = {
      'ט\'': 'י\'',
      'י\'': 'י"א',
      'י"א': 'י"ב',
      'י"ב': null, // י"ב is the final grade - students graduate
    };

    const nextGrade = gradeProgression[cohort.currentGrade];
    if (!nextGrade) {
      throw new ValidationError(`Cannot promote from grade ${cohort.currentGrade}`);
    }

    const academicYear = newAcademicYear || this.getCurrentAcademicYear();

    // Update cohort's current grade
    await prisma.cohort.update({
      where: { id: cohortId },
      data: { currentGrade: nextGrade },
    });

    // Get all active students in this cohort with their enrollments
    const studentsRaw = await prisma.student.findMany({
      where: {
        cohortId,
        status: 'ACTIVE',
      },
      include: {
        enrollments: {
          include: {
            class: true,
          },
          orderBy: {
            enrollmentDate: 'desc',
          },
        },
      },
    });

    // Filter enrollments by previous academic year
    const students = studentsRaw.map((student: any) => ({
      ...student,
      enrollments: student.enrollments
        .filter((e: any) => e.class.academicYear === academicYear - 1)
        .slice(0, 1),
    }));

    let promoted = 0;
    let graduated = 0;

    // Promote each student by creating new enrollment
    for (const student of students) {
      const currentEnrollment = student.enrollments?.[0];
      if (!currentEnrollment) {
        // No previous enrollment found, skip
        continue;
      }

      const currentClass = currentEnrollment.class;
      const currentGrade = currentClass.grade;
      const nextGradeForStudent = gradeProgression[currentGrade];

      if (nextGradeForStudent === undefined) {
        // Grade not in progression - skip
        continue;
      }

          if (nextGradeForStudent === null) {
            // Student is in final grade - mark as graduated
            await prisma.student.update({
              where: { id: student.id },
              data: { status: 'GRADUATED' },
            });
            graduated++;
          } else {
            // Create new enrollment for next grade
            const newClass = await this.findOrCreateClass(
              nextGradeForStudent,
              currentClass.parallel,
              currentClass.track,
              academicYear
            );

            // Check if enrollment already exists
            const existingEnrollment = await prisma.enrollment.findFirst({
              where: {
                studentId: student.id,
                classId: newClass.id,
              },
            });

            if (!existingEnrollment) {
              await prisma.enrollment.create({
            data: {
              studentId: student.id,
              classId: newClass.id,
              enrollmentDate: new Date(),
            },
          });
        }

        // Update deprecated fields for backward compatibility
        await prisma.student.update({
          where: { id: student.id },
          data: {
            grade: nextGradeForStudent,
          },
        });
        promoted++;
      }
    }

    return { count: promoted + graduated, promoted, graduated };
  }

  /**
   * Promote all active cohorts to next grade (annual promotion on 01.09)
   * Each student is promoted one grade based on their current enrollment
   * IMPORTANT: This processes ALL active students regardless of cohort
   */
  async promoteAllCohorts(newAcademicYear?: number) {
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
    };

    const academicYear = newAcademicYear || this.getCurrentAcademicYear();
    const previousAcademicYear = academicYear - 1;

    try {
      // Get ALL active students with their enrollments
      const allActiveStudents = await prisma.student.findMany({
        where: {
          status: 'ACTIVE',
        },
        include: {
          cohort: true,
          enrollments: {
            include: {
              class: true,
            },
            orderBy: {
              enrollmentDate: 'desc',
            },
          },
        },
      });

      // Filter enrollments by previous academic year
      const studentsWithPreviousEnrollment = allActiveStudents.map((student: any) => ({
        ...student,
        enrollments: student.enrollments
          .filter((e: any) => e.class.academicYear === previousAcademicYear)
          .slice(0, 1),
      }));

      logger.info({ count: studentsWithPreviousEnrollment.length }, 'Processing students for promotion');

      // Process each student individually based on their current enrollment
      for (const student of studentsWithPreviousEnrollment) {
        try {
          const currentEnrollment = student.enrollments?.[0];
          if (!currentEnrollment) {
            // No enrollment found for previous year - skip
            logger.debug({ studentId: student.id, academicYear: previousAcademicYear }, 'Skipping student - no enrollment found');
            results.skipped++;
            continue;
          }

          const currentClass = currentEnrollment.class;
          const currentGrade = currentClass.grade;
          const nextGrade = gradeProgression[currentGrade];
          
          if (nextGrade === undefined) {
            // Grade not in progression - skip
            logger.debug({ studentId: student.id, grade: currentGrade }, 'Skipping student - grade not in automatic progression');
            results.skipped++;
            continue;
          }
          
          if (nextGrade === null) {
            // Student is in final grade (י"ב) - mark as graduated
            await prisma.student.update({
              where: { id: student.id },
              data: { status: 'GRADUATED' },
            });
            logger.info({ studentId: student.id, grade: currentGrade }, 'Student graduated');
            results.graduated++;
          } else {
            // Create new enrollment for next grade
            const newClass = await this.findOrCreateClass(
              nextGrade,
              currentClass.parallel,
              currentClass.track,
              academicYear
            );

            // Check if enrollment already exists
            const existingEnrollment = await prisma.enrollment.findFirst({
              where: {
                studentId: student.id,
                classId: newClass.id,
              },
            });

            if (!existingEnrollment) {
              await prisma.enrollment.create({
                data: {
                  studentId: student.id,
                  classId: newClass.id,
                  enrollmentDate: new Date(),
                },
              });
            }

            // Update deprecated fields for backward compatibility
            await prisma.student.update({
              where: { id: student.id },
              data: { grade: nextGrade },
            });
            logger.info({ studentId: student.id, fromGrade: currentGrade, toGrade: nextGrade }, 'Student promoted');
            results.promoted++;
          }
        } catch (error: any) {
          logger.error({ studentId: student.id, error: error.message }, 'Error promoting student');
          results.errors.push({
            studentId: student.id,
            error: error.message || 'Unknown error',
          });
        }
      }

      // Update all cohorts' current grade based on their students' current enrollments
      const activeCohorts = await prisma.cohort.findMany({
        where: {
          isActive: true,
        },
      });

      for (const cohort of activeCohorts) {
        try {
          const cohortStudentsRaw = await prisma.student.findMany({
            where: {
              cohortId: cohort.id,
              status: 'ACTIVE',
            },
            include: {
              enrollments: {
                include: {
                  class: true,
                },
                orderBy: {
                  enrollmentDate: 'desc',
                },
              },
            },
          });

          // Filter enrollments by current academic year
          const cohortStudents = cohortStudentsRaw.map((student: any) => ({
            ...student,
            enrollments: student.enrollments
              .filter((e: any) => e.class.academicYear === academicYear)
              .slice(0, 1),
          }));

          if (cohortStudents.length > 0) {
            // Find the most common grade from current enrollments
            const gradeCounts: Record<string, number> = {};
            cohortStudents.forEach((s: any) => {
              const enrollment = s.enrollments?.[0];
              if (enrollment) {
                const grade = enrollment.class.grade;
                gradeCounts[grade] = (gradeCounts[grade] || 0) + 1;
              }
            });

            const grades = ['ט\'', 'י\'', 'י"א', 'י"ב'];
            let mostCommonGrade = 'ט\'';
            let maxCount = 0;

            for (const grade of grades) {
              if (gradeCounts[grade] && gradeCounts[grade] > maxCount) {
                maxCount = gradeCounts[grade];
                mostCommonGrade = grade;
              }
            }

            await prisma.cohort.update({
              where: { id: cohort.id },
              data: { currentGrade: mostCommonGrade },
            });
          }
        } catch (error: any) {
          logger.error({ cohortId: cohort.id, error: error.message }, 'Error updating cohort');
          results.errors.push({
            error: `Cohort ${cohort.id}: ${error.message || 'Unknown error'}`,
          });
        }
      }
    } catch (error: any) {
      logger.error({ error: error.message }, 'Error in promoteAllCohorts');
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
      logger.warn('Starting deleteAll operation - this will delete all students');
      const result = await prisma.student.deleteMany({});
      logger.warn({ count: result.count }, 'deleteAll operation completed');
      return {
        deleted: result.count,
      };
    } catch (error: any) {
      logger.error({ error: error.message }, 'Error in deleteAll service');
      throw error;
    }
  }
}

