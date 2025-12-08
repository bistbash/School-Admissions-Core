import { logger } from '../utils/logger';

/**
 * Simple in-memory cache for SOC queries
 * In production, consider using Redis for distributed caching
 */
interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

class SimpleCache {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private defaultTTL: number = 5 * 60 * 1000; // 5 minutes

  /**
   * Get cached value
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) {
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Set cached value
   */
  set<T>(key: string, data: T, ttl?: number): void {
    const expiresAt = Date.now() + (ttl || this.defaultTTL);
    this.cache.set(key, { data, expiresAt });
  }

  /**
   * Delete cached value
   */
  delete(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Clear expired entries
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }
}

export const socCache = new SimpleCache();

// Cleanup expired entries every minute
setInterval(() => {
  socCache.cleanup();
}, 60 * 1000);

/**
 * Generate cache key for audit log queries
 */
export function getAuditLogsCacheKey(filter: any): string {
  return `audit-logs:${JSON.stringify(filter)}`;
}

/**
 * Generate cache key for statistics
 */
export function getStatsCacheKey(startDate?: Date, endDate?: Date): string {
  return `stats:${startDate?.toISOString() || 'all'}:${endDate?.toISOString() || 'all'}`;
}

/**
 * Invalidate cache when incidents are updated
 */
export function invalidateSOCCache(): void {
  logger.debug('Invalidating SOC cache');
  socCache.clear();
}
