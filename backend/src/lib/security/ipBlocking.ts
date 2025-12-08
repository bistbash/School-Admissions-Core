import { Request, Response, NextFunction } from 'express';
import { prisma, recreatePrisma } from '../database/prisma';
import { ForbiddenError } from '../utils/errors';
import { isTrustedUser } from './trustedUsers';
import { PrismaClientRustPanicError } from '@prisma/client/runtime/library';
import { retryPrismaOperation } from '../database/prisma-retry';

/**
 * Check if an IP address is blocked
 * IMPORTANT: Admin and trusted users are never blocked
 */
export async function isIPBlocked(ipAddress: string, userId?: number): Promise<boolean> {
  if (!ipAddress) return false;

  // Check if user is admin first - admins are never blocked
  if (userId) {
    try {
      // Use dynamic import to get the latest Prisma Client instance
      const { prisma: prismaClient } = await import('./prisma');
      const soldier = await retryPrismaOperation(async () => {
        const client = await import('./prisma').then(m => m.prisma);
        return client.soldier.findUnique({
          where: { id: userId },
          select: { isAdmin: true },
        });
      });
      
      if (soldier?.isAdmin) {
        return false; // Admins are never blocked
      }
    } catch (error) {
      // If check fails, continue to other checks
      if (error instanceof PrismaClientRustPanicError || (error as any)?.name === 'PrismaClientRustPanicError') {
        console.error('Prisma panic while checking admin status, recreating client...');
        await recreatePrisma().catch(console.error);
      }
      console.error('Error checking admin status:', error);
    }
  }

  // Check if user is trusted - trusted users are never blocked
  if (userId) {
    const isTrusted = await isTrustedUser(userId, ipAddress);
    if (isTrusted) {
      return false; // Trusted users are never blocked
    }
  }

  // Also check IP-only whitelist
  const isTrustedIP = await isTrustedUser(undefined, ipAddress);
  if (isTrustedIP) {
    return false; // Trusted IPs are never blocked
  }

  try {
    const blocked = await retryPrismaOperation(async () => {
      // Get fresh Prisma Client instance
      const { prisma: prismaClient } = await import('./prisma');
      return prismaClient.blockedIP.findFirst({
        where: {
          ipAddress,
          isActive: true,
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: new Date() } },
          ],
        },
      });
    });

    return !!blocked;
  } catch (error) {
    // If Prisma crashes, log error but don't block requests
    if (error instanceof PrismaClientRustPanicError || (error as any)?.name === 'PrismaClientRustPanicError') {
      console.error('Prisma panic while checking IP block status, recreating client...');
      await recreatePrisma().catch(console.error);
    }
    console.error('Error checking IP block status:', error);
    return false;
  }
}

/**
 * Block an IP address
 */
export async function blockIP(
  ipAddress: string,
  reason?: string,
  blockedBy?: number,
  expiresAt?: Date
) {
  // Check if already blocked
  const existing = await prisma.blockedIP.findUnique({
    where: { ipAddress },
  });

  if (existing) {
    // Update existing block
    return prisma.blockedIP.update({
      where: { ipAddress },
      data: {
        reason,
        blockedBy,
        expiresAt,
        isActive: true,
      },
    });
  }

  // Create new block
  return prisma.blockedIP.create({
    data: {
      ipAddress,
      reason,
      blockedBy,
      expiresAt,
      isActive: true,
    },
  });
}

/**
 * Unblock an IP address
 */
export async function unblockIP(ipAddress: string) {
  return prisma.blockedIP.updateMany({
    where: { ipAddress },
    data: { isActive: false },
  });
}

/**
 * Get client IP address from request
 */
export function getClientIp(req: Request): string | undefined {
  return (
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    (req.headers['x-real-ip'] as string) ||
    req.socket.remoteAddress ||
    undefined
  );
}

/**
 * Middleware to block requests from blocked IPs
 */
export async function ipBlockingMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const ipAddress = getClientIp(req);
    const user = (req as any).user;
    const apiKey = (req as any).apiKey;
    const userId = user?.userId || apiKey?.userId;

    if (ipAddress) {
      const isBlocked = await isIPBlocked(ipAddress, userId);
      if (isBlocked) {
        // Log the blocked attempt
        const { auditFromRequest } = await import('./audit');
        await auditFromRequest(req, 'UNAUTHORIZED_ACCESS', 'SYSTEM', {
          status: 'FAILURE',
          errorMessage: 'IP address is blocked',
          details: { ipAddress, userId },
        }).catch(console.error);

        throw new ForbiddenError('Access denied: IP address is blocked');
      }
    }

    next();
  } catch (error) {
    next(error);
  }
}

