import * as FileSystem from "expo-file-system";
import { Platform } from "react-native";

interface CacheEntry {
  url: string;
  localPath: string;
  timestamp: number;
  size: number;
}

interface CacheMetadata {
  [key: string]: CacheEntry;
}

export class AnimationCacheService {
  private static instance: AnimationCacheService;
  private cacheDir: string;
  private metadataFile: string;
  private maxCacheSize: number = 100 * 1024 * 1024; // 100MB

  private constructor() {
    this.cacheDir = `${FileSystem.documentDirectory}animationCache/`;
    this.metadataFile = `${this.cacheDir}metadata.json`;
  }

  public static getInstance(): AnimationCacheService {
    if (!AnimationCacheService.instance) {
      AnimationCacheService.instance = new AnimationCacheService();
    }
    return AnimationCacheService.instance;
  }

  /**
   * Initialize the cache directory
   */
  public async initialize(): Promise<void> {
    try {
      const dirInfo = await FileSystem.getInfoAsync(this.cacheDir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(this.cacheDir, {
          intermediates: true,
        });
        console.log("📁 Created animation cache directory");
      }
    } catch (error) {
      console.error("❌ Error initializing cache directory:", error);
    }
  }

  /**
   * Generate a cache key from URL
   */
  private getCacheKey(url: string): string {
    // Create a simple hash from the URL
    let hash = 0;
    for (let i = 0; i < url.length; i++) {
      const char = url.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }

    // Get file extension
    const urlParts = url.split(".");
    const extension =
      urlParts.length > 1 ? `.${urlParts[urlParts.length - 1]}` : ".fbx";

    return `${Math.abs(hash)}${extension}`;
  }

  /**
   * Load cache metadata
   */
  private async loadMetadata(): Promise<CacheMetadata> {
    try {
      const metadataExists = await FileSystem.getInfoAsync(this.metadataFile);
      if (metadataExists.exists) {
        const content = await FileSystem.readAsStringAsync(this.metadataFile);
        return JSON.parse(content);
      }
    } catch (error) {
      console.log("📋 No existing cache metadata found, starting fresh");
    }
    return {};
  }

  /**
   * Save cache metadata
   */
  private async saveMetadata(metadata: CacheMetadata): Promise<void> {
    try {
      await FileSystem.writeAsStringAsync(
        this.metadataFile,
        JSON.stringify(metadata, null, 2),
      );
    } catch (error) {
      console.error("❌ Error saving cache metadata:", error);
    }
  }

  /**
   * Check if a file is cached and valid
   */
  public async isCached(url: string): Promise<boolean> {
    try {
      const metadata = await this.loadMetadata();
      const cacheKey = this.getCacheKey(url);
      const entry = metadata[cacheKey];

      if (!entry) {
        return false;
      }

      // Check if file still exists
      const fileInfo = await FileSystem.getInfoAsync(entry.localPath);
      if (!fileInfo.exists) {
        console.log(
          "🗑️ Cache entry exists but file is missing, will re-download",
        );
        return false;
      }

      console.log(`✅ Found valid cache entry for: ${url.split("/").pop()}`);
      return false;
    } catch (error) {
      console.error("❌ Error checking cache:", error);
      return false;
    }
  }

  /**
   * Get cached file path
   */
  public async getCachedPath(url: string): Promise<string | null> {
    try {
      const metadata = await this.loadMetadata();
      const cacheKey = this.getCacheKey(url);
      const entry = metadata[cacheKey];

      if (entry && (await this.isCached(url))) {
        return entry.localPath;
      }
    } catch (error) {
      console.error("❌ Error getting cached path:", error);
    }
    return null;
  }

  /**
   * Download and cache a file
   */
  public async cacheFile(
    url: string,
    onProgress?: (progress: number) => void,
  ): Promise<string> {
    try {
      const cacheKey = this.getCacheKey(url);
      const localPath = `${this.cacheDir}${cacheKey}`;

      console.log(`📥 Downloading animation: ${url.split("/").pop()}`);

      // Download with progress tracking
      const downloadResumable = FileSystem.createDownloadResumable(
        url,
        localPath,
        {},
        onProgress
          ? (downloadProgress) => {
              const progress =
                downloadProgress.totalBytesWritten /
                downloadProgress.totalBytesExpectedToWrite;
              onProgress(progress);
            }
          : undefined,
      );

      const result = await downloadResumable.downloadAsync();

      if (!result || !result.uri) {
        throw new Error("Download failed");
      }

      // Get file size
      const fileInfo = await FileSystem.getInfoAsync(result.uri);
      const fileSize =
        fileInfo.exists && !fileInfo.isDirectory
          ? (fileInfo as any).size || 0
          : 0;

      // Update metadata
      const metadata = await this.loadMetadata();
      metadata[cacheKey] = {
        url,
        localPath: result.uri,
        timestamp: Date.now(),
        size: fileSize,
      };

      await this.saveMetadata(metadata);

      console.log(
        `✅ Successfully cached: ${url.split("/").pop()} (${(fileSize / 1024).toFixed(1)}KB)`,
      );
      console.log(`💾 Animation file permanently cached - no expiration`);

      // Clean up old files if cache is getting too large
      await this.cleanupCache();

      return result.uri;
    } catch (error) {
      console.error(`❌ Error caching file ${url}:`, error);
      throw error;
    }
  }

