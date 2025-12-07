import * as XLSX from 'xlsx';
import { prisma } from '../../lib/prisma';
import { ValidationError } from '../../lib/errors';

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
    const name = cohortName || `מחזור ${year}`;

    // Try to find existing cohort
    let cohort = null;
    try {
      cohort = await (prisma as any).cohort.findFirst({
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
      cohort = await (prisma as any).cohort.create({
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
   */
  async processExcelData(rows: ExcelStudentRow[]): Promise<{
    created: number;
    updated: number;
    errors: Array<{ row: number; error: string }>;
  }> {
    let created = 0;
    let updated = 0;
    const errors: Array<{ row: number; error: string }> = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNumber = i + 3; // +3 because Excel starts at row 1, we skip rows 1-2, so data starts at row 3

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

        // Check if student exists
        const existing = await (prisma as any).student.findUnique({
          where: { idNumber },
        });

        const studentData: any = {
          idNumber,
          firstName,
          lastName,
          gender,
          grade,
          parallel,
          track,
          cohortId,
          status: 'ACTIVE' as const,
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

        // Remove null values for update (keep existing values)
        if (existing) {
          // Update existing student - only update provided fields
          const updateData: any = {};
          Object.keys(studentData).forEach(key => {
            if (key !== 'idNumber' && key !== 'cohortId' && studentData[key] !== null && studentData[key] !== undefined) {
              updateData[key] = studentData[key];
            }
          });
          // Always update cohortId if provided
          if (studentData.cohortId) {
            updateData.cohortId = studentData.cohortId;
          }
          
          await (prisma as any).student.update({
            where: { id: existing.id },
            data: updateData,
          });
          updated++;
        } else {
          // Create new student - all fields
          await (prisma as any).student.create({
            data: studentData,
          });
          created++;
        }
      } catch (error: any) {
        errors.push({
          row: rowNumber,
          error: error.message || 'Unknown error',
        });
      }
    }

    return { created, updated, errors };
  }
}

