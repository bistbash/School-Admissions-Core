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

export type ConflictType = 
  | 'INVALID_ID_NUMBER'
  | 'INVALID_GRADE'
  | 'INVALID_PARALLEL'
  | 'TRACK_NOT_FOUND'
  | 'INVALID_CLASS_COMBINATION'
  | 'INVALID_PARENT_ID_NUMBER'
  | 'INVALID_PHONE_NUMBER'
  | 'INVALID_EMAIL'
  | 'INVALID_DATE';

export interface ConflictSuggestion {
  type: ConflictType;
  message: string;
  messageHebrew: string;
  suggestions?: string[];
}

export interface RowConflict {
  row: number;
  idNumber?: string;
  firstName?: string;
  lastName?: string;
  conflicts: ConflictSuggestion[];
}

export class StudentsUploadService {
  private studentsService: StudentsService;
  private validGrades = ['ט\'', 'י\'', 'י"א', 'י"ב'];
  private validParallels = ['1', '2', '3', '4', '5', '6', '7', '8'];
  private existingTracksCache: Set<string> | null = null;
  private existingTracksMap: Map<string, string> | null = null; // lowercase -> original

  /**
   * Clear tracks cache (useful for testing or when tracks are updated)
   */
  private clearTracksCache() {
    this.existingTracksCache = null;
    this.existingTracksMap = null;
  }

  /**
   * Generate a valid Israeli ID number with checksum
   * Uses the same algorithm as validateIsraeliIdNumber for consistency
   */
  private generateValidIsraeliId(): string {
    // Generate 8 random digits (avoid all same digits)
    let digits = '';
    let attempts = 0;
    do {
      digits = '';
      for (let i = 0; i < 8; i++) {
        digits += Math.floor(Math.random() * 10).toString();
      }
      attempts++;
      // Prevent infinite loop
      if (attempts > 100) {
        // Fallback: use a known valid pattern
        digits = '12345678';
        break;
      }
    } while (/^(\d)\1{7}$/.test(digits)); // Avoid all same digits

    // Calculate checksum digit using the same algorithm as validation
    let sum = 0;
    for (let i = 0; i < 8; i++) {
      let digit = parseInt(digits[i], 10);
      if (i % 2 === 1) {
        digit *= 2;
        if (digit > 9) {
          digit = Math.floor(digit / 10) + (digit % 10);
        }
      }
      sum += digit;
    }

    // Calculate check digit to make sum divisible by 10
    const checkDigit = (10 - (sum % 10)) % 10;
    const fullId = digits + checkDigit.toString();
    
    // Verify the generated ID is valid (double-check)
    const validation = this.validateIsraeliIdNumber(fullId);
    if (!validation.isValid) {
      // If somehow invalid, generate a new one (recursive, but with limit)
      console.warn(`Generated invalid ID ${fullId}, regenerating...`);
      return this.generateValidIsraeliId();
    }
    
    return fullId;
  }