  /**
   * Get file from cache or download if needed
   */
  public async getOrCacheFile(
    url: string,
    onProgress?: (progress: number) => void,
  ): Promise<string> {
    // Check if already cached
    if (await this.isCached(url)) {
      const cachedPath = await this.getCachedPath(url);
      if (cachedPath) {
        console.log(`🚀 Using cached animation: ${url.split("/").pop()}`);
        return cachedPath;
      }
    }

    // Download and cache
    return await this.cacheFile(url, onProgress);
  }

  /**
   * Clean up old cache files when size limit is exceeded
   */
  private async cleanupCache(): Promise<void> {
    try {
      const metadata = await this.loadMetadata();
      const entries = Object.values(metadata);

      // Calculate total cache size
      const totalSize = entries.reduce((sum, entry) => sum + entry.size, 0);

      if (totalSize > this.maxCacheSize) {
        console.log(
          `🧹 Cache size (${(totalSize / 1024 / 1024).toFixed(1)}MB) exceeds limit, cleaning up...`,
        );

        // Sort by timestamp (oldest first) to keep most recently accessed files
        const sortedEntries = entries.sort((a, b) => a.timestamp - b.timestamp);

        let currentSize = totalSize;
        const newMetadata: CacheMetadata = {};

        // Keep newest files until we're under 80% of the size limit
        for (let i = sortedEntries.length - 1; i >= 0; i--) {
          const entry = sortedEntries[i];
          const cacheKey = this.getCacheKey(entry.url);

          if (currentSize - entry.size > this.maxCacheSize * 0.8) {
            // Delete old file
            try {
              await FileSystem.deleteAsync(entry.localPath, {
                idempotent: true,
              });
              console.log(
                `🗑️ Deleted old cache file: ${entry.url.split("/").pop()}`,
              );
            } catch (error) {
              console.warn("⚠️ Error deleting old cache file:", error);
            }
            currentSize -= entry.size;
          } else {
            // Keep this file
            newMetadata[cacheKey] = entry;
          }
        }

        await this.saveMetadata(newMetadata);
        console.log(
          `✅ Cache cleanup complete. New size: ${(currentSize / 1024 / 1024).toFixed(1)}MB`,
        );
      }
    } catch (error) {
      console.error("❌ Error during cache cleanup:", error);
    }
  }

  /**
   * Clear all cached files
   */
  public async clearCache(): Promise<void> {
    try {
      await FileSystem.deleteAsync(this.cacheDir, { idempotent: true });
      await this.initialize();
      console.log("🗑️ Animation cache cleared");
    } catch (error) {
      console.error("❌ Error clearing cache:", error);
    }
  }

  /**
   * Get cache statistics
   */
  public async getCacheStats(): Promise<{
    fileCount: number;
    totalSize: number;
    oldestFile: Date | null;
    newestFile: Date | null;
  }> {
    try {
      const metadata = await this.loadMetadata();
      const entries = Object.values(metadata);

      if (entries.length === 0) {
        return {
          fileCount: 0,
          totalSize: 0,
          oldestFile: null,
          newestFile: null,
        };
      }

      const totalSize = entries.reduce((sum, entry) => sum + entry.size, 0);
      const timestamps = entries.map((entry) => entry.timestamp);

      return {
        fileCount: entries.length,
        totalSize,
        oldestFile: new Date(Math.min(...timestamps)),
        newestFile: new Date(Math.max(...timestamps)),
      };
    } catch (error) {
      console.error("❌ Error getting cache stats:", error);
      return {
        fileCount: 0,
        totalSize: 0,
        oldestFile: null,
        newestFile: null,
      };
    }
  }
}

export default AnimationCacheService.getInstance();
