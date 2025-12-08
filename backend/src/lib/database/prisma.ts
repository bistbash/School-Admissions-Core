import { PrismaClient } from '@prisma/client';
import { PrismaClientRustPanicError } from '@prisma/client/runtime/library';

// Singleton pattern for Prisma Client
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * Create a new Prisma Client instance
 */
function createPrismaClient(): PrismaClient {
  // Only log queries if explicitly enabled via PRISMA_LOG_QUERIES env var
  // This reduces console noise in development
  const shouldLogQueries = process.env.PRISMA_LOG_QUERIES === 'true';
  const logLevels = shouldLogQueries 
    ? ['query', 'error', 'warn'] 
    : process.env.NODE_ENV === 'development' 
      ? ['error', 'warn'] 
      : ['error'];
  
  return new PrismaClient({
    log: logLevels,
    // SQLite doesn't support connection pooling, but we can configure other options
    // For SQLite, we rely on retry logic and query simplification instead
  });
}

/**
 * Get or create Prisma Client instance
 * Always returns the current instance from global
 */
function getPrismaClient(): PrismaClient {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createPrismaClient();
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
    } catch (error) {
      console.error('Error disconnecting Prisma Client:', error);
    }
  }
  
  globalForPrisma.prisma = createPrismaClient();
  console.log('Prisma Client recreated after panic');
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
    console.error('Prisma panic detected in unhandled rejection, recreating client...');
    try {
      await recreatePrisma();
    } catch (error) {
      console.error('Failed to recreate Prisma Client:', error);
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

