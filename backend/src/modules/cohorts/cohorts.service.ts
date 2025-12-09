import { prisma } from '../../lib/database/prisma';
import { NotFoundError, ValidationError } from '../../lib/utils/errors';

export interface CreateCohortData {
  name: string;
  startYear: number;
  currentGrade?: string | null; // ט', י', י"א, י"ב, י"ג, י"ד, or null for next cohort
}

export interface UpdateCohortData {
  name?: string;
  currentGrade?: string;
  isActive?: boolean;
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

export class CohortsService {
  // Static cache for cohort initialization - shared across ALL instances
  // This ensures cooldown works even when multiple CohortsService instances are created
  // (e.g., one in controller, one at server startup)
  private static lastEnsureTime: number = 0;
  private static readonly ENSURE_COOLDOWN_MS = 60 * 60 * 1000; // 1 hour - only run ensure once per hour max (unless forced)

  /**
   * Create a new cohort
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
    
    // Check if name already exists
    const existing = await (prisma as any).cohort.findUnique({
      where: { name: data.name },
    });

    if (existing) {
      throw new ValidationError('Cohort with this name already exists');
    }

    // If currentGrade is not provided, calculate it automatically
    // If currentGrade is explicitly null, it represents a future cohort (isActive: false)
    // If currentGrade is a string, use it with isActive: true
    let gradeAndStatus: { currentGrade: string | null; isActive: boolean };
    if (data.currentGrade === undefined) {
      // Not provided - calculate automatically
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
        name: data.name,
        startYear: data.startYear,
        currentGrade: gradeAndStatus.currentGrade,
        isActive: gradeAndStatus.isActive,
      },
    });
  }

  /**
   * Get all cohorts
   * Also ensures all possible cohorts exist (from 1973 to current year + 1)
   * Uses caching to avoid running ensureAllCohortsExist on every request
   */
  async getAll(filters?: { isActive?: boolean; skipAutoCreate?: boolean; forceRefresh?: boolean }) {
    const where: any = {};
    
    if (filters?.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    // Ensure all possible cohorts exist (unless skipAutoCreate is true)
    // Use static cache to avoid running this on every API call (once per hour max)
    // Static cache ensures cooldown works across all CohortsService instances
    if (!filters?.skipAutoCreate) {
      const now = Date.now();
      const shouldRunEnsure = 
        filters?.forceRefresh || 
        now - CohortsService.lastEnsureTime > CohortsService.ENSURE_COOLDOWN_MS;
      
      if (shouldRunEnsure) {
        try {
          await this.ensureAllCohortsExist();
          CohortsService.lastEnsureTime = now;
        } catch (error: any) {
          console.error('Error in ensureAllCohortsExist:', error);
          // Continue even if ensureAllCohortsExist fails - return existing cohorts
        }
      }
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
   * Calculate current grade and active status for a cohort based on its start year
   * Cohorts always start on September 1st (01.09.year)
   * 
   * Active cohorts: Last 6 cohorts (not including current year + 1)
   * י"ד is the last grade before graduation, so it must remain active until the next 01.09
   * - Current year = ט' (active)
   * - Current year - 1 = י' (active)
   * - Current year - 2 = י"א (active)
   * - Current year - 3 = י"ב (active)
   * - Current year - 4 = י"ג (active)
   * - Current year - 5 = י"ד (active - last active grade before graduation)
   * 
   * Next cohort (not active): Current year + 1 = NO GRADE (null) - will start next year, currently in selection
   * 
   * Inactive cohorts: Current year - 6 and older = י"ד (graduated, isActive = false)
   * 
   * Logic (if current date >= September 1st):
   * - Current year + 1 = null (next cohort, no grade yet, not active)
   * - Current year = ט' (active)
   * - Current year - 1 = י' (active)
   * - Current year - 2 = י"א (active)
   * - Current year - 3 = י"ב (active)
   * - Current year - 4 = י"ג (active)
   * - Current year - 5 = י"ד (active - last active grade)
   * - Current year - 6 = י"ד (inactive - graduated)
   * 
   * Logic (if current date < September 1st):
   * - Current year = null (next cohort, no grade yet, not active)
   * - Current year - 1 = ט' (active)
   * - Current year - 2 = י' (active)
   * - Current year - 3 = י"א (active)
   * - Current year - 4 = י"ב (active)
   * - Current year - 5 = י"ג (active)
   * - Current year - 6 = י"ד (active - last active grade)
   * - Current year - 7 = י"ד (inactive - graduated)
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
    // Current academic year = ט' (active - 1st of 6 active cohorts)
    if (yearsDiff === 0) {
      return { currentGrade: 'ט\'', isActive: true };
    }
    // Current academic year - 1 = י' (active - 2nd of 6 active cohorts)
    if (yearsDiff === 1) {
      return { currentGrade: 'י\'', isActive: true };
    }
    // Current academic year - 2 = י"א (active - 3rd of 6 active cohorts)
    if (yearsDiff === 2) {
      return { currentGrade: 'י"א', isActive: true };
    }
    // Current academic year - 3 = י"ב (active - 4th of 6 active cohorts)
    if (yearsDiff === 3) {
      return { currentGrade: 'י"ב', isActive: true };
    }
    // Current academic year - 4 = י"ג (active - 5th of 6 active cohorts)
    if (yearsDiff === 4) {
      return { currentGrade: 'י"ג', isActive: true };
    }
    // Current academic year - 5 = י"ד (active - 6th of 6 active cohorts, last active grade before graduation)
    if (yearsDiff === 5) {
      return { currentGrade: 'י"ד', isActive: true };
    }
    // Current academic year - 6 and older = י"ד (graduated, not active)
    return { currentGrade: 'י"ד', isActive: false };
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
          const needsUpdate = 
            existing.currentGrade !== currentGrade || 
            existing.isActive !== isActive ||
            existing.name !== cohortName; // Also update name if it changed (e.g., after code fixes)

          if (needsUpdate) {
            const updateData: any = {
              isActive,
              currentGrade,
            };
            // Update name if it changed (shouldn't happen often, but ensures consistency)
            if (existing.name !== cohortName) {
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

