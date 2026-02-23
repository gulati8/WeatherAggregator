import { getRedis } from './redis';

/**
 * Redis-based fixed-window rate limiter.
 * Survives restarts and works across replicas.
 */
class RateLimiter {
  private readonly maxRequests: number;
  private readonly windowMs: number;
  private readonly keyPrefix: string;

  constructor(maxRequestsPerMinute: number, keyPrefix = 'ratelimit') {
    this.maxRequests = maxRequestsPerMinute;
    this.windowMs = 60000; // 1 minute window
    this.keyPrefix = keyPrefix;
  }

  async acquire(): Promise<void> {
    const redis = getRedis();
    const windowKey = `${this.keyPrefix}:${Math.floor(Date.now() / this.windowMs)}`;

    const current = await redis.incr(windowKey);
    if (current === 1) {
      // First request in this window — set expiry
      await redis.expire(windowKey, Math.ceil(this.windowMs / 1000) + 1);
    }

    if (current > this.maxRequests) {
      // Over limit — wait until next window
      const remainingMs = this.windowMs - (Date.now() % this.windowMs);
      await new Promise((resolve) => setTimeout(resolve, remainingMs));
    }
  }
}

// AWC rate limiter: 80 req/min (conservative margin under 100 limit)
export const awcRateLimiter = new RateLimiter(80, 'ratelimit:awc');
