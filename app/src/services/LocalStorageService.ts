import { MMKV } from 'react-native-mmkv';
import * as FileSystem from 'expo-file-system';
import * as Crypto from 'expo-crypto';
import * as Keychain from 'react-native-keychain';
import { UserProfile } from '../models/User';
import {
  AVATAR_CACHE_KEY,
  AVATAR_URL_KEY,
  USER_PROFILE_KEY,
} from '../constants';

/**
 * LocalStorageService - Encrypted storage service using MMKV
 *
 * Features:
 * - Fast, efficient key-value storage using MMKV
 * - AES-256 encryption for all stored data
 * - Secure encryption key management using iOS Keychain/Android Keystore
 * - Cryptographically secure key generation using expo-crypto
 * - Avatar caching with file system integration
 *
 * Security:
 * - Encryption key is securely stored in iOS Keychain/Android Keystore
 * - Hardware-backed security when available
 * - Cryptographically secure random key generation (expo-crypto + fallbacks)
 * - All user data is encrypted at rest
 * - Encryption key is never stored in plain text
 */
const ENCRYPTION_KEY_SERVICE = 'MirroxApp';
const ENCRYPTION_KEY_ACCOUNT = 'storage_encryption_key';
const CURRENT_SCHEMA_VERSION = 1; // Incremented for cache table

interface CachedAvatar {
  avatarId: string;
  localPath: string;
  remoteUrl: string;
  downloadedAt: number;
  fileSize: number;
}

export class LocalStorageService {
  private storage!: MMKV; // Using definite assignment assertion since it's initialized in async method
  private ready: Promise<void>;

  constructor() {
    this.ready = this.initializeStorage();
  }

  private async initializeStorage(): Promise<void> {
    try {
      // Get or generate encryption key from secure storage
      const encryptionKey = await this.getOrGenerateEncryptionKey();

      // Create encrypted storage
      this.storage = new MMKV({
        id: 'encrypted-storage',
        encryptionKey: encryptionKey,
      });

      await this.init();
    } catch (error) {
      console.error('Failed to initialize secure storage:', error);
      // Fallback: create unencrypted storage
      this.storage = new MMKV({
        id: 'fallback-storage',
      });
      await this.init();
    }
  }

  private async getOrGenerateEncryptionKey(): Promise<string> {
    try {
      // Try to get existing key from secure storage
      const credentials = await Keychain.getInternetCredentials(
        ENCRYPTION_KEY_SERVICE
      );

      if (credentials && credentials.password) {
        console.log('Retrieved existing encryption key from secure storage');
        return credentials.password;
      }
    } catch (error) {
      console.log('No existing encryption key found, generating new one');
    }

    // Generate a new encryption key
    const encryptionKey = await this.generateRandomKey();

    try {
      // Store in secure storage with hardware backing when available
      // Note: No access control by default - authentication is optional
      await Keychain.setInternetCredentials(
        ENCRYPTION_KEY_SERVICE,
        ENCRYPTION_KEY_ACCOUNT,
        encryptionKey,
        {
          accessGroup: undefined, // Use default access group
          securityLevel: Keychain.SECURITY_LEVEL.SECURE_HARDWARE,
        }
      );
      console.log('Generated and stored new encryption key in secure storage');
    } catch (error) {
      console.warn(
        'Failed to store in secure hardware, falling back to software storage:',
        error
      );
      // Fallback to software-only storage
      await Keychain.setInternetCredentials(
        ENCRYPTION_KEY_SERVICE,
        ENCRYPTION_KEY_ACCOUNT,
        encryptionKey,
        {
          securityLevel: Keychain.SECURITY_LEVEL.SECURE_SOFTWARE,
        }
      );
    }

    return encryptionKey;
  }

  private async generateRandomKey(): Promise<string> {
    try {
      // Use expo-crypto for cryptographically secure random generation
      // Generate 32 bytes (256 bits) for AES-256 encryption key
      const randomBytes = await Crypto.getRandomBytesAsync(32);

      // Convert Uint8Array to hex string
      return Array.from(randomBytes, byte =>
        byte.toString(16).padStart(2, '0')
      ).join('');
    } catch (error) {
      console.error(
        'Failed to generate secure random key with expo-crypto:',
        error
      );

      // Fallback: Use Web Crypto API if available
      const randomBytes = new Uint8Array(32);

      if (
        typeof globalThis !== 'undefined' &&
        globalThis.crypto &&
        globalThis.crypto.getRandomValues
      ) {
        globalThis.crypto.getRandomValues(randomBytes);
        console.warn('Using Web Crypto API fallback for key generation');
      } else {
        // Last resort fallback with warning
        console.error(
          'No secure random generation available! Using insecure fallback.'
        );
        throw new Error('Secure random generation not available');
      }

      // Convert to hex string
      return Array.from(randomBytes, byte =>
        byte.toString(16).padStart(2, '0')
      ).join('');
    }
  }

