/**
 * Simple token-bucket rate limiter for external API calls.
 * AWC limits to 100 requests/minute.
 */
class RateLimiter {
  private tokens: number;
  private lastRefill: number;
  private readonly maxTokens: number;
  private readonly refillRate: number; // tokens per ms
  private queue: Array<{ resolve: () => void; reject: (err: Error) => void }> = [];
  private draining = false;

  constructor(maxRequestsPerMinute: number) {
    this.maxTokens = maxRequestsPerMinute;
    this.tokens = maxRequestsPerMinute;
    this.lastRefill = Date.now();
    this.refillRate = maxRequestsPerMinute / 60000; // per ms
  }

  private refill(): void {
    const now = Date.now();
    const elapsed = now - this.lastRefill;
    this.tokens = Math.min(this.maxTokens, this.tokens + elapsed * this.refillRate);
    this.lastRefill = now;
  }

  async acquire(): Promise<void> {
    this.refill();

    if (this.tokens >= 1) {
      this.tokens -= 1;
      return;
    }

    // Wait for a token to become available
    return new Promise((resolve, reject) => {
      this.queue.push({ resolve, reject });
      this.scheduleDrain();
    });
  }

  private scheduleDrain(): void {
    if (this.draining) return;
    this.draining = true;

    const drain = () => {
      this.refill();

      while (this.queue.length > 0 && this.tokens >= 1) {
        this.tokens -= 1;
        const next = this.queue.shift()!;
        next.resolve();
      }

      if (this.queue.length > 0) {
        // Wait until at least one token is available
        const waitMs = Math.ceil(1 / this.refillRate);
        setTimeout(drain, waitMs);
      } else {
        this.draining = false;
      }
    };

    const waitMs = Math.ceil(1 / this.refillRate);
    setTimeout(drain, waitMs);
  }
}

// AWC rate limiter: 80 req/min (conservative margin under 100 limit)
export const awcRateLimiter = new RateLimiter(80);
