import * as XLSX from 'xlsx';
import { prisma } from '../../lib/database/prisma';
import { ValidationError } from '../../lib/utils/errors';
import { StudentsService } from './students.service';

export interface ExcelStudentRow {
  'מספר ת.ז'?: string | number;
  'ת.ז'?: string | number;
  'שם פרטי'?: string;
  'שם משפחה'?: string;
  'מין'?: string;
  'כיתה'?: string;
  'מקבילה'?: string;
  'מגמה'?: string;
  'מחזור'?: string | number;
  'תאריך לידה'?: string | number | Date;
  'דואר אלקטרוני'?: string;
  'תאריך עליה'?: string | number | Date;
  'יישוב'?: string;
  'כתובת'?: string;
  'יישוב 2'?: string;
  'כתובת 2'?: string;
  'טלפון'?: string | number;
  'טלפון נייד'?: string | number;
  'ת.ז הורים 1'?: string | number;
  'שם פרטי הורים 1'?: string;
  'שם משפחה הורים 1'?: string;
  'סוג הורים 1'?: string;
  'טלפון נייד הורים 1'?: string | number;
  'דואר אלקטרוני הורים 1'?: string;
  'ת.ז הורים 2'?: string | number;
  'שם פרטי הורים 2'?: string;
  'שם משפחה הורים 2'?: string;
  'סוג הורים 2'?: string;
  'טלפון נייד הורים 2'?: string | number;
  'דואר אלקטרוני הורים 2'?: string;
}

export class StudentsUploadService {
  private studentsService: StudentsService;

  constructor() {
    this.studentsService = new StudentsService();
  }

  /**
   * Get current academic year (same logic as StudentsService)
   */
  private getCurrentAcademicYear(): number {
    const now = new Date();
    return now.getFullYear();
  }

  /**
   * Find or create a Class record (same logic as StudentsService)
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
   * Parse Excel file and return array of student data
   * Supports multiple sheets (שכבה X) and starts from row 3
   */
  async parseExcelFile(buffer: Buffer): Promise<ExcelStudentRow[]> {
    try {
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const allStudents: ExcelStudentRow[] = [];

      // Process all sheets (each sheet is a "שכבה")
      for (const sheetName of workbook.SheetNames) {
        const worksheet = workbook.Sheets[sheetName];
        
        // Convert to JSON, starting from row 3 (skip header rows)
        // XLSX uses 0-based indexing, so row 3 is index 2
        const data = XLSX.utils.sheet_to_json<ExcelStudentRow>(worksheet, {
          range: 2, // Start from row 3 (0-indexed: 2)
          defval: null, // Use null for empty cells
        });

        allStudents.push(...data);
      }

      return allStudents;
    } catch (error) {
      throw new ValidationError('Failed to parse Excel file');
    }
  }

  /**
   * Normalize gender value
   */
  private normalizeGender(gender?: string): 'MALE' | 'FEMALE' | null {
    if (!gender) return null;
    const normalized = gender.trim().toUpperCase();
    if (normalized.includes('זכר') || normalized.includes('MALE') || normalized === 'ז' || normalized === 'M') {
      return 'MALE';
    }
    if (normalized.includes('נקבה') || normalized.includes('FEMALE') || normalized === 'נ' || normalized === 'F') {
      return 'FEMALE';
    }
    return null;
  }

  /**
   * Find or create cohort by name/year
   */
  private async findOrCreateCohort(cohortName?: string, startYear?: number): Promise<number> {
    if (!cohortName && !startYear) {
      throw new ValidationError('Cohort name or start year is required');
    }

    const year = startYear || new Date().getFullYear();
    
    // Validate startYear range: 1954 to current year + 1
    const currentYear = new Date().getFullYear();
    const minYear = 1954;
    const maxYear = currentYear + 1;
    
    if (year < minYear || year > maxYear) {
      throw new ValidationError(
        `שנת מחזור חייבת להיות בין ${minYear} ל-${maxYear}. התקבל: ${year}`
      );
    }
    
    const name = cohortName || `מחזור ${year}`;

    // Try to find existing cohort
    let cohort = null;
    try {
      cohort = await prisma.cohort.findFirst({
        where: {
          OR: [
            { name: name },
            { startYear: year },
          ],
        },
      });
    } catch (error: any) {
      console.error('Error finding cohort:', error);
      // If Prisma crashes, create a new cohort
      cohort = null;
    }

    if (!cohort) {
      // Create new cohort with default grade (ט')
      cohort = await prisma.cohort.create({
        data: {
          name: name,
          startYear: year,
          currentGrade: 'ט\'',
          isActive: true,
        },
      });
    }

    return cohort.id;
  }

