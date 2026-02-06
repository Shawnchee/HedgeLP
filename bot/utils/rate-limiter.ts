/**
 * Simple in-memory, per-user sliding-window rate limiter.
 *
 * Stores timestamps of recent commands per user and rejects
 * when the count within the window exceeds the maximum.
 */

interface RateBucket {
  timestamps: number[];
}

export class RateLimiter {
  private buckets = new Map<number, RateBucket>();
  private readonly maxRequests: number;
  private readonly windowMs: number;
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;

  constructor(maxRequests: number, windowSec: number) {
    this.maxRequests = maxRequests;
    this.windowMs = windowSec * 1000;

    // Periodic cleanup of stale entries every 5 minutes
    this.cleanupTimer = setInterval(() => this.cleanup(), 5 * 60 * 1000);
    // Don't keep Node process alive just for cleanup
    if (this.cleanupTimer.unref) {
      this.cleanupTimer.unref();
    }
  }

  /**
   * Check if the user is allowed to execute a command.
   * Returns `true` if allowed, `false` if rate-limited.
   * Automatically records the request if allowed.
   */
  check(userId: number): boolean {
    const now = Date.now();
    const cutoff = now - this.windowMs;

    let bucket = this.buckets.get(userId);
    if (!bucket) {
      bucket = { timestamps: [] };
      this.buckets.set(userId, bucket);
    }

    // Prune old timestamps
    bucket.timestamps = bucket.timestamps.filter((ts) => ts > cutoff);

    if (bucket.timestamps.length >= this.maxRequests) {
      return false;
    }

    bucket.timestamps.push(now);
    return true;
  }

  /** Seconds until the oldest request in the window expires (for retry-after). */
  retryAfterSec(userId: number): number {
    const bucket = this.buckets.get(userId);
    if (!bucket || bucket.timestamps.length === 0) return 0;
    const oldest = bucket.timestamps[0];
    const remainMs = this.windowMs - (Date.now() - oldest);
    return Math.max(1, Math.ceil(remainMs / 1000));
  }

  /** Remove stale buckets. */
  private cleanup(): void {
    const cutoff = Date.now() - this.windowMs;
    for (const [userId, bucket] of this.buckets.entries()) {
      bucket.timestamps = bucket.timestamps.filter((ts) => ts > cutoff);
      if (bucket.timestamps.length === 0) {
        this.buckets.delete(userId);
      }
    }
  }

  /** Shut down the cleanup timer (for graceful shutdown). */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    this.buckets.clear();
  }
}
