import * as SQLite from 'expo-sqlite';
import * as FileSystem from 'expo-file-system';
import { UserProfile } from "../models/User";

const DB_NAME = 'localstorage.db';
const TABLE_NAME = 'kv';
const CACHE_TABLE_NAME = 'avatar_cache';
const USER_PROFILE_KEY = 'user_profile';
const AVATAR_URL_KEY = 'avatar_url';
const CURRENT_SCHEMA_VERSION = 2; // Incremented for cache table

interface CachedAvatar {
  avatarId: string;
  localPath: string;
  remoteUrl: string;
  downloadedAt: number;
  fileSize: number;
}

export class LocalStorageService {
  private db: SQLite.SQLiteDatabase;
  private ready: Promise<void>;

  constructor() {
    this.db = SQLite.openDatabaseSync(DB_NAME);
    this.ready = this.init();
  }

  private async init() {
    // Create simple key-value table
    await this.db.execAsync(`CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (key TEXT PRIMARY KEY NOT NULL, value TEXT);`);
    
    // Create avatar cache table
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS ${CACHE_TABLE_NAME} (
        avatarId TEXT PRIMARY KEY NOT NULL,
        localPath TEXT NOT NULL,
        remoteUrl TEXT NOT NULL,
        downloadedAt INTEGER NOT NULL,
        fileSize INTEGER NOT NULL
      );
    `);

    // Ensure avatars directory exists
    const avatarsDir = `${FileSystem.documentDirectory}avatars/`;
    const dirInfo = await FileSystem.getInfoAsync(avatarsDir);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(avatarsDir, { intermediates: true });
    }
  }

  private async setItem(key: string, value: string): Promise<void> {
    await this.ready;
    await this.db.runAsync(
      `INSERT OR REPLACE INTO ${TABLE_NAME} (key, value) VALUES (?, ?);`,
      [key, value],
    );
  }

  private async getItem(key: string): Promise<string | null> {
    await this.ready;
    const result = await this.db.getFirstAsync<{value: string}>(`SELECT value FROM ${TABLE_NAME} WHERE key = ? LIMIT 1;`, [key]);
    return result?.value || null;
  }

  private async clearAll(): Promise<void> {
    await this.ready;
    await this.db.runAsync(`DELETE FROM ${TABLE_NAME};`);
  }

  public async saveUserProfile(profile: UserProfile): Promise<void> {
    try {
      const withVersion = { ...(profile as any), schemaVersion: profile.schemaVersion || CURRENT_SCHEMA_VERSION };
      await this.setItem(USER_PROFILE_KEY, JSON.stringify(withVersion));
    } catch (error) {
      console.error('Failed to save user profile:', error);
    }
  }

  public async getUserProfile(): Promise<UserProfile | null> {
    try {
      const profileJson = await this.getItem(USER_PROFILE_KEY);
      if (profileJson) {
        let profile = JSON.parse(profileJson);
        if ((profile.schemaVersion || 1) < CURRENT_SCHEMA_VERSION) {
          profile = this.migrateProfile(profile);
          await this.saveUserProfile(profile);
        }
        return profile as UserProfile;
      }
      return null;
    } catch (error) {
      console.error('Failed to retrieve user profile:', error);
      return null;
    }
  }

  public async saveAvatarUrl(url: string): Promise<void> {
    try {
      await this.setItem(AVATAR_URL_KEY, url);
    } catch (error) {
      console.error('Failed to save avatar URL:', error);
    }
  }

  public async getAvatarUrl(): Promise<string | null> {
    try {
      return await this.getItem(AVATAR_URL_KEY);
    } catch (error) {
      console.error('Failed to retrieve avatar URL:', error);
      return null;
    }
  }

  public async clearData(): Promise<void> {
    try {
      await this.clearAll();
    } catch (error) {
      console.error('Failed to clear storage:', error);
    }
  }

  private migrateProfile(profile: any): UserProfile {
    const version = profile.schemaVersion || 1;
    // Add migration steps here as schema evolves
    profile.schemaVersion = CURRENT_SCHEMA_VERSION;
    return profile as UserProfile;
  }

  // ===== GLB CACHING METHODS =====

  /**
   * Extract avatar ID from a Ready Player Me GLB URL
   */
  private extractAvatarId(url: string): string | null {
    const match = url.match(/\/([a-f0-9]{24})\.glb/);
    return match ? match[1] : null;
  }

  /**
   * Get cached avatar path if it exists and is valid
   */
  public async getCachedAvatarPath(avatarId: string): Promise<string | null> {
    try {
      await this.ready;
      
      // Check database for cache entry
      const result = await this.db.getFirstAsync<CachedAvatar>(
        `SELECT * FROM ${CACHE_TABLE_NAME} WHERE avatarId = ? LIMIT 1;`,
        [avatarId]
      );

      if (!result) {
        return null;
      }

      // Verify file still exists
      const fileInfo = await FileSystem.getInfoAsync(result.localPath);
      if (!fileInfo.exists) {
        // File was deleted, clean up database entry
        await this.removeCachedAvatar(avatarId);
        return null;
      }

      console.log(`Found cached avatar: ${avatarId} at ${result.localPath}`);
      return result.localPath;
    } catch (error) {
      console.error('Error checking cached avatar:', error);
      return null;
    }
  }

  /**
   * Download and cache a GLB file from URL
   */
  public async downloadAndCacheAvatar(remoteUrl: string): Promise<string | null> {
    try {
      await this.ready;
      
      const avatarId = this.extractAvatarId(remoteUrl);
      if (!avatarId) {
        console.error('Could not extract avatar ID from URL:', remoteUrl);
        return null;
      }

      // Check if already cached
      const cachedPath = await this.getCachedAvatarPath(avatarId);
      if (cachedPath) {
        return cachedPath;
      }

      console.log(`Downloading avatar ${avatarId} from ${remoteUrl}`);
      
      const localPath = `${FileSystem.documentDirectory}avatars/${avatarId}.glb`;
      
      // Download the file
      const downloadResult = await FileSystem.downloadAsync(remoteUrl, localPath);
      
      if (downloadResult.status !== 200) {
        throw new Error(`Download failed with status: ${downloadResult.status}`);
      }

      // Get file info for size
      const fileInfo = await FileSystem.getInfoAsync(localPath);
      const fileSize = fileInfo.size || 0;

      // Save to cache database
      await this.db.runAsync(
        `INSERT OR REPLACE INTO ${CACHE_TABLE_NAME} (avatarId, localPath, remoteUrl, downloadedAt, fileSize) VALUES (?, ?, ?, ?, ?);`,
        [avatarId, localPath, remoteUrl, Date.now(), fileSize]
      );

      console.log(`Successfully cached avatar ${avatarId} (${fileSize} bytes)`);
      return localPath;
    } catch (error) {
      console.error('Error downloading and caching avatar:', error);
      return null;
    }
  }

  /**
   * Get avatar URL with caching - checks cache first, downloads if needed
   */
  public async getAvatarWithCaching(remoteUrl?: string): Promise<string | null> {
    try {
      // First try to get from saved URL if no remote URL provided
      const url = remoteUrl || await this.getAvatarUrl();
      if (!url) {
        return null;
      }

      const avatarId = this.extractAvatarId(url);
      if (!avatarId) {
        // If we can't extract ID, just return the remote URL
        return url;
      }

      // Check cache first
      const cachedPath = await this.getCachedAvatarPath(avatarId);
      if (cachedPath) {
        return cachedPath;
      }

      // Download and cache
      const downloadedPath = await this.downloadAndCacheAvatar(url);
      return downloadedPath || url; // Fallback to remote URL if download fails
    } catch (error) {
      console.error('Error getting avatar with caching:', error);
      return remoteUrl || await this.getAvatarUrl();
    }
  }

  /**
   * Remove a specific cached avatar
   */
  public async removeCachedAvatar(avatarId: string): Promise<void> {
    try {
      await this.ready;
      
      // Get cache entry
      const result = await this.db.getFirstAsync<CachedAvatar>(
        `SELECT * FROM ${CACHE_TABLE_NAME} WHERE avatarId = ? LIMIT 1;`,
        [avatarId]
      );

      if (result) {
        // Delete file
        const fileInfo = await FileSystem.getInfoAsync(result.localPath);
        if (fileInfo.exists) {
          await FileSystem.deleteAsync(result.localPath);
        }

        // Remove from database
        await this.db.runAsync(
          `DELETE FROM ${CACHE_TABLE_NAME} WHERE avatarId = ?;`,
          [avatarId]
        );

        console.log(`Removed cached avatar: ${avatarId}`);
      }
    } catch (error) {
      console.error('Error removing cached avatar:', error);
    }
  }

  /**
   * Clear all cached avatars
   */
  public async clearAvatarCache(): Promise<void> {
    try {
      await this.ready;
      
      // Get all cached avatars
      const results = await this.db.getAllAsync<CachedAvatar>(
        `SELECT * FROM ${CACHE_TABLE_NAME};`
      );

      // Delete all files
      for (const cached of results) {
        try {
          const fileInfo = await FileSystem.getInfoAsync(cached.localPath);
          if (fileInfo.exists) {
            await FileSystem.deleteAsync(cached.localPath);
          }
        } catch (error) {
          console.warn(`Failed to delete cached file: ${cached.localPath}`, error);
        }
      }

      // Clear database
      await this.db.runAsync(`DELETE FROM ${CACHE_TABLE_NAME};`);
      
      console.log(`Cleared ${results.length} cached avatars`);
    } catch (error) {
      console.error('Error clearing avatar cache:', error);
    }
  }

  /**
   * Get cache statistics
   */
  public async getCacheStats(): Promise<{
    totalFiles: number;
    totalSize: number;
    oldestDownload: number | null;
    newestDownload: number | null;
  }> {
    try {
      await this.ready;
      
      const results = await this.db.getAllAsync<CachedAvatar>(
        `SELECT * FROM ${CACHE_TABLE_NAME};`
      );

      const totalFiles = results.length;
      const totalSize = results.reduce((sum, item) => sum + item.fileSize, 0);
      const downloadTimes = results.map(item => item.downloadedAt);
      
      return {
        totalFiles,
        totalSize,
        oldestDownload: downloadTimes.length > 0 ? Math.min(...downloadTimes) : null,
        newestDownload: downloadTimes.length > 0 ? Math.max(...downloadTimes) : null,
      };
    } catch (error) {
      console.error('Error getting cache stats:', error);
      return { totalFiles: 0, totalSize: 0, oldestDownload: null, newestDownload: null };
    }
  }

  /**
   * Clean up old cached avatars (older than specified days)
   */
  public async cleanupOldCache(maxAgeInDays: number = 30): Promise<number> {
    try {
      await this.ready;
      
      const cutoffTime = Date.now() - (maxAgeInDays * 24 * 60 * 60 * 1000);
      
      // Get old entries
      const oldEntries = await this.db.getAllAsync<CachedAvatar>(
        `SELECT * FROM ${CACHE_TABLE_NAME} WHERE downloadedAt < ?;`,
        [cutoffTime]
      );

      // Delete old files and database entries
      for (const entry of oldEntries) {
        await this.removeCachedAvatar(entry.avatarId);
      }

      console.log(`Cleaned up ${oldEntries.length} old cached avatars`);
      return oldEntries.length;
    } catch (error) {
      console.error('Error cleaning up old cache:', error);
      return 0;
    }
  }
}

// Export singleton
export const localStorageService = new LocalStorageService();
