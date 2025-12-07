import { Request } from 'express';
import { prisma } from './prisma';

/**
 * Check if a user is trusted (whitelisted)
 * Checks by userId, IP address, or email
 */
export async function isTrustedUser(
  userId?: number,
  ipAddress?: string,
  email?: string
): Promise<boolean> {
  try {
    const now = new Date();
    
    // Build OR conditions for userId, ipAddress, email
    const userConditions = [];
    if (userId) userConditions.push({ userId });
    if (ipAddress) userConditions.push({ ipAddress });
    if (email) userConditions.push({ email });

    if (userConditions.length === 0) {
      return false; // No conditions to check
    }

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

    return !!trusted;
  } catch (error) {
    // If Prisma crashes, log error but don't block requests
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
