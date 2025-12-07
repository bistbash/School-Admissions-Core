import { Request, Response, NextFunction } from 'express';
import { prisma } from './prisma';
import { ForbiddenError } from './errors';
import { isTrustedUser } from './trustedUsers';

/**
 * Check if an IP address is blocked
 * IMPORTANT: Trusted users are never blocked
 */
export async function isIPBlocked(ipAddress: string, userId?: number): Promise<boolean> {
  if (!ipAddress) return false;

  // Check if user is trusted first - trusted users are never blocked
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
    const blocked = await prisma.blockedIP.findFirst({
      where: {
        ipAddress,
        isActive: true,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } },
        ],
      },
    });

    return !!blocked;
  } catch (error) {
    // If Prisma crashes, log error but don't block requests
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

