import { MMKV } from 'react-native-mmkv';
import * as FileSystem from 'expo-file-system';
import { UserProfile } from "../models/User";

/**
 * LocalStorageService - Encrypted storage service using MMKV
 * 
 * Features:
 * - Fast, efficient key-value storage using MMKV
 * - AES-256 encryption for all stored data
 * - Automatic encryption key generation and management
 * - Avatar caching with file system integration
 * 
 * Security:
 * - Encryption key is randomly generated on first use
 * - Key is stored in separate unencrypted MMKV instance for key management
 * - All user data is encrypted at rest
 */

const USER_PROFILE_KEY = 'user_profile';
const AVATAR_URL_KEY = 'avatar_url';
const AVATAR_CACHE_KEY = 'avatar_cache';
const ENCRYPTION_KEY_STORAGE_KEY = 'mmkv_encryption_key';
const CURRENT_SCHEMA_VERSION = 1; // Incremented for cache table

interface CachedAvatar {
  avatarId: string;
  localPath: string;
  remoteUrl: string;
  downloadedAt: number;
  fileSize: number;
}

export class LocalStorageService {
  private storage: MMKV;
  private keyStorage: MMKV; // Unencrypted storage for encryption key
  private ready: Promise<void>;

  constructor() {
    // Create unencrypted storage for managing encryption key
    this.keyStorage = new MMKV({
      id: 'key-storage',
    });
    
    // Get or generate encryption key
    const encryptionKey = this.getOrGenerateEncryptionKey();
    
    // Create encrypted storage
    this.storage = new MMKV({
      id: 'encrypted-storage',
      encryptionKey: encryptionKey,
    });
    
    this.ready = this.init();
  }

  private getOrGenerateEncryptionKey(): string {
    let encryptionKey = this.keyStorage.getString(ENCRYPTION_KEY_STORAGE_KEY);
    
    if (!encryptionKey) {
      // Generate a random 256-bit encryption key
      encryptionKey = this.generateRandomKey();
      this.keyStorage.set(ENCRYPTION_KEY_STORAGE_KEY, encryptionKey);
      console.log('Generated new encryption key for MMKV storage');
    }
    
    return encryptionKey;
  }

  private generateRandomKey(): string {
    // Generate a 64-character hex string (256 bits)
    const chars = '0123456789abcdef';
    let result = '';
    for (let i = 0; i < 64; i++) {
      result += chars[Math.floor(Math.random() * chars.length)];
    }
    return result;
  }

