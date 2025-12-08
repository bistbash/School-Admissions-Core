import { Request } from 'express';
import { prisma } from '../database/prisma';

// Simple in-memory cache for trusted user checks (5 minute TTL)
// This helps reduce database load during bulk operations
const trustedUserCache = new Map<string, { result: boolean; expiresAt: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Check if a user is trusted (whitelisted)
 * Checks by userId, IP address, or email
 * Includes retry logic and caching to prevent Prisma panics during bulk operations
 */
export async function isTrustedUser(
  userId?: number,
  ipAddress?: string,
  email?: string
): Promise<boolean> {
  try {
    // Check cache first
    const cacheKey = `trusted:${userId || ''}:${ipAddress || ''}:${email || ''}`;
    const cached = trustedUserCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.result;
    }

    const now = new Date();
    
    // Build OR conditions for userId, ipAddress, email
    const userConditions = [];
    if (userId) userConditions.push({ userId });
    if (ipAddress) userConditions.push({ ipAddress });
    if (email) userConditions.push({ email });

    if (userConditions.length === 0) {
      return false; // No conditions to check
    }

    // Retry logic to handle Prisma panics during high load
    let lastError: any = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const trusted = await prisma.trustedUser.findFirst({
          where: {
            isActive: true,
            AND: [
              {
                OR: userConditions,
              },
              {
                OR: [
                  { expiresAt: null },
                  { expiresAt: { gt: now } },
                ],
              },
            ],
          },
        });

        const result = !!trusted;
        
        // Cache the result
        trustedUserCache.set(cacheKey, {
          result,
          expiresAt: Date.now() + CACHE_TTL,
        });

        return result;
      } catch (error: any) {
        lastError = error;
        
        // If it's a Prisma panic, wait a bit before retrying
        if (error.name === 'PrismaClientRustPanicError' && attempt < 2) {
          await new Promise(resolve => setTimeout(resolve, 100 * (attempt + 1))); // 100ms, 200ms, 300ms
          continue;
        }
        
        // For other errors or last attempt, throw
        throw error;
      }
    }

    // If all retries failed, log and return false (fail open for availability)
    console.error('Error checking trusted user status after retries:', lastError);
    return false;
  } catch (error) {
    // If Prisma crashes, log error but don't block requests (fail open)
    console.error('Error checking trusted user status:', error);
    return false;
  }
}

/**
 * Check if request is from a trusted user
 * Checks userId from JWT/API key, IP address, and email if available
 */
export async function isRequestFromTrustedUser(req: Request): Promise<boolean> {
  const user = (req as any).user;
  const apiKey = (req as any).apiKey;
  const ipAddress = getClientIp(req);
  
  // Get userId from user or API key
  const userId = user?.userId || apiKey?.userId;
  
  // Get email from user if available (would need to fetch from database)
  // For now, we'll check by userId and IP
  
  return isTrustedUser(userId, ipAddress);
}

/**
 * Get client IP address from request
 */
function getClientIp(req: Request): string | undefined {
  return (
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    (req.headers['x-real-ip'] as string) ||
    req.socket.remoteAddress ||
    undefined
  );
}

/**
 * Add a user/IP to trusted list
 */
export async function addTrustedUser(data: {
  userId?: number;
  ipAddress?: string;
  email?: string;
  name?: string;
  reason?: string;
  createdBy?: number;
  expiresAt?: Date;
}) {
  return prisma.trustedUser.create({
    data: {
      userId: data.userId,
      ipAddress: data.ipAddress,
      email: data.email,
      name: data.name,
      reason: data.reason,
      createdBy: data.createdBy,
      expiresAt: data.expiresAt,
      isActive: true,
    },
  });
}

/**
 * Remove a user/IP from trusted list
 */
export async function removeTrustedUser(id: number) {
  return prisma.trustedUser.update({
    where: { id },
    data: { isActive: false },
  });
}

/**
 * Get all trusted users
 */
export async function getTrustedUsers() {
  return prisma.trustedUser.findMany({
    where: { isActive: true },
    orderBy: { createdAt: 'desc' },
  });
}
