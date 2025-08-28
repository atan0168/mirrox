/**
 * Rate limiter service to manage API request rates and handle OpenAQ rate limits
 * Tracks rate limit headers and implements delays when approaching limits
 */

interface RateLimitInfo {
  used: number;
  remaining: number;
  limit: number;
  reset: number; // timestamp when rate limit resets
  lastUpdated: number;
}

class RateLimiterService {
  private rateLimitInfo: RateLimitInfo | null = null;
  private requestQueue: Array<() => void> = [];
  private isProcessingQueue = false;

  // Conservative defaults (slightly below OpenAQ limits for safety)
  private readonly DEFAULT_LIMIT = 50; // 60/min actual limit
  private readonly DEFAULT_RESET_INTERVAL = 60 * 1000; // 1 minute

  /**
   * Update rate limit information from response headers
   * @param headers Response headers from OpenAQ API
   */
  updateFromHeaders(headers: Record<string, string | string[]>): void {
    const used = this.getHeaderValue(headers, "x-ratelimit-used");
    const remaining = this.getHeaderValue(headers, "x-ratelimit-remaining");
    const limit = this.getHeaderValue(headers, "x-ratelimit-limit");
    const reset = this.getHeaderValue(headers, "x-ratelimit-reset");

    if (
      used !== null &&
      remaining !== null &&
      limit !== null &&
      reset !== null
    ) {
      this.rateLimitInfo = {
        used,
        remaining,
        limit,
        reset: Date.now() + reset * 1000, // reset is in seconds, convert to absolute timestamp
        lastUpdated: Date.now(),
      };

      console.log(
        `Rate limit updated: ${used}/${limit} used, ${remaining} remaining, resets in ${reset}s`,
      );
    }
  }

  /**
   * Check if we can make a request now or if we should wait
   * @returns Delay in milliseconds (0 if can proceed immediately)
   */
  async checkRateLimit(): Promise<number> {
    if (!this.rateLimitInfo) {
      // No rate limit info yet, proceed but be conservative
      return 0;
    }

    const now = Date.now();

    // Check if rate limit period has reset
    if (now >= this.rateLimitInfo.reset) {
      // Rate limit has reset, clear old info
      this.rateLimitInfo = null;
      return 0;
    }

    // Check if we're approaching the limit
    const safetyBuffer = Math.max(
      5,
      Math.floor(this.rateLimitInfo.limit * 0.1),
    ); // 10% buffer or 5, whichever is larger

    if (this.rateLimitInfo.remaining <= safetyBuffer) {
      // Too close to limit, wait until reset
      const delayUntilReset = this.rateLimitInfo.reset - now;
      console.warn(
        `Rate limit approaching, waiting ${Math.ceil(delayUntilReset / 1000)}s until reset`,
      );
      return delayUntilReset + 1000; // Add 1 second buffer
    }

    // Check if we should add a small delay to spread out requests
    if (this.rateLimitInfo.remaining < this.rateLimitInfo.limit / 2) {
      // Add small delay when we've used more than half our quota
      return 1000; // 1 second delay
    }

    return 0; // Can proceed immediately
  }

  /**
   * Wait for rate limit if necessary and execute a function
   * @param fn Function to execute after rate limit check
   * @returns Promise that resolves with the function result
   */
  async executeWithRateLimit<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.requestQueue.push(async () => {
        try {
          const delay = await this.checkRateLimit();

          if (delay > 0) {
            console.log(`Delaying request by ${delay}ms due to rate limiting`);
            await this.sleep(delay);
          }

          const result = await fn();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });

      this.processQueue();
    });
  }

  /**
   * Process the request queue sequentially
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessingQueue || this.requestQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;

    while (this.requestQueue.length > 0) {
      const nextRequest = this.requestQueue.shift();
      if (nextRequest) {
        await nextRequest();
        // Small delay between requests to be respectful
        await this.sleep(100);
      }
    }

    this.isProcessingQueue = false;
  }

  /**
   * Get current rate limit status
   */
  getRateLimitStatus(): RateLimitInfo | null {
    if (!this.rateLimitInfo) {
      return null;
    }

    // Check if info is still valid
    if (Date.now() >= this.rateLimitInfo.reset) {
      this.rateLimitInfo = null;
      return null;
    }

    return { ...this.rateLimitInfo };
  }

  /**
   * Check if we're currently rate limited
   */
  isRateLimited(): boolean {
    const status = this.getRateLimitStatus();
    if (!status) return false;

    return status.remaining <= 0 && Date.now() < status.reset;
  }

  /**
   * Get time until rate limit resets
   * @returns Milliseconds until reset, or 0 if not rate limited
   */
  getTimeUntilReset(): number {
    const status = this.getRateLimitStatus();
    if (!status) return 0;

    const timeUntilReset = status.reset - Date.now();
    return Math.max(0, timeUntilReset);
  }

  /**
   * Extract numeric value from header
   */
  private getHeaderValue(
    headers: Record<string, string | string[]>,
    key: string,
  ): number | null {
    const value = headers[key];
    if (typeof value === "string") {
      const parsed = parseInt(value, 10);
      return isNaN(parsed) ? null : parsed;
    } else if (
      Array.isArray(value) &&
      value.length > 0 &&
      value[0] !== undefined
    ) {
      const parsed = parseInt(value[0], 10);
      return isNaN(parsed) ? null : parsed;
    }
    return null;
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Reset rate limiter (useful for testing or manual reset)
   */
  reset(): void {
    this.rateLimitInfo = null;
    this.requestQueue = [];
    this.isProcessingQueue = false;
  }
}

export const rateLimiterService = new RateLimiterService();