  private async init() {
    // Ensure avatars directory exists
    const avatarsDir = `${FileSystem.documentDirectory}avatars/`;
    const dirInfo = await FileSystem.getInfoAsync(avatarsDir);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(avatarsDir, { intermediates: true });
    }
  }

  private setItem(key: string, value: string): void {
    this.storage.set(key, value);
  }

  private getItem(key: string): string | undefined {
    return this.storage.getString(key);
  }

  private clearAll(): void {
    this.storage.clearAll();
  }

  private getCachedAvatarsData(): Record<string, CachedAvatar> {
    const cached = this.storage.getString(AVATAR_CACHE_KEY);
    return cached ? JSON.parse(cached) : {};
  }

  private setCachedAvatarsData(data: Record<string, CachedAvatar>): void {
    this.storage.set(AVATAR_CACHE_KEY, JSON.stringify(data));
  }

  public async saveUserProfile(profile: UserProfile): Promise<void> {
    try {
      const withVersion = { ...(profile as any), schemaVersion: profile.schemaVersion || CURRENT_SCHEMA_VERSION };
      this.setItem(USER_PROFILE_KEY, JSON.stringify(withVersion));
    } catch (error) {
      console.error('Failed to save user profile:', error);
    }
  }

  public async getUserProfile(): Promise<UserProfile | null> {
    try {
      const profileJson = this.getItem(USER_PROFILE_KEY);
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
      this.setItem(AVATAR_URL_KEY, url);
    } catch (error) {
      console.error('Failed to save avatar URL:', error);
    }
  }

  public async getAvatarUrl(): Promise<string | null> {
    try {
      return this.getItem(AVATAR_URL_KEY) || null;
    } catch (error) {
      console.error('Failed to retrieve avatar URL:', error);
      return null;
    }
  }

  public async clearData(): Promise<void> {
    try {
      this.clearAll();
    } catch (error) {
      console.error('Failed to clear storage:', error);
    }
  }

  /**
   * Complete reset - clears all data including encryption keys
   * This will make all previously stored data unrecoverable
   */
  public async completeReset(): Promise<void> {
    try {
      // Clear encrypted storage
      this.storage.clearAll();
      
      // Clear key storage (this makes old encrypted data unrecoverable)
      this.keyStorage.clearAll();
      
      // Reinitialize with new encryption key
      const newEncryptionKey = this.getOrGenerateEncryptionKey();
      this.storage = new MMKV({
        id: 'encrypted-storage',
        encryptionKey: newEncryptionKey,
      });
      
      console.log('Complete reset performed - new encryption key generated');
    } catch (error) {
      console.error('Failed to perform complete reset:', error);
    }
  }

  /**
   * Check if storage is encrypted (for debugging/info purposes)
   */
  public isEncrypted(): boolean {
    return this.keyStorage.getString(ENCRYPTION_KEY_STORAGE_KEY) !== undefined;
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
      
      // Check cache data for entry
      const cachedAvatars = this.getCachedAvatarsData();
      const cached = cachedAvatars[avatarId];

      if (!cached) {
        return null;
      }

      // Verify file still exists
      const fileInfo = await FileSystem.getInfoAsync(cached.localPath);
      if (!fileInfo.exists) {
        // File was deleted, clean up cache entry
        await this.removeCachedAvatar(avatarId);
        return null;
      }

      console.log(`Found cached avatar: ${avatarId} at ${cached.localPath}`);
      return cached.localPath;
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
      const fileSize = (fileInfo.exists && !fileInfo.isDirectory) ? (fileInfo as any).size || 0 : 0;

      // Save to cache
      const cachedAvatars = this.getCachedAvatarsData();
      cachedAvatars[avatarId] = {
        avatarId,
        localPath,
        remoteUrl,
        downloadedAt: Date.now(),
        fileSize
      };
      this.setCachedAvatarsData(cachedAvatars);

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
      const cachedAvatars = this.getCachedAvatarsData();
      const cached = cachedAvatars[avatarId];

      if (cached) {
        // Delete file
        const fileInfo = await FileSystem.getInfoAsync(cached.localPath);
        if (fileInfo.exists) {
          await FileSystem.deleteAsync(cached.localPath);
        }

        // Remove from cache
        delete cachedAvatars[avatarId];
        this.setCachedAvatarsData(cachedAvatars);

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
      const cachedAvatars = this.getCachedAvatarsData();
      const avatarEntries = Object.values(cachedAvatars);

      // Delete all files
      for (const cached of avatarEntries) {
        try {
          const fileInfo = await FileSystem.getInfoAsync(cached.localPath);
          if (fileInfo.exists) {
            await FileSystem.deleteAsync(cached.localPath);
          }
        } catch (error) {
          console.warn(`Failed to delete cached file: ${cached.localPath}`, error);
        }
      }

      // Clear cache data
      this.setCachedAvatarsData({});
      
      console.log(`Cleared ${avatarEntries.length} cached avatars`);
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
      
      const cachedAvatars = this.getCachedAvatarsData();
      const avatarEntries = Object.values(cachedAvatars);

      const totalFiles = avatarEntries.length;
      const totalSize = avatarEntries.reduce((sum: number, item: CachedAvatar) => sum + item.fileSize, 0);
      const downloadTimes = avatarEntries.map((item: CachedAvatar) => item.downloadedAt);
      
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
      const cachedAvatars = this.getCachedAvatarsData();
      const oldEntries = Object.values(cachedAvatars).filter(
        (entry: CachedAvatar) => entry.downloadedAt < cutoffTime
      );

      // Delete old files and cache entries
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
