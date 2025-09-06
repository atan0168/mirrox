import * as SQLite from 'expo-sqlite';
import * as Crypto from 'expo-crypto';
import * as Keychain from 'react-native-keychain';
import Constants from 'expo-constants';

const ENCRYPTION_KEY_SERVICE = 'MirroxApp';
const ENCRYPTION_KEY_ACCOUNT = 'storage_encryption_key';

export const DB_NAME = 'mirrox.db';
let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export function isEncryptionEnabled(): boolean {
  const envOverride = Constants.expoConfig?.extra?.DB_ENCRYPTION as
    | 'on'
    | 'off'
    | undefined;
  if (__DEV__) return envOverride === 'on' ? true : false;
  return envOverride === 'off' ? false : true;
}

async function getOrCreateEncryptionKeyHex(): Promise<string> {
  try {
    const creds = await Keychain.getInternetCredentials(ENCRYPTION_KEY_SERVICE);
    if (creds && creds.password) {
      return creds.password; // already a 64-char hex string in our app
    }
  } catch {
    // ignore and generate a new key below
  }

  // Generate 32 bytes (256-bit) key and store as hex in Keychain
  const bytes = await Crypto.getRandomBytesAsync(32);
  const hex = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
  try {
    await Keychain.setInternetCredentials(
      ENCRYPTION_KEY_SERVICE,
      ENCRYPTION_KEY_ACCOUNT,
      hex,
      { securityLevel: Keychain.SECURITY_LEVEL.SECURE_HARDWARE }
    );
  } catch {
    await Keychain.setInternetCredentials(
      ENCRYPTION_KEY_SERVICE,
      ENCRYPTION_KEY_ACCOUNT,
      hex,
      { securityLevel: Keychain.SECURITY_LEVEL.SECURE_SOFTWARE }
    );
  }
  return hex;
}

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = await SQLite.openDatabaseAsync(DB_NAME);

      // Apply SQLCipher key using raw hex with x'' syntax (if supported)
      if (isEncryptionEnabled()) {
        try {
          const keyHex = await getOrCreateEncryptionKeyHex();
          await db.execAsync(`PRAGMA key = "x'${keyHex}'";`);
        } catch {
          // Ignore if SQLCipher pragma is unsupported (e.g., web)
        }
      }

      // Recommended pragmas
      await db.execAsync('PRAGMA journal_mode = WAL;');
      await db.execAsync('PRAGMA foreign_keys = ON;');

      // Migrations
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS health_snapshots (
          date TEXT PRIMARY KEY NOT NULL,
          timestamp TEXT NOT NULL,
          platform TEXT NOT NULL,
          steps INTEGER NOT NULL,
          sleepMinutes INTEGER NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_health_snapshots_date ON health_snapshots(date);
      `);

      return db;
    })();
  }
  return dbPromise;
}