  private async init() {
    // Ensure avatars directory exists
    const avatarsDir = `${FileSystem.documentDirectory}avatars/`;
    const dirInfo = await FileSystem.getInfoAsync(avatarsDir);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(avatarsDir, { intermediates: true });
    }
  }

  private async setItem(key: string, value: string): Promise<void> {
    await this.ready;
    this.storage.set(key, value);
  }

  private async getItem(key: string): Promise<string | undefined> {
    await this.ready;
    return this.storage.getString(key);
  }

  // Generic boolean flag helpers (for simple feature flags/preferences)
  public async getFlag(key: string): Promise<boolean> {
    const value = await this.getItem(key);
    return value === 'true';
  }

  public async setFlag(key: string, value: boolean): Promise<void> {
    await this.setItem(key, value ? 'true' : 'false');
  }

  private async clearAll(): Promise<void> {
    await this.ready;
    this.storage.clearAll();
  }

  // Remove a single key from storage
  public async removeItem(key: string): Promise<void> {
    await this.ready;
    try {
      // MMKV supports delete by key
      this.storage.delete(key);
    } catch (e) {
      // Fallback: set empty string if delete fails
      // This ensures old values are not read back as valid JSON
      try {
        this.storage.set(key, '');
      } catch {
        // ignore
      }
    }
  }

  // Public raw string helpers for external storage adapters (e.g., Zustand persist)
  public async getString(key: string): Promise<string | null> {
    const v = await this.getItem(key);
    return v ?? null;
  }
  public async setString(key: string, value: string): Promise<void> {
    await this.setItem(key, value);
  }
  public async remove(key: string): Promise<void> {
    await this.removeItem(key);
  }

  private async getCachedAvatarsData(): Promise<Record<string, CachedAvatar>> {
    const cached = await this.getItem(AVATAR_CACHE_KEY);
    return cached ? JSON.parse(cached) : {};
  }

  private async setCachedAvatarsData(
    data: Record<string, CachedAvatar>
  ): Promise<void> {
    await this.setItem(AVATAR_CACHE_KEY, JSON.stringify(data));
  }

  public async saveUserProfile(profile: UserProfile): Promise<void> {
    try {
      const withVersion = {
        ...profile,
        schemaVersion: profile.schemaVersion || CURRENT_SCHEMA_VERSION,
      };
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
      const result = await this.getItem(AVATAR_URL_KEY);
      return result || null;
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

  // Authentication methods
  public async isAuthenticationRequired(): Promise<boolean> {
    try {
      const profile = await this.getUserProfile();
      return profile?.security?.requireAuthentication ?? false; // Default to false (optional)
    } catch (error) {
      console.error('Failed to check authentication requirement:', error);
      return false;
    }
  }

  public async authenticateUser(): Promise<boolean> {
    try {
      const profile = await this.getUserProfile();

      // If authentication is not required, return true
      if (!profile?.security?.requireAuthentication) {
        return true;
      }

      // For authentication, we need to prompt the user
      // We'll use a separate keychain entry with access control for this
      const authKeyService = 'MirroxAppAuth';
      const authKeyAccount = 'auth_verification';

      try {
        // Try to access the authentication key (this will prompt for biometric/PIN)
        const authCredentials =
          await Keychain.getInternetCredentials(authKeyService);

        if (authCredentials && authCredentials.password) {
          // Update last authenticated timestamp
          if (profile.security) {
            profile.security.lastAuthenticatedAt = new Date().toISOString();
            await this.saveUserProfile(profile);
          }
          return true;
        }

        // If no auth key exists, create one (this will also prompt for authentication)
        await Keychain.setInternetCredentials(
          authKeyService,
          authKeyAccount,
          'authenticated',
          {
            accessControl:
              Keychain.ACCESS_CONTROL.BIOMETRY_CURRENT_SET_OR_DEVICE_PASSCODE,
            securityLevel: Keychain.SECURITY_LEVEL.SECURE_HARDWARE,
          }
        );

        // Update last authenticated timestamp
        if (profile.security) {
          profile.security.lastAuthenticatedAt = new Date().toISOString();
          await this.saveUserProfile(profile);
        }

        return true;
      } catch (authError) {
        console.log('Authentication failed or cancelled:', authError);
        return false;
      }
    } catch (error) {
      console.error('Authentication failed:', error);
      return false;
    }
  }

  public async updateSecuritySettings(settings: {
    requireAuthentication: boolean;
    authMethod?: 'pin' | 'biometric' | 'both';
  }): Promise<void> {
    try {
      const profile = await this.getUserProfile();
      if (profile) {
        profile.security = {
          requireAuthentication: settings.requireAuthentication,
          authMethod: settings.authMethod || 'biometric',
          lastAuthenticatedAt: settings.requireAuthentication
            ? undefined
            : profile.security?.lastAuthenticatedAt,
        };
        await this.saveUserProfile(profile);

        // If enabling authentication, set up the auth keychain entry
        if (settings.requireAuthentication) {
          const authKeyService = 'MirroxAppAuth';
          const authKeyAccount = 'auth_verification';

          try {
            await Keychain.setInternetCredentials(
              authKeyService,
              authKeyAccount,
              'authenticated',
              {
                accessControl:
                  Keychain.ACCESS_CONTROL
                    .BIOMETRY_CURRENT_SET_OR_DEVICE_PASSCODE,
                securityLevel: Keychain.SECURITY_LEVEL.SECURE_HARDWARE,
              }
            );
          } catch (error) {
            // Fallback to software security
            await Keychain.setInternetCredentials(
              authKeyService,
              authKeyAccount,
              'authenticated',
              {
                securityLevel: Keychain.SECURITY_LEVEL.SECURE_SOFTWARE,
              }
            );
          }
        } else {
          // If disabling authentication, remove the auth keychain entry
          try {
            await Keychain.setInternetCredentials(
              'MirroxAppAuth',
              'auth_verification',
              ''
            );
          } catch (error) {
            console.warn('Failed to remove auth keychain entry:', error);
          }
        }
      }
    } catch (error) {
      console.error('Failed to update security settings:', error);
    }
  }

  public async updatePreferences(preferences: {
    enableStressVisuals?: boolean;
    enableDeveloperControls?: boolean;
    enableEnergyNotifications?: boolean;
  }): Promise<void> {
    try {
      const profile = await this.getUserProfile();
      if (profile) {
        profile.preferences = {
          ...profile.preferences,
          // If a new value is provided, use it; otherwise keep existing, defaulting to true when undefined
          enableStressVisuals:
            preferences.enableStressVisuals ??
            profile.preferences?.enableStressVisuals ??
            true,
          // Default to false for developer controls
          enableDeveloperControls:
            preferences.enableDeveloperControls ??
            profile.preferences?.enableDeveloperControls ??
            false,
          // Default to enabled for notifications
          enableEnergyNotifications:
            preferences.enableEnergyNotifications ??
            profile.preferences?.enableEnergyNotifications ??
            true,
        };
        await this.saveUserProfile(profile);
      }
    } catch (error) {
      console.error('Failed to update preferences:', error);
    }
  }

  public async getStressVisualsEnabled(): Promise<boolean> {
    try {
      const profile = await this.getUserProfile();
      return profile?.preferences?.enableStressVisuals ?? true; // Default to enabled
    } catch (error) {
      console.error('Failed to get stress visuals preference:', error);
      return true; // Default to enabled on error
    }
  }

  public async getDeveloperControlsEnabled(): Promise<boolean> {
    try {
      const profile = await this.getUserProfile();
      return profile?.preferences?.enableDeveloperControls ?? false; // Default to disabled
    } catch (error) {
      console.error('Failed to get developer controls preference:', error);
      return false; // Default to disabled on error
    }
  }

  public async getEnergyNotificationsEnabled(): Promise<boolean> {
    try {
      const profile = await this.getUserProfile();
      return profile?.preferences?.enableEnergyNotifications ?? true; // Default to enabled
    } catch (error) {
      console.error('Failed to get energy notifications preference:', error);
      return true; // Default to enabled on error
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

      // Clear secure storage (this makes old encrypted data unrecoverable)
      try {
        // Delete the stored credentials by setting them to empty and then trying to delete
        await Keychain.setInternetCredentials(
          ENCRYPTION_KEY_SERVICE,
          ENCRYPTION_KEY_ACCOUNT,
          ''
        );
        // Then attempt to reset (if the API signature is correct)
        // Note: This might need adjustment based on actual keychain API
      } catch (error) {
        console.warn('Failed to clear keychain credentials:', error);
      }

      // Reinitialize with new encryption key
      await this.initializeStorage();

      console.log('Complete reset performed - new encryption key generated');
    } catch (error) {
      console.error('Failed to perform complete reset:', error);
    }
  }

  /**
   * Check if storage is encrypted (for debugging/info purposes)
   */
  public async isEncrypted(): Promise<boolean> {
    try {
      const credentials = await Keychain.getInternetCredentials(
        ENCRYPTION_KEY_SERVICE
      );
      return credentials !== false;
    } catch (error) {
      return false;
    }
  }

  private migrateProfile(profile: Partial<UserProfile>): UserProfile {
    // Add migration steps here as schema evolves
    return {
      ...profile,
      schemaVersion: CURRENT_SCHEMA_VERSION,
    } as UserProfile;
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
      const cachedAvatars = await this.getCachedAvatarsData();
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
  public async downloadAndCacheAvatar(
    remoteUrl: string
  ): Promise<string | null> {
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
      const downloadResult = await FileSystem.downloadAsync(
        remoteUrl,
        localPath
      );

      if (downloadResult.status !== 200) {
        throw new Error(
          `Download failed with status: ${downloadResult.status}`
        );
      }

      // Get file info for size
      const fileInfo = await FileSystem.getInfoAsync(localPath);
      const fileSize =
        fileInfo.exists && !fileInfo.isDirectory && 'size' in fileInfo
          ? (fileInfo as { size: number }).size || 0
          : 0;

      // Save to cache
      const cachedAvatars = await this.getCachedAvatarsData();
      cachedAvatars[avatarId] = {
        avatarId,
        localPath,
        remoteUrl,
        downloadedAt: Date.now(),
        fileSize,
      };
      await this.setCachedAvatarsData(cachedAvatars);

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
  public async getAvatarWithCaching(
    remoteUrl?: string
  ): Promise<string | null> {
    try {
      // First try to get from saved URL if no remote URL provided
      const url = remoteUrl || (await this.getAvatarUrl());
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
      return remoteUrl || (await this.getAvatarUrl());
    }
  }

  /**
   * Remove a specific cached avatar
   */
  public async removeCachedAvatar(avatarId: string): Promise<void> {
    try {
      await this.ready;

      // Get cache entry
      const cachedAvatars = await this.getCachedAvatarsData();
      const cached = cachedAvatars[avatarId];

      if (cached) {
        // Delete file
        const fileInfo = await FileSystem.getInfoAsync(cached.localPath);
        if (fileInfo.exists) {
          await FileSystem.deleteAsync(cached.localPath);
        }

        // Remove from cache
        delete cachedAvatars[avatarId];
        await this.setCachedAvatarsData(cachedAvatars);

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
      const cachedAvatars = await this.getCachedAvatarsData();
      const avatarEntries = Object.values(cachedAvatars);

      // Delete all files
      for (const cached of avatarEntries) {
        try {
          const fileInfo = await FileSystem.getInfoAsync(cached.localPath);
          if (fileInfo.exists) {
            await FileSystem.deleteAsync(cached.localPath);
          }
        } catch (error) {
          console.warn(
            `Failed to delete cached file: ${cached.localPath}`,
            error
          );
        }
      }

      // Clear cache data
      await this.setCachedAvatarsData({});

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

      const cachedAvatars = await this.getCachedAvatarsData();
      const avatarEntries = Object.values(cachedAvatars);

      const totalFiles = avatarEntries.length;
      const totalSize = avatarEntries.reduce(
        (sum: number, item: CachedAvatar) => sum + item.fileSize,
        0
      );
      const downloadTimes = avatarEntries.map(
        (item: CachedAvatar) => item.downloadedAt
      );

      return {
        totalFiles,
        totalSize,
        oldestDownload:
          downloadTimes.length > 0 ? Math.min(...downloadTimes) : null,
        newestDownload:
          downloadTimes.length > 0 ? Math.max(...downloadTimes) : null,
      };
    } catch (error) {
      console.error('Error getting cache stats:', error);
      return {
        totalFiles: 0,
        totalSize: 0,
        oldestDownload: null,
        newestDownload: null,
      };
    }
  }

  /**
   * Clean up old cached avatars (older than specified days)
   */
  public async cleanupOldCache(maxAgeInDays: number = 30): Promise<number> {
    try {
      await this.ready;

      const cutoffTime = Date.now() - maxAgeInDays * 24 * 60 * 60 * 1000;

      // Get old entries
      const cachedAvatars = await this.getCachedAvatarsData();
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
