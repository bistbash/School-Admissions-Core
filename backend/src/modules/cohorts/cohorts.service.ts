import { prisma } from '../../lib/database/prisma';
import { NotFoundError, ValidationError } from '../../lib/utils/errors';

export interface CreateCohortData {
  name?: string; // Optional - will be auto-generated from startYear with correct Hebrew Gematria
  startYear: number;
  currentGrade?: string | null; // ט', י', י"א, י"ב, or null for next cohort
}

export interface UpdateCohortData {
  name?: string; // Will be validated against startYear's correct Gematria name
  currentGrade?: string;
  isActive?: boolean;
  // Note: startYear should not be updated directly - create a new cohort instead
  // If startYear needs to change, it's better to create a new cohort and migrate students
}

/**
 * Convert number to Hebrew Gematria (גימטריה)
 * Based on traditional Hebrew numbering system
 * Reference: https://www.m-math.co.il/4th-grade/count-a-b/
 */
function numberToGematria(num: number): string {
  if (num <= 0) {
    throw new ValidationError('מספר חייב להיות חיובי');
  }

  // Hebrew Gematria values
  const values = [
    { value: 400, letter: 'ת' },
    { value: 300, letter: 'ש' },
    { value: 200, letter: 'ר' },
    { value: 100, letter: 'ק' },
    { value: 90, letter: 'צ' },
    { value: 80, letter: 'פ' },
    { value: 70, letter: 'ע' },
    { value: 60, letter: 'ס' },
    { value: 50, letter: 'נ' },
    { value: 40, letter: 'מ' },
    { value: 30, letter: 'ל' },
    { value: 20, letter: 'כ' },
    { value: 10, letter: 'י' },
    { value: 9, letter: 'ט' },
    { value: 8, letter: 'ח' },
    { value: 7, letter: 'ז' },
    { value: 6, letter: 'ו' },
    { value: 5, letter: 'ה' },
    { value: 4, letter: 'ד' },
    { value: 3, letter: 'ג' },
    { value: 2, letter: 'ב' },
    { value: 1, letter: 'א' },
  ];

  let remaining = num;
  const parts: string[] = [];

  // Build the Gematria representation
  for (const { value, letter } of values) {
    if (remaining >= value) {
      const count = Math.floor(remaining / value);
      // For values >= 100, we can repeat letters (e.g., תת for 800)
      // For values < 100, we typically don't repeat
      if (value >= 100) {
        parts.push(letter.repeat(count));
      } else {
        parts.push(letter);
      }
      remaining = remaining % value;
    }
  }

  // Join parts according to Hebrew Gematria rules:
  // - Single letter: letter + ' (e.g., א', י', כ')
  // - Two or more letters: " between the last two letters, NO ' at the end (e.g., י"א, כ"ג, מע"ח)
  if (parts.length === 0) {
    return '';
  } else if (parts.length === 1) {
    return parts[0] + "'";
  } else {
    // Two or more letters: join all letters, put " between last two, NO ' at the end
    const allLetters = parts.join('');
    if (allLetters.length >= 2) {
      const beforeLastTwo = allLetters.slice(0, -2);
      const lastTwo = allLetters.slice(-2);
      return beforeLastTwo + lastTwo[0] + '"' + lastTwo[1];
    } else {
      return allLetters + "'";
    }
  }
}

/**
 * Generate cohort name from year using Hebrew Gematria
 * First cohort started in 1973 and was called "מחזור א'" (cohort number 1)
 * 
 * Examples:
 * 1973 -> מחזור א' (1)
 * 1974 -> מחזור ב' (2)
 * 1982 -> מחזור י' (10)
 * 1983 -> מחזור י"א (11)
 * 1984 -> מחזור י"ב (12)
 * 1992 -> מחזור כ' (20)
 * 1993 -> מחזור כ"א (21)
 */
export function generateCohortName(year: number): string {
  const FIRST_COHORT_YEAR = 1973;
  const cohortNumber = year - FIRST_COHORT_YEAR + 1; // 1973 = cohort 1, 1974 = cohort 2, etc.
  
  if (cohortNumber <= 0) {
    throw new ValidationError(`שנת מחזור חייבת להיות ${FIRST_COHORT_YEAR} או מאוחר יותר`);
  }

  const gematria = numberToGematria(cohortNumber);
  return `מחזור ${gematria}`;
}

