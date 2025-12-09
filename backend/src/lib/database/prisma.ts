import { PrismaClient } from '@prisma/client';
import { PrismaClientRustPanicError } from '@prisma/client/runtime/library';
import { logger } from '../utils/logger';

// Singleton pattern for Prisma Client
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * Get or create Prisma Client instance
 * Always returns the current instance from global
 */
function getPrismaClient(): PrismaClient {
  if (!globalForPrisma.prisma) {
    // Initialize synchronously - PRAGMA settings will be set on first query
    // This avoids blocking module initialization
    globalForPrisma.prisma = new PrismaClient({
      log: process.env.PRISMA_LOG_QUERIES === 'true' 
        ? ['query', 'error', 'warn'] 
        : process.env.NODE_ENV === 'development' 
          ? ['error', 'warn'] 
          : ['error'],
    });
    
    // Configure SQLite settings asynchronously after initialization
    // This won't block the module from loading
    // Note: Use $queryRaw instead of $executeRaw for PRAGMA statements in SQLite
    // because PRAGMA returns results and $executeRaw doesn't allow results
    (async () => {
      try {
        const client = globalForPrisma.prisma!;
        // PRAGMA statements return results, so we use $queryRaw and ignore the result
        await client.$queryRaw`PRAGMA journal_mode = WAL;`;
        await client.$queryRaw`PRAGMA busy_timeout = 30000;`;
        await client.$queryRaw`PRAGMA synchronous = NORMAL;`;
        await client.$queryRaw`PRAGMA cache_size = -64000;`;
        await client.$queryRaw`PRAGMA foreign_keys = ON;`;
        logger.debug('SQLite WAL mode and connection settings configured');
      } catch (error) {
        logger.warn({ error: (error as Error).message }, 'Failed to configure SQLite PRAGMA settings');
      }
    })();
  }
  return globalForPrisma.prisma;
}

/**
 * Recreate Prisma Client after a panic
 */
async function recreatePrismaClient(): Promise<PrismaClient> {
  if (globalForPrisma.prisma) {
    try {
      await globalForPrisma.prisma.$disconnect();
    } catch (error: any) {
      logger.error({ error: error?.message || 'Unknown error' }, 'Error disconnecting Prisma Client');
    }
  }
  
  // Create new client and configure SQLite settings
  const client = new PrismaClient({
    log: process.env.PRISMA_LOG_QUERIES === 'true' 
      ? ['query', 'error', 'warn'] 
      : process.env.NODE_ENV === 'development' 
        ? ['error', 'warn'] 
        : ['error'],
  });

  // Configure SQLite settings
  // Note: Use $queryRaw instead of $executeRaw for PRAGMA statements in SQLite
  // because PRAGMA returns results and $executeRaw doesn't allow results
  try {
    await client.$queryRaw`PRAGMA journal_mode = WAL;`;
    await client.$queryRaw`PRAGMA busy_timeout = 30000;`;
    await client.$queryRaw`PRAGMA synchronous = NORMAL;`;
    await client.$queryRaw`PRAGMA cache_size = -64000;`;
    await client.$queryRaw`PRAGMA foreign_keys = ON;`;
  } catch (error) {
    logger.warn({ error: (error as Error).message }, 'Failed to configure SQLite PRAGMA settings after recreation');
  }

  globalForPrisma.prisma = client;
  logger.warn('Prisma Client recreated after panic');
  return globalForPrisma.prisma;
}

// Export the Prisma Client
// Note: After a panic, modules need to re-import to get the new instance
// For now, we'll use the global instance directly
export const prisma: PrismaClient = getPrismaClient();

// Export getter function for modules that need to always get the current instance
// (useful after Prisma client recreation)
export { getPrismaClient };

// Export function to recreate client if needed
// After calling this, modules should re-import prisma to get the new instance
export async function recreatePrisma(): Promise<PrismaClient> {
  const newClient = await recreatePrismaClient();
  // Update the module-level export by reassigning (this won't affect existing imports)
  // The global instance is updated, so new imports will get the new client
  return newClient;
}

// Handle Prisma panics by recreating the client
process.on('unhandledRejection', async (reason: any) => {
  if (reason?.name === 'PrismaClientRustPanicError' || reason instanceof PrismaClientRustPanicError) {
    logger.error('Prisma panic detected in unhandled rejection, recreating client...');
    try {
      await recreatePrisma();
    } catch (error: any) {
      logger.error({ error: error.message }, 'Failed to recreate Prisma Client');
    }
  }
});

if (process.env.NODE_ENV !== 'production') {
  // Initialize the global instance
  getPrismaClient();
}

// Graceful shutdown
process.on('beforeExit', async () => {
  if (globalForPrisma.prisma) {
    await globalForPrisma.prisma.$disconnect();
  }
});

