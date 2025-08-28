/**
 * AQICN-specific rate limiter service
 * Handles client-side rate limiting for AQICN API since they don't provide rate limit headers
 */

import config from "../utils/config";

interface AQICNRateLimitState {
  requestCount: number;
  windowStart: number;
  lastRequestTime: number;
}

class AQICNRateLimiterService {
  private state: AQICNRateLimitState;
  private readonly requestsPerMinute: number;
  private readonly windowMs: number;
  private readonly minRequestInterval: number; // Minimum time between requests

  constructor() {
    this.requestsPerMinute = config.aqicn.rateLimit.requestsPerMinute;
    this.windowMs = config.aqicn.rateLimit.windowMs;
    this.minRequestInterval = this.windowMs / this.requestsPerMinute; // Spread requests evenly

    this.state = {
      requestCount: 0,
      windowStart: Date.now(),
      lastRequestTime: 0,
    };
  }

  /**
   * Execute a function with rate limiting
   * @param fn Function to execute after rate limit check
   * @returns Promise that resolves with the function result
   */
  async executeWithRateLimit<T>(fn: () => Promise<T>): Promise<T> {
    const delay = await this.calculateDelay();

    if (delay > 0) {
      console.log(`AQICN rate limit: waiting ${delay}ms before request`);
      await this.sleep(delay);
    }

    this.recordRequest();
    return await fn();
  }

  /**
   * Calculate how long to wait before making the next request
   * @returns Delay in milliseconds
   */
  private async calculateDelay(): Promise<number> {
    const now = Date.now();

    // Reset window if enough time has passed
    if (now - this.state.windowStart >= this.windowMs) {
      this.resetWindow(now);
      return 0;
    }

    // Check if we've hit the rate limit
    if (this.state.requestCount >= this.requestsPerMinute) {
      // Wait until the window resets
      const timeUntilReset = this.windowMs - (now - this.state.windowStart);
      return timeUntilReset + 100; // Add small buffer
    }

    // Enforce minimum interval between requests to spread them evenly
    const timeSinceLastRequest = now - this.state.lastRequestTime;
    if (timeSinceLastRequest < this.minRequestInterval) {
      return this.minRequestInterval - timeSinceLastRequest;
    }

    return 0;
  }

  /**
   * Record that a request was made
   */
  private recordRequest(): void {
    const now = Date.now();
    this.state.requestCount++;
    this.state.lastRequestTime = now;
  }

  /**
   * Reset the rate limiting window
   */
  private resetWindow(now: number): void {
    this.state = {
      requestCount: 0,
      windowStart: now,
      lastRequestTime: this.state.lastRequestTime,
    };
  }

  /**
   * Get current rate limit status
   */
  getRateLimitStatus(): {
    requestCount: number;
    limit: number;
    remaining: number;
    windowStart: number;
    timeUntilReset: number;
    lastRequestTime: number;
  } {
    const now = Date.now();
    const timeUntilReset = Math.max(
      0,
      this.windowMs - (now - this.state.windowStart),
    );

    return {
      requestCount: this.state.requestCount,
      limit: this.requestsPerMinute,
      remaining: Math.max(0, this.requestsPerMinute - this.state.requestCount),
      windowStart: this.state.windowStart,
      timeUntilReset,
      lastRequestTime: this.state.lastRequestTime,
    };
  }

  /**
   * Check if currently rate limited
   */
  isRateLimited(): boolean {
    const now = Date.now();

    // Check if window has reset
    if (now - this.state.windowStart >= this.windowMs) {
      return false;
    }

    return this.state.requestCount >= this.requestsPerMinute;
  }

  /**
   * Get time until next request can be made
   */
  getTimeUntilNextRequest(): number {
    const now = Date.now();

    // If window has reset, can make request immediately
    if (now - this.state.windowStart >= this.windowMs) {
      return 0;
    }

    // If at limit, wait until window resets
    if (this.state.requestCount >= this.requestsPerMinute) {
      return this.windowMs - (now - this.state.windowStart);
    }

    // Check minimum interval
    const timeSinceLastRequest = now - this.state.lastRequestTime;
    if (timeSinceLastRequest < this.minRequestInterval) {
      return this.minRequestInterval - timeSinceLastRequest;
    }

    return 0;
  }

  /**
   * Reset the rate limiter (useful for testing)
   */
  reset(): void {
    this.state = {
      requestCount: 0,
      windowStart: Date.now(),
      lastRequestTime: 0,
    };
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get service health status
   */
  getServiceStatus(): {
    rateLimit: {
      requestCount: number;
      limit: number;
      remaining: number;
      windowStart: number;
      timeUntilReset: number;
      lastRequestTime: number;
    };
    config: {
      requestsPerMinute: number;
      windowMs: number;
      minRequestInterval: number;
    };
  } {
    return {
      rateLimit: this.getRateLimitStatus(),
      config: {
        requestsPerMinute: this.requestsPerMinute,
        windowMs: this.windowMs,
        minRequestInterval: this.minRequestInterval,
      },
    };
  }
}

export const aqicnRateLimiterService = new AQICNRateLimiterService();
