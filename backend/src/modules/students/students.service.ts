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
  cohortId: number; // Required - cohort with startYear
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
   */
  private async findOrCreateClass(
    grade: string,
    parallel: string | undefined,
    track: string | undefined,
    academicYear: number
  ) {
    // When track or parallel is null, we can't use findUnique with the composite key
    // Use findFirst instead to handle null values properly
    const existingClass = await prisma.class.findFirst({
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
    return prisma.class.create({
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
   */
  async create(data: CreateStudentData) {
    // Check if ID number already exists
    const existing = await prisma.student.findUnique({
      where: { idNumber: data.idNumber },
    });

    if (existing) {
      throw new ValidationError('Student with this ID number already exists');
    }

    // Verify cohort exists
    const cohort = await prisma.cohort.findUnique({
      where: { id: data.cohortId },
    });

    if (!cohort) {
      throw new NotFoundError('Cohort');
    }

    const academicYear = data.academicYear || this.getCurrentAcademicYear();

    // Create student
    const student = await prisma.student.create({
      data: {
        idNumber: data.idNumber,
        firstName: data.firstName,
        lastName: data.lastName,
        gender: data.gender,
        // Keep deprecated fields for backward compatibility during migration
        grade: data.grade,
        parallel: data.parallel,
        track: data.track,
        cohortId: data.cohortId,
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

    // Create enrollment record
    const classRecord = await this.findOrCreateClass(
      data.grade,
      data.parallel,
      data.track,
      academicYear
    );

    await prisma.enrollment.create({
      data: {
        studentId: student.id,
        classId: classRecord.id,
        enrollmentDate: new Date(),
      },
    });

    // Return student with enrollment data
    return prisma.student.findUnique({
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
    const { retryPrismaOperation } = await import('../../lib/prisma-retry');
    
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
    const { retryPrismaOperation } = await import('../../lib/prisma-retry');
    
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
      // י"ג and י"ד are not in automatic progression - they stay as is
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

      console.log(`Found ${studentsWithPreviousEnrollment.length} active students to process`);

      // Process each student individually based on their current enrollment
      for (const student of studentsWithPreviousEnrollment) {
        try {
          const currentEnrollment = student.enrollments?.[0];
          if (!currentEnrollment) {
            // No enrollment found for previous year - skip
            console.log(`Skipping student ${student.id} (${student.firstName} ${student.lastName}) - no enrollment found for academic year ${previousAcademicYear}`);
            results.skipped++;
            continue;
          }

          const currentClass = currentEnrollment.class;
          const currentGrade = currentClass.grade;
          const nextGrade = gradeProgression[currentGrade];
          
          if (nextGrade === undefined) {
            // Grade not in progression (e.g., י"ג, י"ד) - skip
            console.log(`Skipping student ${student.id} (${student.firstName} ${student.lastName}) - grade ${currentGrade} not in automatic progression`);
            results.skipped++;
            continue;
          }
          
          if (nextGrade === null) {
            // Student is in final grade (י"ב) - mark as graduated
            await prisma.student.update({
              where: { id: student.id },
              data: { status: 'GRADUATED' },
            });
            console.log(`Graduated student ${student.id} (${student.firstName} ${student.lastName}) from grade ${currentGrade}`);
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

            const grades = ['ט\'', 'י\'', 'י"א', 'י"ב', 'י"ג', 'י"ד'];
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
      const result = await prisma.student.deleteMany({});
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

