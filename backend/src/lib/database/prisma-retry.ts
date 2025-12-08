import { PrismaClientRustPanicError } from '@prisma/client/runtime/library';
import { recreatePrisma } from '../database/prisma';

/**
 * Retry a Prisma operation with exponential backoff
 * Handles Prisma panics that occur during high load
 * 
 * @param operation - The async operation to retry
 * @param maxRetries - Maximum number of retries (default: 3)
 * @param baseDelay - Base delay in milliseconds (default: 200)
 * @returns The result of the operation
 */
export async function retryPrismaOperation<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 200
): Promise<T> {
  let lastError: any = null;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      
      // Only retry on Prisma panics
      if (error.name === 'PrismaClientRustPanicError' || error instanceof PrismaClientRustPanicError) {
        if (attempt < maxRetries - 1) {
          // Recreate Prisma Client on panic
          console.warn(`Prisma panic on attempt ${attempt + 1}/${maxRetries}, recreating client...`);
          try {
            await recreatePrisma();
          } catch (recreateError) {
            console.error('Failed to recreate Prisma Client:', recreateError);
          }
          
          // Exponential backoff: 200ms, 400ms, 800ms, etc.
          const delay = baseDelay * Math.pow(2, attempt);
          console.warn(`Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
      }
      
      // For other errors or last attempt, throw immediately
      throw error;
    }
  }
  
  // If all retries failed, throw the last error
  throw lastError;
}

/**
 * Check if an error is a Prisma panic
 */
export function isPrismaPanic(error: any): boolean {
  return error?.name === 'PrismaClientRustPanicError';
}