  /**
   * Process Excel data and create/update students
   * Uses batch processing for better performance with large files
   */
  async processExcelData(rows: ExcelStudentRow[], batchSize: number = 50): Promise<{
    created: number;
    updated: number;
    errors: Array<{ row: number; error: string }>;
  }> {
    let created = 0;
    let updated = 0;
    const errors: Array<{ row: number; error: string }> = [];

    // Process in batches for better performance and memory management
    for (let batchStart = 0; batchStart < rows.length; batchStart += batchSize) {
      const batchEnd = Math.min(batchStart + batchSize, rows.length);
      const batch = rows.slice(batchStart, batchEnd);

      // Process batch
      for (let i = 0; i < batch.length; i++) {
        const globalIndex = batchStart + i;
        const row = batch[i];
        const rowNumber = globalIndex + 3; // +3 because Excel starts at row 1, we skip rows 1-2, so data starts at row 3

        try {
        // Get ID number (support both column names)
        const idNumber = String(row['מספר ת.ז'] || row['ת.ז'] || '').trim();
        const firstName = String(row['שם פרטי'] || '').trim();
        const lastName = String(row['שם משפחה'] || '').trim();
        const grade = String(row['כיתה'] || '').trim();
        const parallel = row['מקבילה'] ? String(row['מקבילה']).trim() : null;
        const track = row['מגמה'] ? String(row['מגמה']).trim() : null;
        const gender = this.normalizeGender(row['מין']);

        // Validate required fields
        if (!idNumber) {
          errors.push({ row: rowNumber, error: 'Missing ID number' });
          continue;
        }

        if (!firstName || !lastName) {
          errors.push({ row: rowNumber, error: 'Missing first or last name' });
          continue;
        }

        if (!gender) {
          errors.push({ row: rowNumber, error: 'Invalid or missing gender' });
          continue;
        }

        if (!grade) {
          errors.push({ row: rowNumber, error: 'Missing grade' });
          continue;
        }

        // Parse dates
        const parseDate = (dateValue: any): Date | null => {
          if (!dateValue) return null;
          if (dateValue instanceof Date) return dateValue;
          if (typeof dateValue === 'number') {
            // Excel date serial number
            const excelEpoch = new Date(1899, 11, 30);
            return new Date(excelEpoch.getTime() + dateValue * 24 * 60 * 60 * 1000);
          }
          if (typeof dateValue === 'string') {
            const parsed = new Date(dateValue);
            return isNaN(parsed.getTime()) ? null : parsed;
          }
          return null;
        };

        // Find or create cohort based on grade (extract year from current year)
        // If grade is ט', assume current year, if י' assume last year, etc.
        const currentYear = new Date().getFullYear();
        let cohortYear = currentYear;
        if (grade.includes('י\'') && !grade.includes('י"א') && !grade.includes('י"ב')) {
          cohortYear = currentYear - 1;
        } else if (grade.includes('י"א')) {
          cohortYear = currentYear - 2;
        } else if (grade.includes('י"ב')) {
          cohortYear = currentYear - 3;
        }
        // ט' stays as current year

        const cohortId = await this.findOrCreateCohort(
          row['מחזור'] ? String(row['מחזור']).trim() : undefined,
          typeof row['מחזור'] === 'number' ? row['מחזור'] : cohortYear
        );

        // Get cohort to extract startYear for studyStartDate
        const cohort = await prisma.cohort.findUnique({
          where: { id: cohortId },
          select: { startYear: true },
        });

        // Use cohort startYear (September 1st) as studyStartDate, or current date as fallback
        const studyStartDate = cohort 
          ? new Date(cohort.startYear, 8, 1) // September 1st of cohort year
          : new Date();

        // Check if student exists
        const existing = await prisma.student.findUnique({
          where: { idNumber },
        });

        const academicYear = this.getCurrentAcademicYear();

        const studentData: any = {
          idNumber,
          firstName,
          lastName,
          gender,
          grade,
          parallel,
          track,
          cohortId,
          studyStartDate, // Required: date when student started studying
          academicYear,
          // Additional fields
          dateOfBirth: parseDate(row['תאריך לידה']),
          email: row['דואר אלקטרוני'] ? String(row['דואר אלקטרוני']).trim() : null,
          aliyahDate: parseDate(row['תאריך עליה']),
          locality: row['יישוב'] ? String(row['יישוב']).trim() : null,
          address: row['כתובת'] ? String(row['כתובת']).trim() : null,
          address2: row['כתובת 2'] ? String(row['כתובת 2']).trim() : null,
          locality2: row['יישוב 2'] ? String(row['יישוב 2']).trim() : null,
          phone: row['טלפון'] ? String(row['טלפון']).trim() : null,
          mobilePhone: row['טלפון נייד'] ? String(row['טלפון נייד']).trim() : null,
          // Parent 1
          parent1IdNumber: row['ת.ז הורים 1'] ? String(row['ת.ז הורים 1']).trim() : null,
          parent1FirstName: row['שם פרטי הורים 1'] ? String(row['שם פרטי הורים 1']).trim() : null,
          parent1LastName: row['שם משפחה הורים 1'] ? String(row['שם משפחה הורים 1']).trim() : null,
          parent1Type: row['סוג הורים 1'] ? String(row['סוג הורים 1']).trim() : null,
          parent1Mobile: row['טלפון נייד הורים 1'] ? String(row['טלפון נייד הורים 1']).trim() : null,
          parent1Email: row['דואר אלקטרוני הורים 1'] ? String(row['דואר אלקטרוני הורים 1']).trim() : null,
          // Parent 2
          parent2IdNumber: row['ת.ז הורים 2'] ? String(row['ת.ז הורים 2']).trim() : null,
          parent2FirstName: row['שם פרטי הורים 2'] ? String(row['שם פרטי הורים 2']).trim() : null,
          parent2LastName: row['שם משפחה הורים 2'] ? String(row['שם משפחה הורים 2']).trim() : null,
          parent2Type: row['סוג הורים 2'] ? String(row['סוג הורים 2']).trim() : null,
          parent2Mobile: row['טלפון נייד הורים 2'] ? String(row['טלפון נייד הורים 2']).trim() : null,
          parent2Email: row['דואר אלקטרוני הורים 2'] ? String(row['דואר אלקטרוני הורים 2']).trim() : null,
        };

        if (existing) {
          // Update existing student using StudentsService to ensure Enrollment is created
          const updateData: any = {};
          Object.keys(studentData).forEach(key => {
            if (key !== 'idNumber' && key !== 'academicYear' && studentData[key] !== null && studentData[key] !== undefined) {
              updateData[key] = studentData[key];
            }
          });
          // Always update cohortId if provided
          if (studentData.cohortId) {
            updateData.cohortId = studentData.cohortId;
          }
          
          // If grade/parallel/track is provided, include academicYear for enrollment
          if (grade) {
            updateData.grade = grade;
            updateData.parallel = parallel;
            updateData.track = track;
            updateData.academicYear = academicYear;
          }
          
          await this.studentsService.update(existing.id, updateData);
          updated++;
        } else {
          // Create new student using StudentsService to ensure Enrollment is created
          await this.studentsService.create(studentData);
          created++;
        }
        } catch (error: any) {
          errors.push({
            row: rowNumber,
            error: error.message || 'Unknown error',
          });
        }
      }

      // Log progress for large files (every 100 rows)
      if (batchEnd % 100 === 0 || batchEnd === rows.length) {
        console.log(`Processing: ${batchEnd}/${rows.length} rows (${Math.round((batchEnd / rows.length) * 100)}%)`);
      }
    }

    return { created, updated, errors };
  }
}

