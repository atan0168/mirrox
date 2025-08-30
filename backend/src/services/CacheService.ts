/**
 * Simple in-memory cache service with TTL (Time To Live) support
 * Stores data with expiration times to avoid repeated API calls
 */

interface CacheItem<T> {
  data: T;
  expiresAt: number;
  createdAt: number;
}

class CacheService {
  private cache: Map<string, CacheItem<any>> = new Map();
  private defaultTTL: number = 30 * 60 * 1000; // 30 minutes default

  /**
   * Store data in cache with TTL
   * @param key Cache key
   * @param data Data to cache
   * @param ttl Time to live in milliseconds (optional, uses default if not provided)
   */
  set<T>(key: string, data: T, ttl?: number): void {
    const timeToLive = ttl || this.defaultTTL;
    const now = Date.now();

    this.cache.set(key, {
      data,
      expiresAt: now + timeToLive,
      createdAt: now,
    });

    // Clean up expired items periodically
    this.cleanup();
  }

  /**
   * Retrieve data from cache
   * @param key Cache key
   * @returns Cached data or null if not found/expired
   */
  get<T>(key: string): T | null {
    const item = this.cache.get(key);

    if (!item) {
      return null;
    }

    // Check if item has expired
    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return item.data as T;
  }

  /**
   * Check if a key exists and is not expired
   * @param key Cache key
   * @returns True if key exists and is valid
   */
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  /**
   * Remove an item from cache
   * @param key Cache key
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
   * Get cache statistics
   */
  getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }

  /**
   * Generate a cache key for location-based data
   * @param latitude Latitude
   * @param longitude Longitude
   * @param type Data type (defaults to 'air_quality')
   * @param precision Coordinate precision for grouping nearby requests
   * @returns Cache key
   */
  generateLocationKey(
    latitude: number,
    longitude: number,
    type: string = 'air_quality',
    precision: number = 3
  ): string {
    // Round coordinates to reduce cache fragmentation for nearby locations
    const roundedLat = Number(latitude.toFixed(precision));
    const roundedLon = Number(longitude.toFixed(precision));
    return `${type}_${roundedLat}_${roundedLon}`;
  }

  /**
   * Clean up expired cache items
   * This is called automatically but can be called manually
   */
  private cleanup(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiresAt) {
        expiredKeys.push(key);
      }
    }

    expiredKeys.forEach(key => this.cache.delete(key));
  }

  /**
   * Get age of cached item in milliseconds
   * @param key Cache key
   * @returns Age in milliseconds or null if not found
   */
  getAge(key: string): number | null {
    const item = this.cache.get(key);
    if (!item) return null;

    return Date.now() - item.createdAt;
  }

  /**
   * Get remaining TTL for cached item in milliseconds
   * @param key Cache key
   * @returns Remaining TTL in milliseconds or null if not found/expired
   */
  getRemainingTTL(key: string): number | null {
    const item = this.cache.get(key);
    if (!item) return null;

    const remaining = item.expiresAt - Date.now();
    return remaining > 0 ? remaining : null;
  }
}

export const cacheService = new CacheService();