  /**
   * Generate Excel template file with example data
   * Public method to be called from controller
   */
  async generateExcelTemplate(): Promise<Buffer> {
    const XLSX = await import('xlsx');
    
    // Create a new workbook
    const workbook = XLSX.utils.book_new();

    // Headers row
    const headers = [
      'מספר ת.ז',
      'ת.ז',
      'שם פרטי',
      'שם משפחה',
      'מין',
      'כיתה',
      'מקבילה',
      'מגמה',
      'מחזור',
      'תאריך לידה',
      'דואר אלקטרוני',
      'תאריך עליה',
      'יישוב',
      'כתובת',
      'יישוב 2',
      'כתובת 2',
      'טלפון',
      'טלפון נייד',
      'ת.ז הורים 1',
      'שם פרטי הורים 1',
      'שם משפחה הורים 1',
      'סוג הורים 1',
      'טלפון נייד הורים 1',
      'דואר אלקטרוני הורים 1',
      'ת.ז הורים 2',
      'שם פרטי הורים 2',
      'שם משפחה הורים 2',
      'סוג הורים 2',
      'טלפון נייד הורים 2',
      'דואר אלקטרוני הורים 2',
    ];

    // Generate example data with valid ID numbers
    const exampleData = [
      headers,
      [
        this.generateValidIsraeliId(), // מספר ת.ז
        '', // ת.ז (alternative column)
        'יוסי',
        'כהן',
        'זכר',
        'ט\'',
        '1',
        'מדעי המחשב',
        '',
        '2008-05-15',
        'yossi.cohen@example.com',
        '',
        'תל אביב',
        'רחוב הרצל 1',
        '',
        '',
        '03-1234567',
        '050-1234567',
        this.generateValidIsraeliId(),
        'אבי',
        'כהן',
        'אב',
        '050-1111111',
        'avi.cohen@example.com',
        this.generateValidIsraeliId(),
        'רותי',
        'כהן',
        'אם',
        '050-2222222',
        'ruti.cohen@example.com',
      ],
      [
        this.generateValidIsraeliId(),
        '',
        'שרה',
        'לוי',
        'נקבה',
        'ט\'',
        '2',
        'פיזיקה',
        '',
        '2008-08-20',
        'sara.levi@example.com',
        '',
        'ירושלים',
        'רחוב יפו 10',
        '',
        '',
        '02-9876543',
        '050-9876543',
        this.generateValidIsraeliId(),
        'דני',
        'לוי',
        'אב',
        '050-3333333',
        'dani.levi@example.com',
        '',
        '',
        '',
        '',
        '',
        '',
      ],
      [
        this.generateValidIsraeliId(),
        '',
        'דוד',
        'ישראל',
        'זכר',
        'י"א',
        '3',
        'כימיה',
        '',
        '2007-03-10',
        'david.israel@example.com',
        '',
        'חיפה',
        'רחוב הרצל 5',
        '',
        '',
        '04-4567890',
        '050-4567890',
        this.generateValidIsraeliId(),
        'מיכאל',
        'ישראל',
        'אב',
        '050-4444444',
        'michael.israel@example.com',
        '',
        '',
        '',
        '',
        '',
        '',
      ],
    ];

    // Create worksheet
    const worksheet = XLSX.utils.aoa_to_sheet(exampleData);

    // Set column widths for better readability
    const colWidths = [
      { wch: 12 }, // מספר ת.ז
      { wch: 12 }, // ת.ז
      { wch: 15 }, // שם פרטי
      { wch: 15 }, // שם משפחה
      { wch: 8 },  // מין
      { wch: 8 },  // כיתה
      { wch: 8 },  // מקבילה
      { wch: 20 }, // מגמה
      { wch: 10 }, // מחזור
      { wch: 12 }, // תאריך לידה
      { wch: 25 }, // דואר אלקטרוני
      { wch: 12 }, // תאריך עליה
      { wch: 15 }, // יישוב
      { wch: 25 }, // כתובת
      { wch: 15 }, // יישוב 2
      { wch: 25 }, // כתובת 2
      { wch: 12 }, // טלפון
      { wch: 12 }, // טלפון נייד
      { wch: 12 }, // ת.ז הורים 1
      { wch: 15 }, // שם פרטי הורים 1
      { wch: 15 }, // שם משפחה הורים 1
      { wch: 10 }, // סוג הורים 1
      { wch: 12 }, // טלפון נייד הורים 1
      { wch: 25 }, // דואר אלקטרוני הורים 1
      { wch: 12 }, // ת.ז הורים 2
      { wch: 15 }, // שם פרטי הורים 2
      { wch: 15 }, // שם משפחה הורים 2
      { wch: 10 }, // סוג הורים 2
      { wch: 12 }, // טלפון נייד הורים 2
      { wch: 25 }, // דואר אלקטרוני הורים 2
    ];
    worksheet['!cols'] = colWidths;

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, 'תלמידים');

