import * as SQLite from 'expo-sqlite';
import { UserProfile } from "../models/User";

const DB_NAME = 'localstorage.db';
const TABLE_NAME = 'kv';
const USER_PROFILE_KEY = 'user_profile';
const AVATAR_URL_KEY = 'avatar_url';
const CURRENT_SCHEMA_VERSION = 1;

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
}

// Export singleton
export const localStorageService = new LocalStorageService();