/**
 * Validate that a cohort name matches the correct Gematria for a given startYear
 * Returns true if valid, throws ValidationError if invalid
 */
export function validateCohortName(name: string, startYear: number): boolean {
  const correctName = generateCohortName(startYear);
  if (name !== correctName) {
    throw new ValidationError(
      `שם המחזור "${name}" לא תואם לשנת ההתחלה ${startYear}. ` +
      `השם הנכון הוא: "${correctName}"`
    );
  }
  return true;
}

/**
 * Convert Hebrew Gematria string back to number
 * Examples: "א'" -> 1, "י"א" -> 11, "כ"ג" -> 23
 */
export function gematriaToNumber(gematria: string): number {
  // Remove common prefixes/suffixes
  let cleaned = gematria.trim();
  
  // Remove "מחזור " prefix if exists
  if (cleaned.startsWith('מחזור ')) {
    cleaned = cleaned.substring('מחזור '.length);
  }
  
  // Remove trailing ' or " if exists
  cleaned = cleaned.replace(/['"]$/, '');
  
  // Remove " between letters (e.g., י"א -> יא)
  cleaned = cleaned.replace(/"/g, '');
  
  // Hebrew Gematria values (same as in numberToGematria)
  const letterValues: Record<string, number> = {
    'ת': 400,
    'ש': 300,
    'ר': 200,
    'ק': 100,
    'צ': 90,
    'פ': 80,
    'ע': 70,
    'ס': 60,
    'נ': 50,
    'מ': 40,
    'ל': 30,
    'כ': 20,
    'י': 10,
    'ט': 9,
    'ח': 8,
    'ז': 7,
    'ו': 6,
    'ה': 5,
    'ד': 4,
    'ג': 3,
    'ב': 2,
    'א': 1,
  };
  
  let total = 0;
  let i = 0;
  
  while (i < cleaned.length) {
    const char = cleaned[i];
    const value = letterValues[char];
    
    if (!value) {
      throw new ValidationError(`אות לא תקינה בגימטריה: "${char}"`);
    }
    
    // For values >= 100, we can have multiple letters (e.g., תת for 800)
    // For values < 100, we typically don't repeat
    if (value >= 100) {
      // Count consecutive same letters
      let count = 0;
      while (i < cleaned.length && cleaned[i] === char) {
        count++;
        i++;
      }
      total += value * count;
    } else {
      total += value;
      i++;
    }
  }
  
  if (total <= 0) {
    throw new ValidationError(`לא ניתן להמיר את הגימטריה "${gematria}" למספר`);
  }
  
  return total;
}

/**
 * Parse cohort input (year number or Gematria string) to startYear
 * Examples:
 * - 2024 -> 2024
 * - "מחזור נ"ב" -> 2024 (if נ"ב is cohort 52, then 1973 + 52 - 1 = 2024)
 * - "נ"ב" -> 2024
 */
export function parseCohortInput(input: string | number): number {
  if (typeof input === 'number') {
    return input;
  }
  
  const cleaned = input.trim();
  
  // Try to parse as number first
  const asNumber = parseInt(cleaned, 10);
  if (!isNaN(asNumber) && asNumber.toString() === cleaned) {
    return asNumber;
  }
  
  // Try to parse as Gematria
  try {
    const cohortNumber = gematriaToNumber(cleaned);
    const FIRST_COHORT_YEAR = 1973;
    const startYear = FIRST_COHORT_YEAR + cohortNumber - 1;
    return startYear;
  } catch (error: any) {
    throw new ValidationError(
      `לא ניתן לזהות מחזור: "${input}". ` +
      `אנא הזן שנה (למשל: 2024) או גימטריה (למשל: "מחזור נ"ב" או "נ"ב")`
    );
  }
}

export class CohortsService {

  /**
   * Find cohort by input (year number or Gematria string) and return cohort ID
   * Creates cohort if it doesn't exist
   */
  async findOrCreateCohortByInput(input: string | number): Promise<number> {
    const startYear = parseCohortInput(input);
    return await this.ensureCohortExists(startYear);
  }

  /**
   * Calculate grade from cohort startYear
   * Returns the current grade that a cohort should have based on its startYear
   */
  calculateGradeFromCohort(startYear: number): string | null {
    const { currentGrade } = this.calculateCohortGradeAndStatus(startYear);
    return currentGrade;
  }

  /**
   * Calculate what grade a cohort was in at a specific date
   * This is used for validation when adding students with historical start dates
   * @param startYear - The cohort's start year
   * @param targetDate - The date to check (defaults to current date)
   * @returns The grade the cohort was in at that date, or null if not started yet
   */
  calculateGradeAtDate(startYear: number, targetDate: Date = new Date()): string | null {
    const targetYear = targetDate.getFullYear();
    const targetMonth = targetDate.getMonth() + 1; // 1-12
    const targetDay = targetDate.getDate();
    
    // Check if we're on or after September 1st of the target year
    const isAfterSeptember1st = targetMonth > 9 || (targetMonth === 9 && targetDay >= 1);
    
    // Calculate the academic year offset
    const academicYearOffset = isAfterSeptember1st ? 0 : 1;
    
    // Calculate years difference from the "target academic year"
    const academicStartYear = targetYear - academicYearOffset;
    const yearsDiff = academicStartYear - startYear;

    // Target academic year + 1 = NO GRADE (next cohort, hasn't started yet)
    if (yearsDiff === -1) {
      return null;
    }
    // Target academic year = ט' (1st year)
    if (yearsDiff === 0) {
      return 'ט\'';
    }
    // Target academic year - 1 = י' (2nd year)
    if (yearsDiff === 1) {
      return 'י\'';
    }
    // Target academic year - 2 = י"א (3rd year)
    if (yearsDiff === 2) {
      return 'י"א';
    }
    // Target academic year - 3 = י"ב (4th year, final grade)
    if (yearsDiff === 3) {
      return 'י"ב';
    }
    // Target academic year - 4 and older = י"ב (graduated)
    if (yearsDiff >= 4) {
      return 'י"ב';
    }
    
    // Before cohort started (yearsDiff < -1)
    return null;
  }

  /**
   * Calculate cohort startYear from grade
   * Given a grade, calculates what startYear a cohort should have to be in that grade now
   * Returns the most likely startYear (current academic year cohort for that grade)
   */
  calculateCohortFromGrade(grade: string): number {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // 1-12
    const currentDay = now.getDate();
    
    // Check if we're on or after September 1st
    const isAfterSeptember1st = currentMonth > 9 || (currentMonth === 9 && currentDay >= 1);
    const academicYearOffset = isAfterSeptember1st ? 0 : 1;
    const academicStartYear = currentYear - academicYearOffset;
    
    // Grade to years offset mapping
    const gradeOffsets: Record<string, number> = {
      'ט\'': 0,
      'י\'': 1,
      'י"א': 2,
      'י"ב': 3,
    };
    
    const offset = gradeOffsets[grade];
    if (offset === undefined) {
      throw new ValidationError(`כיתה לא תקינה: "${grade}"`);
    }
    
    // Calculate startYear: if grade is ט', cohort started this academic year
    // If grade is י', cohort started last academic year, etc.
    const startYear = academicStartYear - offset;
    
    // Validate range
    const minYear = 1973;
    const maxYear = currentYear + 1;
    if (startYear < minYear || startYear > maxYear) {
      throw new ValidationError(
        `לא ניתן לחשב מחזור מכיתה "${grade}" - התוצאה ${startYear} מחוץ לטווח המותר (${minYear}-${maxYear})`
      );
    }
    
    return startYear;
  }

  /**
   * Create a new cohort
   * Ensures professional management with correct Hebrew Gematria names and years
   */
  async create(data: CreateCohortData) {
    // Validate startYear range: 1973 (first cohort) to current year + 1
    const currentYear = new Date().getFullYear();
    const minYear = 1973;
    const maxYear = currentYear + 1;
    
    if (data.startYear < minYear || data.startYear > maxYear) {
      throw new ValidationError(
        `שנת מחזור חייבת להיות בין ${minYear} ל-${maxYear}. התקבל: ${data.startYear}`
      );
    }
    
    // Generate correct Gematria name based on startYear
    // Always use the correct name - ignore provided name to ensure consistency
    const correctName = generateCohortName(data.startYear);
    
    // Check if cohort with this startYear already exists
    const existingByYear = await (prisma as any).cohort.findFirst({
      where: { startYear: data.startYear },
    });

    if (existingByYear) {
      throw new ValidationError(`מחזור עם שנת התחלה ${data.startYear} כבר קיים (${existingByYear.name})`);
    }

    // Check if name already exists (different year)
    const existingByName = await (prisma as any).cohort.findUnique({
      where: { name: correctName },
    });

    if (existingByName) {
      throw new ValidationError(`מחזור עם השם ${correctName} כבר קיים (שנת התחלה: ${existingByName.startYear})`);
    }

    // If currentGrade is not provided, calculate it automatically
    // If currentGrade is explicitly null, it represents a future cohort (isActive: false)
    // If currentGrade is a string, use it with isActive: true
    let gradeAndStatus: { currentGrade: string | null; isActive: boolean };
    if (data.currentGrade === undefined) {
      // Not provided - calculate automatically based on startYear
      gradeAndStatus = this.calculateCohortGradeAndStatus(data.startYear);
    } else if (data.currentGrade === null) {
      // Explicitly null - future cohort, not active
      gradeAndStatus = { currentGrade: null, isActive: false };
    } else {
      // Explicitly provided string - use it with isActive: true
      gradeAndStatus = { currentGrade: data.currentGrade, isActive: true };
    }

    return (prisma as any).cohort.create({
      data: {
        name: correctName, // Always use correct Gematria name
        startYear: data.startYear,
        currentGrade: gradeAndStatus.currentGrade,
        isActive: gradeAndStatus.isActive,
      },
    });
  }

  /**
   * Get all cohorts
   * Returns only existing cohorts - no automatic creation
   * Use ensureCohortExists() or ensureAllCohortsExist() if you need to create/update cohorts
   */
  async getAll(filters?: { isActive?: boolean }) {
    const where: any = {};
    
    if (filters?.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    try {
      return await (prisma as any).cohort.findMany({
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
    } catch (error: any) {
      console.error('Error fetching cohorts:', error);
      // If there's an error, try without include to see if that's the issue
      return await (prisma as any).cohort.findMany({
        where,
        orderBy: {
          startYear: 'desc',
        },
      });
    }
  }

  /**
   * Ensure a specific cohort exists (lazy creation)
   * Creates the cohort if it doesn't exist, or updates it if it exists but needs updating
   * This is more efficient than ensureAllCohortsExist when you only need one cohort
   * 
   * @param startYear - The start year of the cohort (1973 to current year + 1)
   * @returns The cohort ID
   */
  async ensureCohortExists(startYear: number): Promise<number> {
    // Validate startYear range
    const currentYear = new Date().getFullYear();
    const minYear = 1973;
    const maxYear = currentYear + 1;
    
    if (startYear < minYear || startYear > maxYear) {
      throw new ValidationError(
        `שנת מחזור חייבת להיות בין ${minYear} ל-${maxYear}. התקבל: ${startYear}`
      );
    }

    const cohortName = generateCohortName(startYear);
    const { currentGrade, isActive } = this.calculateCohortGradeAndStatus(startYear);

    // Try to find existing cohort
    let cohort = await (prisma as any).cohort.findFirst({
      where: {
        OR: [
          { name: cohortName },
          { startYear: startYear },
        ],
      },
    });

    if (!cohort) {
      // Create new cohort
      cohort = await (prisma as any).cohort.create({
        data: {
          name: cohortName,
          startYear: startYear,
          currentGrade,
          isActive,
        },
      });
    } else {
      // Update existing cohort if needed
      // Always ensure name is correct (professional management with Hebrew Gematria)
      const nameNeedsUpdate = cohort.name !== cohortName;
      const gradeNeedsUpdate = cohort.currentGrade !== currentGrade;
      const statusNeedsUpdate = cohort.isActive !== isActive;
      
      const needsUpdate = nameNeedsUpdate || gradeNeedsUpdate || statusNeedsUpdate;

      if (needsUpdate) {
        const updateData: any = {
          isActive,
          currentGrade,
        };
        // Always update name to ensure correct Hebrew Gematria (professional management)
        if (nameNeedsUpdate) {
          updateData.name = cohortName;
        }
        
        cohort = await (prisma as any).cohort.update({
          where: { id: cohort.id },
          data: updateData,
        });
      }
    }

    return cohort.id;
  }

  /**
   * Calculate current grade and active status for a cohort based on its start year
   * Cohorts always start on September 1st (01.09.year)
   * 
   * Active cohorts: Last 4 cohorts (not including current year + 1)
   * י"ב is the last grade before graduation, so it must remain active until the next 01.09
   * - Current year = ט' (active)
   * - Current year - 1 = י' (active)
   * - Current year - 2 = י"א (active)
   * - Current year - 3 = י"ב (active - last active grade before graduation)
   * 
   * Next cohort (not active): Current year + 1 = NO GRADE (null) - will start next year, currently in selection
   * 
   * Inactive cohorts: Current year - 4 and older = י"ב (graduated, isActive = false)
   * 
   * Logic (if current date >= September 1st):
   * - Current year + 1 = null (next cohort, no grade yet, not active)
   * - Current year = ט' (active)
   * - Current year - 1 = י' (active)
   * - Current year - 2 = י"א (active)
   * - Current year - 3 = י"ב (active - last active grade)
   * - Current year - 4 = י"ב (inactive - graduated)
   * 
   * Logic (if current date < September 1st):
   * - Current year = null (next cohort, no grade yet, not active)
   * - Current year - 1 = ט' (active)
   * - Current year - 2 = י' (active)
   * - Current year - 3 = י"א (active)
   * - Current year - 4 = י"ב (active - last active grade)
   * - Current year - 5 = י"ב (inactive - graduated)
   */
  calculateCohortGradeAndStatus(startYear: number): { currentGrade: string | null; isActive: boolean } {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // 1-12 (January = 1, September = 9)
    const currentDay = now.getDate();
    
    // Check if we're on or after September 1st
    const isAfterSeptember1st = currentMonth > 9 || (currentMonth === 9 && currentDay >= 1);
    
    // Calculate the academic year offset
    // If we're after September 1st, the current year's cohort has started
    // If we're before September 1st, the current year's cohort hasn't started yet
    const academicYearOffset = isAfterSeptember1st ? 0 : 1;
    
    // Calculate years difference from the "current academic year"
    const academicStartYear = currentYear - academicYearOffset;
    const yearsDiff = academicStartYear - startYear;

    // Current academic year + 1 = NO GRADE (next cohort, NOT active - will start next year, in selection)
    if (yearsDiff === -1) {
      return { currentGrade: null, isActive: false };
    }
    // Current academic year = ט' (active - 1st of 4 active cohorts)
    if (yearsDiff === 0) {
      return { currentGrade: 'ט\'', isActive: true };
    }
    // Current academic year - 1 = י' (active - 2nd of 4 active cohorts)
    if (yearsDiff === 1) {
      return { currentGrade: 'י\'', isActive: true };
    }
    // Current academic year - 2 = י"א (active - 3rd of 4 active cohorts)
    if (yearsDiff === 2) {
      return { currentGrade: 'י"א', isActive: true };
    }
    // Current academic year - 3 = י"ב (active - 4th of 4 active cohorts, last active grade before graduation)
    if (yearsDiff === 3) {
      return { currentGrade: 'י"ב', isActive: true };
    }
    // Current academic year - 4 and older = י"ב (graduated, not active)
    return { currentGrade: 'י"ב', isActive: false };
  }

  /**
   * Ensure all possible cohorts exist (from 1973 to current year + 1)
   * Also updates currentGrade and isActive for ALL existing cohorts
   * This ensures that on September 1st, all cohorts automatically advance to the next grade
   * and new cohorts are created
   * 
   * IMPORTANT: This function is called automatically on every GET /api/cohorts request
   * to ensure data is always up-to-date. It's also called on server startup to initialize cohorts.
   * 
   * OPTIMIZED: Uses batch operations for better performance with large datasets
   */
  async ensureAllCohortsExist() {
    const currentYear = new Date().getFullYear();
    const minYear = 1973;
    const maxYear = currentYear + 1;
    const totalYears = maxYear - minYear + 1; // Total cohorts that should exist

    try {
      // Get all existing cohorts in one query (more efficient)
      const allCohorts = await (prisma as any).cohort.findMany({
        orderBy: { startYear: 'asc' },
      });

      // Create a map of existing cohorts by startYear for quick lookup
      const existingCohortsMap = new Map<number, any>();
      allCohorts.forEach((cohort: any) => {
        existingCohortsMap.set(cohort.startYear, cohort);
      });

      // Prepare batches for updates and creates
      const cohortsToUpdate: Array<{ id: number; data: any }> = [];
      const cohortsToCreate: Array<any> = [];

      // Process all required years (1973 to current year + 1)
      for (let year = minYear; year <= maxYear; year++) {
        const cohortName = generateCohortName(year);
        const { currentGrade, isActive } = this.calculateCohortGradeAndStatus(year);
        
        const existing = existingCohortsMap.get(year);

        if (!existing) {
          // Cohort doesn't exist - prepare for creation
          cohortsToCreate.push({
            name: cohortName,
            startYear: year,
            currentGrade,
            isActive,
          });
        } else {
          // Cohort exists - check if update is needed
          // Always ensure name is correct (professional management with Hebrew Gematria)
          const nameNeedsUpdate = existing.name !== cohortName;
          const gradeNeedsUpdate = existing.currentGrade !== currentGrade;
          const statusNeedsUpdate = existing.isActive !== isActive;
          
          const needsUpdate = nameNeedsUpdate || gradeNeedsUpdate || statusNeedsUpdate;

          if (needsUpdate) {
            const updateData: any = {
              isActive,
              currentGrade,
            };
            // Always update name to ensure correct Hebrew Gematria (professional management)
            if (nameNeedsUpdate) {
              updateData.name = cohortName;
            }
            
            cohortsToUpdate.push({
              id: existing.id,
              data: updateData,
            });
          }
        }
      }

      // Batch create missing cohorts
      if (cohortsToCreate.length > 0) {
        // SQLite doesn't support createMany with nested operations, so we'll create one by one
        // but we can use a transaction for atomicity
        await (prisma as any).$transaction(
          cohortsToCreate.map((cohortData) => 
            (prisma as any).cohort.create({ data: cohortData })
          ),
          {
            timeout: 30000, // 30 second timeout for large batch operations
          }
        );
        // Only log if significant number of cohorts were created (to avoid spam)
        if (cohortsToCreate.length > 5) {
          console.log(`✅ Created ${cohortsToCreate.length} missing cohorts (from ${minYear} to ${maxYear})`);
        }
      }

      // Batch update existing cohorts
      if (cohortsToUpdate.length > 0) {
        // Update in parallel batches (SQLite handles this better than sequential)
        const updatePromises = cohortsToUpdate.map(({ id, data }) =>
          (prisma as any).cohort.update({
            where: { id },
            data,
          }).catch((error: any) => {
            console.error(`Error updating cohort ${id}:`, error.message);
            return null; // Continue even if one update fails
          })
        );
        
        const results = await Promise.all(updatePromises);
        const successCount = results.filter(r => r !== null).length;
        const failedCount = results.length - successCount;
        
        // Only log if there were updates or failures
        if (successCount > 0) {
          // Only log if significant number of updates (avoid spam on every API call)
          if (cohortsToUpdate.length > 10 || failedCount > 0) {
            console.log(`✅ Updated ${successCount} cohorts with current grade/status${failedCount > 0 ? ` (${failedCount} failed)` : ''}`);
          }
        }
        
        if (failedCount > 0) {
          console.warn(`⚠️  ${failedCount} cohort update(s) failed`);
        }
      }

      // Verify final count (only log warnings if there's a mismatch)
      const finalCount = await (prisma as any).cohort.count({});
      if (finalCount < totalYears) {
        console.warn(`⚠️  Warning: Expected ${totalYears} cohorts, but found ${finalCount}. Some cohorts may be missing.`);
      } else if (finalCount > totalYears) {
        console.warn(`⚠️  Warning: Found ${finalCount} cohorts, but expected ${totalYears}. There may be duplicate or extra cohorts.`);
      }
      // Don't log success on every API call - only log if there were actual changes

    } catch (error: any) {
      console.error('Error in ensureAllCohortsExist:', error);
      throw error; // Re-throw to allow caller to handle
    }
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
   * Ensures professional management - automatically updates name if startYear changes
   */
  async update(id: number, data: UpdateCohortData) {
    const cohort = await (prisma as any).cohort.findUnique({
      where: { id },
    });

    if (!cohort) {
      throw new NotFoundError('Cohort');
    }

    // Prepare update data
    const updateData: any = { ...data };

    // If startYear is being updated, recalculate the correct Gematria name
    // Note: startYear is not in UpdateCohortData, but we handle it defensively
    // If someone tries to update startYear through direct Prisma, the name should be updated too
    // For now, we ensure name consistency by validating it matches the startYear
    
    // Validate that if name is provided, it matches the correct Gematria for startYear
    // This ensures professional management with correct Hebrew Gematria names
    if (data.name && cohort.startYear) {
      try {
        validateCohortName(data.name, cohort.startYear);
      } catch (error: any) {
        // If validation fails, automatically correct the name
        // This ensures consistency - we always use the correct Gematria name
        const correctName = generateCohortName(cohort.startYear);
        console.warn(
          `Cohort ${id}: Correcting name from "${data.name}" to "${correctName}" for startYear ${cohort.startYear}`
        );
        updateData.name = correctName;
      }
    }

    // If currentGrade is being updated, we might need to update isActive too
    // But we'll let the caller control isActive explicitly if needed
    // The calculateCohortGradeAndStatus logic is used for automatic calculation, not manual updates

    return (prisma as any).cohort.update({
      where: { id },
      data: updateData,
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

  /**
   * Delete all cohorts (hard delete - for reset)
   * WARNING: This permanently deletes all cohorts from the database
   */
  async deleteAll() {
    try {
      // Count before deletion for verification
      const countBefore = await (prisma as any).cohort.count({});
      
      // Delete all cohorts
      const result = await (prisma as any).cohort.deleteMany({});
      
      // Verify deletion
      const countAfter = await (prisma as any).cohort.count({});
      
      if (countAfter > 0) {
        console.warn(`Warning: Expected 0 cohorts after deletion, but found ${countAfter}. Deletion may have failed.`);
      }
      
      return {
        deleted: result.count,
        countBefore,
        countAfter,
      };
    } catch (error: any) {
      console.error('Error deleting cohorts:', error);
      throw new ValidationError(`שגיאה במחיקת המחזורים: ${error.message}`);
    }
  }

  /**
   * Update all existing cohorts with correct Gematria names
   * This updates names without deleting cohorts
   * Also creates missing cohorts from 1973 to current year + 1
   */
  async updateAllCohortNames() {
    const currentYear = new Date().getFullYear();
    const minYear = 1973;
    const maxYear = currentYear + 1;
    
    // First, ensure all cohorts exist (from 1973 to current year + 1)
    await this.ensureAllCohortsExist();
    
    // Get all cohorts
    const allCohorts = await (prisma as any).cohort.findMany({
      orderBy: {
        startYear: 'asc',
      },
    });
    
    console.log(`Found ${allCohorts.length} cohorts to check`);
    
    const updatedCohorts = [];
    const skippedCohorts = [];
    const createdCohorts = [];

    // Update existing cohorts with correct names
    for (const cohort of allCohorts) {
      const correctName = generateCohortName(cohort.startYear);
      
      // Only update if name is different
      if (cohort.name !== correctName) {
        const updated = await (prisma as any).cohort.update({
          where: { id: cohort.id },
          data: { name: correctName },
        });
        updatedCohorts.push({
          id: updated.id,
          oldName: cohort.name,
          newName: updated.name,
          startYear: updated.startYear,
        });
      } else {
        skippedCohorts.push({
          id: cohort.id,
          name: cohort.name,
          startYear: cohort.startYear,
        });
      }
    }

    return {
      updated: updatedCohorts.length,
      total: allCohorts.length,
      skipped: skippedCohorts.length,
      cohorts: updatedCohorts,
    };
  }

  /**
   * Recreate all cohorts from 1973 to current year + 1
   * This will delete all existing cohorts and create new ones with correct Gematria names
   */
  async recreateAllCohorts() {
    const currentYear = new Date().getFullYear();
    const minYear = 1973;
    const maxYear = currentYear + 1;

    // Delete all existing cohorts first
    await this.deleteAll();

    // Create all cohorts
    const createdCohorts = [];
    for (let year = minYear; year <= maxYear; year++) {
      const cohortName = generateCohortName(year);
      const cohort = await (prisma as any).cohort.create({
        data: {
          name: cohortName,
          startYear: year,
          currentGrade: 'ט\'',
          isActive: true,
        },
      });
      createdCohorts.push(cohort);
    }

    return {
      created: createdCohorts.length,
      cohorts: createdCohorts,
    };
  }
}