    // Generate buffer
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    return buffer;
  }

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
   * Validate phone number (Israeli format)
   * Accepts formats like: 050-1234567, 0501234567, 03-1234567, 031234567, +972501234567
   */
  private validatePhoneNumber(phone: string): { isValid: boolean; error?: string } {
    if (!phone || typeof phone !== 'string') {
      return { isValid: false, error: 'מספר טלפון ריק' };
    }

    // Remove all non-digit characters except +
    const cleaned = phone.replace(/[^\d+]/g, '');
    
    // Israeli phone number patterns:
    // Mobile: 05X-XXXXXXX (10 digits starting with 05)
    // Landline: 0X-XXXXXXX (9-10 digits starting with 0)
    // International: +972XXXXXXXXX
    
    // Check if it's international format
    if (cleaned.startsWith('+972')) {
      const digits = cleaned.substring(4);
      if (digits.length === 9 && digits.startsWith('5')) {
        return { isValid: true }; // Mobile
      }
      if (digits.length >= 8 && digits.length <= 9) {
        return { isValid: true }; // Landline
      }
    }
    
    // Check Israeli format
    if (cleaned.startsWith('0')) {
      if (cleaned.length === 10 && cleaned.startsWith('05')) {
        return { isValid: true }; // Mobile: 05X-XXXXXXX
      }
      if (cleaned.length >= 9 && cleaned.length <= 10) {
        return { isValid: true }; // Landline: 0X-XXXXXXX
      }
    }
    
    // If it's just digits, check length
    if (/^\d+$/.test(cleaned)) {
      if (cleaned.length === 9 && cleaned.startsWith('5')) {
        return { isValid: true }; // Mobile without leading 0
      }
      if (cleaned.length >= 8 && cleaned.length <= 10) {
        return { isValid: true }; // Landline
      }
    }
    
    return {
      isValid: false,
      error: 'פורמט לא תקין. דוגמאות: 050-1234567, 03-1234567, +972501234567',
    };
  }

  /**
   * Validate email address
   */
  private validateEmail(email: string): { isValid: boolean; error?: string } {
    if (!email || typeof email !== 'string') {
      return { isValid: false, error: 'כתובת דואר אלקטרוני ריקה' };
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return {
        isValid: false,
        error: 'פורמט לא תקין. דוגמה: example@domain.com',
      };
    }

    // Check length
    if (email.length > 254) {
      return { isValid: false, error: 'כתובת דואר אלקטרוני ארוכה מדי' };
    }

    return { isValid: true };
  }

  /**
   * Validate date
   */
  private validateDate(dateValue: any, fieldName: string): { isValid: boolean; error?: string } {
    if (!dateValue) {
      return { isValid: true }; // Empty dates are optional
    }

    let date: Date | null = null;

    if (dateValue instanceof Date) {
      date = dateValue;
    } else if (typeof dateValue === 'number') {
      // Excel date serial number
      const excelEpoch = new Date(1899, 11, 30);
      date = new Date(excelEpoch.getTime() + dateValue * 24 * 60 * 60 * 1000);
    } else if (typeof dateValue === 'string') {
      date = new Date(dateValue);
    }

    if (!date || isNaN(date.getTime())) {
      return {
        isValid: false,
        error: 'תאריך לא תקין. פורמט: YYYY-MM-DD',
      };
    }

    // Check if date is reasonable (not too far in the past or future)
    const now = new Date();
    const minDate = new Date(1900, 0, 1);
    const maxDate = new Date(now.getFullYear() + 10, 11, 31);

    if (date < minDate || date > maxDate) {
      return {
        isValid: false,
        error: `תאריך לא הגיוני. צריך להיות בין ${minDate.getFullYear()} ל-${maxDate.getFullYear()}`,
      };
    }

    return { isValid: true };
  }

  /**
   * Validate Israeli ID number (9 digits with checksum)
   * Uses Luhn algorithm variant for Israeli ID numbers
   */
  private validateIsraeliIdNumber(idNumber: string): { isValid: boolean; error?: string } {
    if (!idNumber || typeof idNumber !== 'string') {
      return {
        isValid: false,
        error: 'ת.ז לא חוקית - ערך ריק או לא תקין',
      };
    }

    // Remove any non-digit characters
    const cleaned = idNumber.replace(/\D/g, '');
    
    // Must be exactly 9 digits
    if (cleaned.length !== 9) {
      return {
        isValid: false,
        error: cleaned.length === 0 
          ? 'ת.ז חייבת להכיל 9 ספרות'
          : `ת.ז חייבת להכיל בדיוק 9 ספרות. התקבל: ${cleaned.length} ספרות`,
      };
    }

    // Check if all digits are the same (invalid)
    if (/^(\d)\1{8}$/.test(cleaned)) {
      return {
        isValid: false,
        error: 'ת.ז לא חוקית - כל הספרות זהות',
      };
    }

    // Israeli ID checksum validation
    try {
      let sum = 0;
      for (let i = 0; i < 9; i++) {
        let digit = parseInt(cleaned[i], 10);
        if (isNaN(digit)) {
          return {
            isValid: false,
            error: 'ת.ז לא חוקית - מכילה תווים לא תקינים',
          };
        }
        if (i % 2 === 1) {
          digit *= 2;
          if (digit > 9) {
            digit = Math.floor(digit / 10) + (digit % 10);
          }
        }
        sum += digit;
      }

      if (sum % 10 !== 0) {
        return {
          isValid: false,
          error: 'ת.ז לא חוקית - ספרת ביקורת שגויה',
        };
      }

      return { isValid: true };
    } catch (error) {
      return {
        isValid: false,
        error: 'ת.ז לא חוקית - שגיאה באימות',
      };
    }
  }

  /**
   * Get all existing tracks from the database
   * Fetches from the Track table (not Class table)
   */
  private async getExistingTracks(): Promise<Set<string>> {
    if (this.existingTracksCache !== null) {
      return this.existingTracksCache;
    }

    try {
      // Fetch from Track table (not Class table)
      const tracksFromDb = await prisma.track.findMany({
        where: {
          isActive: true,
        },
        select: {
          name: true,
        },
      });

      const tracks = new Set<string>();
      const tracksMap = new Map<string, string>();
      
      tracksFromDb.forEach((t) => {
        if (t.name) {
          const original = t.name.trim();
          const lower = original.toLowerCase();
          
          tracks.add(lower);
          tracksMap.set(lower, original);
        }
      });

      this.existingTracksCache = tracks;
      this.existingTracksMap = tracksMap;
      return tracks;
    } catch (error) {
      console.error('[VALIDATE] Error fetching existing tracks:', error);
      // Return empty set on error to prevent crashes
      this.existingTracksCache = new Set<string>();
      this.existingTracksMap = new Map<string, string>();
      return this.existingTracksCache;
    }
  }

  /**
   * Find similar tracks (fuzzy matching)
   */
  private findSimilarTracks(inputTrack: string, existingTracks: Set<string>): string[] {
    const inputLower = inputTrack.trim().toLowerCase();
    const suggestions: string[] = [];
    const tracksArray = Array.from(existingTracks);

    // Exact match (case-insensitive)
    for (const track of tracksArray) {
      if (track === inputLower) {
        return []; // No suggestion needed, exact match exists
      }
    }

    // Find tracks that contain the input or vice versa
    for (const track of tracksArray) {
      if (track.includes(inputLower) || inputLower.includes(track)) {
        // Get original track name from map
        const original = this.existingTracksMap?.get(track) || track;
        suggestions.push(original);
      }
    }

    // If no substring match, try Levenshtein-like similarity
    if (suggestions.length === 0) {
      for (const track of tracksArray) {
        const similarity = this.calculateSimilarity(inputLower, track);
        if (similarity > 0.7) {
          const original = this.existingTracksMap?.get(track) || track;
          suggestions.push(original);
        }
      }
    }

    return suggestions.slice(0, 5); // Return top 5 suggestions
  }

  /**
   * Calculate string similarity (simple Levenshtein-based)
   */
  private calculateSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    if (longer.length === 0) return 1.0;

    const distance = this.levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * Validate a single Excel row and return conflicts
   */
  async validateExcelRow(
    row: ExcelStudentRow,
    rowNumber: number
  ): Promise<RowConflict | null> {
    try {
      const idNumber = String(row['מספר ת.ז'] || row['ת.ז'] || '').trim();
      const firstName = String(row['שם פרטי'] || '').trim();
      const lastName = String(row['שם משפחה'] || '').trim();
      const grade = String(row['כיתה'] || '').trim();
      const parallel = row['מקבילה'] ? String(row['מקבילה']).trim() : null;
      // Handle track: check if it exists and is not empty after trim
      const trackRaw = row['מגמה'];
      const track = trackRaw !== null && trackRaw !== undefined && String(trackRaw).trim() !== '' 
        ? String(trackRaw).trim() 
        : null;

      const conflicts: ConflictSuggestion[] = [];

    // Validate ID number
    if (idNumber) {
      const idValidation = this.validateIsraeliIdNumber(idNumber);
      if (!idValidation.isValid) {
        conflicts.push({
          type: 'INVALID_ID_NUMBER',
          message: `Invalid ID number: ${idValidation.error}`,
          messageHebrew: idValidation.error || 'ת.ז לא חוקית',
        });
      }
    }

    // Validate grade
    if (grade && !this.validGrades.includes(grade)) {
      conflicts.push({
        type: 'INVALID_GRADE',
        message: `Invalid grade: ${grade}. Valid grades are: ${this.validGrades.join(', ')}`,
        messageHebrew: `כיתה לא חוקית: ${grade}. כיתות חוקיות: ${this.validGrades.join(', ')}`,
        suggestions: this.validGrades,
      });
    }

    // Validate parallel
    if (parallel && !this.validParallels.includes(parallel)) {
      conflicts.push({
        type: 'INVALID_PARALLEL',
        message: `Invalid parallel: ${parallel}. Valid parallels are: ${this.validParallels.join(', ')}`,
        messageHebrew: `מקבילה לא חוקית: ${parallel}. מקבילות חוקיות: ${this.validParallels.join(', ')}`,
        suggestions: this.validParallels,
      });
    }

      // Validate track (check if it exists in database)
      // Only validate if track is provided and not empty
      if (track && track.length > 0) {
        try {
          const existingTracks = await this.getExistingTracks();
          const trackLower = track.toLowerCase();
          const trackExists = existingTracks.has(trackLower);

          if (!trackExists) {
            const similarTracks = this.findSimilarTracks(track, existingTracks);
            conflicts.push({
              type: 'TRACK_NOT_FOUND',
              message: `Track not found: ${track}`,
              messageHebrew: `מגמה לא קיימת: ${track}`,
              suggestions: similarTracks.length > 0 ? similarTracks : undefined,
            });
          }
        } catch (error) {
          // If we can't check tracks, log but don't fail validation
          console.error(`[VALIDATE] Error validating track for row ${rowNumber}:`, error);
          // Add conflict even if we can't check, to inform user
          conflicts.push({
            type: 'TRACK_NOT_FOUND',
            message: `Unable to validate track: ${track}`,
            messageHebrew: `לא ניתן לבדוק את המגמה: ${track}`,
          });
        }
      }

      // Validate parent 1 ID number
      const parent1IdNumber = row['ת.ז הורים 1'] ? String(row['ת.ז הורים 1']).trim() : null;
      if (parent1IdNumber) {
        const parent1IdValidation = this.validateIsraeliIdNumber(parent1IdNumber);
        if (!parent1IdValidation.isValid) {
          conflicts.push({
            type: 'INVALID_PARENT_ID_NUMBER',
            message: `Invalid parent 1 ID number: ${parent1IdValidation.error}`,
            messageHebrew: `ת.ז הורים 1 לא חוקית: ${parent1IdValidation.error || 'ת.ז לא חוקית'}`,
          });
        }
      }

      // Validate parent 2 ID number
      const parent2IdNumber = row['ת.ז הורים 2'] ? String(row['ת.ז הורים 2']).trim() : null;
      if (parent2IdNumber) {
        const parent2IdValidation = this.validateIsraeliIdNumber(parent2IdNumber);
        if (!parent2IdValidation.isValid) {
          conflicts.push({
            type: 'INVALID_PARENT_ID_NUMBER',
            message: `Invalid parent 2 ID number: ${parent2IdValidation.error}`,
            messageHebrew: `ת.ז הורים 2 לא חוקית: ${parent2IdValidation.error || 'ת.ז לא חוקית'}`,
          });
        }
      }

      // Validate phone numbers
      const phone = row['טלפון'] ? String(row['טלפון']).trim() : null;
      if (phone) {
        const phoneValidation = this.validatePhoneNumber(phone);
        if (!phoneValidation.isValid) {
          conflicts.push({
            type: 'INVALID_PHONE_NUMBER',
            message: `Invalid phone number: ${phone}`,
            messageHebrew: `מספר טלפון לא חוקי: ${phone}. ${phoneValidation.error || 'פורמט לא תקין'}`,
          });
        }
      }

      const mobilePhone = row['טלפון נייד'] ? String(row['טלפון נייד']).trim() : null;
      if (mobilePhone) {
        const mobileValidation = this.validatePhoneNumber(mobilePhone);
        if (!mobileValidation.isValid) {
          conflicts.push({
            type: 'INVALID_PHONE_NUMBER',
            message: `Invalid mobile phone number: ${mobilePhone}`,
            messageHebrew: `מספר טלפון נייד לא חוקי: ${mobilePhone}. ${mobileValidation.error || 'פורמט לא תקין'}`,
          });
        }
      }

      // Validate parent phone numbers
      const parent1Mobile = row['טלפון נייד הורים 1'] ? String(row['טלפון נייד הורים 1']).trim() : null;
      if (parent1Mobile) {
        const parent1MobileValidation = this.validatePhoneNumber(parent1Mobile);
        if (!parent1MobileValidation.isValid) {
          conflicts.push({
            type: 'INVALID_PHONE_NUMBER',
            message: `Invalid parent 1 mobile phone: ${parent1Mobile}`,
            messageHebrew: `טלפון נייד הורים 1 לא חוקי: ${parent1Mobile}. ${parent1MobileValidation.error || 'פורמט לא תקין'}`,
          });
        }
      }

      const parent2Mobile = row['טלפון נייד הורים 2'] ? String(row['טלפון נייד הורים 2']).trim() : null;
      if (parent2Mobile) {
        const parent2MobileValidation = this.validatePhoneNumber(parent2Mobile);
        if (!parent2MobileValidation.isValid) {
          conflicts.push({
            type: 'INVALID_PHONE_NUMBER',
            message: `Invalid parent 2 mobile phone: ${parent2Mobile}`,
            messageHebrew: `טלפון נייד הורים 2 לא חוקי: ${parent2Mobile}. ${parent2MobileValidation.error || 'פורמט לא תקין'}`,
          });
        }
      }

      // Validate email addresses
      const email = row['דואר אלקטרוני'] ? String(row['דואר אלקטרוני']).trim() : null;
      if (email) {
        const emailValidation = this.validateEmail(email);
        if (!emailValidation.isValid) {
          conflicts.push({
            type: 'INVALID_EMAIL',
            message: `Invalid email address: ${email}`,
            messageHebrew: `כתובת דואר אלקטרוני לא חוקית: ${email}`,
          });
        }
      }

      const parent1Email = row['דואר אלקטרוני הורים 1'] ? String(row['דואר אלקטרוני הורים 1']).trim() : null;
      if (parent1Email) {
        const parent1EmailValidation = this.validateEmail(parent1Email);
        if (!parent1EmailValidation.isValid) {
          conflicts.push({
            type: 'INVALID_EMAIL',
            message: `Invalid parent 1 email: ${parent1Email}`,
            messageHebrew: `דואר אלקטרוני הורים 1 לא חוקי: ${parent1Email}`,
          });
        }
      }

      const parent2Email = row['דואר אלקטרוני הורים 2'] ? String(row['דואר אלקטרוני הורים 2']).trim() : null;
      if (parent2Email) {
        const parent2EmailValidation = this.validateEmail(parent2Email);
        if (!parent2EmailValidation.isValid) {
          conflicts.push({
            type: 'INVALID_EMAIL',
            message: `Invalid parent 2 email: ${parent2Email}`,
            messageHebrew: `דואר אלקטרוני הורים 2 לא חוקי: ${parent2Email}`,
          });
        }
      }

      // Validate dates
      const dateOfBirth = row['תאריך לידה'];
      if (dateOfBirth) {
        const dateValidation = this.validateDate(dateOfBirth, 'תאריך לידה');
        if (!dateValidation.isValid) {
          conflicts.push({
            type: 'INVALID_DATE',
            message: `Invalid date of birth: ${dateValidation.error}`,
            messageHebrew: `תאריך לידה לא חוקי: ${dateValidation.error || 'תאריך לא תקין'}`,
          });
        }
      }

      const aliyahDate = row['תאריך עליה'];
      if (aliyahDate) {
        const aliyahDateValidation = this.validateDate(aliyahDate, 'תאריך עליה');
        if (!aliyahDateValidation.isValid) {
          conflicts.push({
            type: 'INVALID_DATE',
            message: `Invalid aliyah date: ${aliyahDateValidation.error}`,
            messageHebrew: `תאריך עליה לא חוקי: ${aliyahDateValidation.error || 'תאריך לא תקין'}`,
          });
        }
      }

      if (conflicts.length === 0) {
        return null;
      }

      return {
        row: rowNumber,
        idNumber: idNumber || undefined,
        firstName: firstName || undefined,
        lastName: lastName || undefined,
        conflicts,
      };
    } catch (error) {
      console.error(`[VALIDATE] Unexpected error in validateExcelRow for row ${rowNumber}:`, error);
      throw error;
    }
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
   * Reads from first row (header row) - expects column names in Hebrew
   */
  async parseExcelFile(buffer: Buffer): Promise<ExcelStudentRow[]> {
    try {
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const allStudents: ExcelStudentRow[] = [];

      // Process all sheets
      for (const sheetName of workbook.SheetNames) {
        const worksheet = workbook.Sheets[sheetName];
        
        // Convert to JSON, starting from first row (header row)
        // XLSX will use the first row as column names
        const data = XLSX.utils.sheet_to_json<ExcelStudentRow>(worksheet, {
          defval: null, // Use null for empty cells
          raw: false, // Convert numbers to strings for consistency
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
   * Uses the CohortsService.ensureCohortExists for proper grade calculation
   */
  private async findOrCreateCohort(cohortName?: string, startYear?: number): Promise<number> {
    if (!cohortName && !startYear) {
      throw new ValidationError('Cohort name or start year is required');
    }

    const year = startYear || new Date().getFullYear();
    
    // Use CohortsService to ensure cohort exists with correct grade calculation
    const { CohortsService } = await import('../cohorts/cohorts.service');
    const cohortsService = new CohortsService();
    
    return await cohortsService.ensureCohortExists(year);
  }

  /**
   * Validate all Excel rows and return conflicts
   */
  async validateExcelData(rows: ExcelStudentRow[]): Promise<{
    conflicts: RowConflict[];
    validRows: number;
  }> {
    const conflicts: RowConflict[] = [];
    let validRows = 0;

    try {
      console.log(`[VALIDATE] Starting validation of ${rows.length} rows`);
      
      // Pre-load tracks cache to avoid multiple database calls
      console.log('[VALIDATE] Loading existing tracks from database...');
      try {
        await this.getExistingTracks();
        console.log(`[VALIDATE] Loaded ${this.existingTracksCache?.size || 0} existing tracks`);
      } catch (tracksError) {
        console.error('[VALIDATE] Error loading tracks:', tracksError);
        // Continue with empty tracks cache - will just report all tracks as not found
      }

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const rowNumber = i + 2; // +2 because Excel starts at row 1, row 1 is header, so data starts at row 2

        try {
          const conflict = await this.validateExcelRow(row, rowNumber);
          if (conflict) {
            conflicts.push(conflict);
          } else {
            validRows++;
          }
          
          // Log progress every 100 rows
          if ((i + 1) % 100 === 0) {
            console.log(`[VALIDATE] Processed ${i + 1}/${rows.length} rows (${conflicts.length} conflicts, ${validRows} valid)`);
          }
        } catch (error) {
          // If validation of a single row fails, add it as a conflict
          console.error(`[VALIDATE] Error validating row ${rowNumber}:`, error);
          console.error(`[VALIDATE] Row data:`, {
            idNumber: String(row['מספר ת.ז'] || row['ת.ז'] || '').trim(),
            firstName: String(row['שם פרטי'] || '').trim(),
            lastName: String(row['שם משפחה'] || '').trim(),
          });
          conflicts.push({
            row: rowNumber,
            idNumber: String(row['מספר ת.ז'] || row['ת.ז'] || '').trim() || undefined,
            firstName: String(row['שם פרטי'] || '').trim() || undefined,
            lastName: String(row['שם משפחה'] || '').trim() || undefined,
            conflicts: [{
              type: 'INVALID_ID_NUMBER',
              message: `Error validating row: ${error instanceof Error ? error.message : 'Unknown error'}`,
              messageHebrew: `שגיאה באימות השורה: ${error instanceof Error ? error.message : 'שגיאה לא ידועה'}`,
            }],
          });
        }
      }
      
      console.log(`[VALIDATE] Validation completed: ${conflicts.length} conflicts, ${validRows} valid rows`);
    } catch (error) {
      console.error('[VALIDATE] Fatal error in validateExcelData:', error);
      console.error('[VALIDATE] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      throw error;
    }

    return { conflicts, validRows };
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
        const rowNumber = globalIndex + 2; // +2 because Excel starts at row 1, row 1 is header, so data starts at row 2

        try {
        // Get ID number (support both column names)
        const idNumber = String(row['מספר ת.ז'] || row['ת.ז'] || '').trim();
        const firstName = String(row['שם פרטי'] || '').trim();
        const lastName = String(row['שם משפחה'] || '').trim();
        const grade = String(row['כיתה'] || '').trim();
        const parallel = row['מקבילה'] ? String(row['מקבילה']).trim() : null;
        // Track will be validated and set later in the validation section
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

        // Additional validation (these should have been caught in validateExcelData, but double-check)
        const idValidation = this.validateIsraeliIdNumber(idNumber);
        if (!idValidation.isValid) {
          errors.push({ row: rowNumber, error: idValidation.error || 'Invalid ID number' });
          continue;
        }

        if (!this.validGrades.includes(grade)) {
          errors.push({ row: rowNumber, error: `Invalid grade: ${grade}` });
          continue;
        }

        if (parallel && !this.validParallels.includes(parallel)) {
          errors.push({ row: rowNumber, error: `Invalid parallel: ${parallel}` });
          continue;
        }

        // Validate track (check if it exists in database)
        // Handle track: check if it exists and is not empty after trim
        const trackRaw = row['מגמה'];
        const trackProcessed = trackRaw !== null && trackRaw !== undefined && String(trackRaw).trim() !== '' 
          ? String(trackRaw).trim() 
          : null;

        if (trackProcessed && trackProcessed.length > 0) {
          try {
            const existingTracks = await this.getExistingTracks();
            const trackLower = trackProcessed.toLowerCase();
            const trackExists = existingTracks.has(trackLower);

            if (!trackExists) {
              errors.push({ 
                row: rowNumber, 
                error: `Track not found: ${trackProcessed}. Please add the track to the system first or use an existing track.` 
              });
              continue; // Skip this row
            }
          } catch (error) {
            // If we can't check tracks, log and skip this row
            console.error(`[PROCESS] Error validating track for row ${rowNumber}:`, error);
            errors.push({ 
              row: rowNumber, 
              error: `Unable to validate track: ${trackProcessed}. Please verify the track exists in the system.` 
            });
            continue; // Skip this row
          }
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

        // Use the validated track (trackProcessed was validated above)
        // trackProcessed is null if track was empty, or the validated track name if it exists
        const track: string | null = trackProcessed;

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

