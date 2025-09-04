import * as SQLite from 'expo-sqlite';
import * as Crypto from 'expo-crypto';
import * as Keychain from 'react-native-keychain';
import { HealthMetrics } from '../utils/healthMetrics';
import { HealthAlert } from '../models/HealthAlert';

const DB_NAME = 'mirrox_secure.db';
const DB_KEYCHAIN_SERVICE = 'MirroxDB';
const DB_KEYCHAIN_ACCOUNT = 'sqlcipher_key';

export type TimestampMillis = number; // ms since epoch

// Utilities
function toMillis(d: Date | number): number {
  return d instanceof Date ? d.getTime() : d;
}

function nowMillis(): number {
  return Date.now();
}

/**
 * EncryptedDatabaseService
 * - Uses SQLCipher through expo-sqlite
 * - Passphrase is generated securely and stored in Keychain/Keystore
 * - All tables created if missing
 */
export class EncryptedDatabaseService {
  private db: SQLite.SQLiteDatabase | null = null;
  private ready: Promise<void> | null = null;

  /** Initialize database connection and schema */
  async initialize(): Promise<void> {
    if (this.ready) return this.ready;
    this.ready = (async () => {
      const key = await this.getOrCreateDbKey();

      // Open the database (async API)
      this.db = await SQLite.openDatabaseAsync(DB_NAME);

      // Apply SQLCipher key. Prefer hex (x'...') so we avoid quoting issues
      const hexKey = key.match(/^[0-9a-fA-F]+$/) ? key : this.strToHex(key);
      try {
        await this.db!.execAsync(`PRAGMA key = \"x'${hexKey}'\";`);
      } catch (e) {
        // Fallback to plain string form
        await this.db!.execAsync(`PRAGMA key = \"${this.escapeQuotes(key)}\";`);
      }

      // Touch PRAGMA cipher_version to force keying and validate availability
      try {
        await this.db!.getFirstAsync<{ cipher_version: string }>(
          'PRAGMA cipher_version;'
        );
      } catch (e) {
        // If this fails, SQLCipher is not active. We do not allow unencrypted DB.
        throw new Error(
          'SQLCipher is not available. Encrypted database is required and no fallback is allowed.'
        );
      }

      // Create schema
      await this.db!.execAsync(`
        CREATE TABLE IF NOT EXISTS health_history (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          timestamp INTEGER NOT NULL,
          metrics TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_history_timestamp ON health_history(timestamp);

        CREATE TABLE IF NOT EXISTS alerts (
          id TEXT PRIMARY KEY,
          type TEXT,
          metric TEXT,
          message TEXT,
          recommendation TEXT,
          severity INTEGER,
          timestamp INTEGER NOT NULL,
          dismissed INTEGER NOT NULL DEFAULT 0
        );
        CREATE INDEX IF NOT EXISTS idx_alerts_active ON alerts(dismissed, timestamp);

        CREATE TABLE IF NOT EXISTS alert_state (
          alertKey TEXT PRIMARY KEY,
          lastShownAt INTEGER,
          dismissedUntil INTEGER,
          lastConditionValue REAL
        );
      `);
    })();

    return this.ready;
  }

  private escapeQuotes(s: string): string {
    return s.replace(/"/g, '""');
  }

  private strToHex(s: string): string {
    return Array.from(new TextEncoder().encode(s))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  private async getOrCreateDbKey(): Promise<string> {
    try {
      const cred = await Keychain.getInternetCredentials(DB_KEYCHAIN_SERVICE);
      if (cred && cred.password) {
        return cred.password;
      }
    } catch {}

    const bytes = await Crypto.getRandomBytesAsync(32);
    const hex = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');

    try {
      await Keychain.setInternetCredentials(
        DB_KEYCHAIN_SERVICE,
        DB_KEYCHAIN_ACCOUNT,
        hex,
        {
          securityLevel: Keychain.SECURITY_LEVEL.SECURE_HARDWARE,
        }
      );
    } catch (e) {
      await Keychain.setInternetCredentials(DB_KEYCHAIN_SERVICE, DB_KEYCHAIN_ACCOUNT, hex, {
        securityLevel: Keychain.SECURITY_LEVEL.SECURE_SOFTWARE,
      });
    }

    return hex;
  }

  // History APIs
  async addHistoryEntry(timestamp: Date, metrics: HealthMetrics): Promise<void> {
    await this.initialize();
    const ts = toMillis(timestamp);
    await this.db!.runAsync('INSERT INTO health_history (timestamp, metrics) VALUES (?, ?)', [
      ts,
      JSON.stringify(metrics),
    ]);
  }

  async getLatestEntry(): Promise<{ timestamp: number; metrics: HealthMetrics } | null> {
    await this.initialize();
    const row = await this.db!.getFirstAsync<{ timestamp: number; metrics: string }>(
      'SELECT timestamp, metrics FROM health_history ORDER BY timestamp DESC LIMIT 1'
    );
    if (!row) return null;
    return { timestamp: row.timestamp, metrics: JSON.parse(row.metrics) as HealthMetrics };
  }

  async getEntryAtOrBefore(
    timestamp: Date | number
  ): Promise<{ timestamp: number; metrics: HealthMetrics } | null> {
    await this.initialize();
    const ts = toMillis(timestamp);
    const row = await this.db!.getFirstAsync<{ timestamp: number; metrics: string }>(
      'SELECT timestamp, metrics FROM health_history WHERE timestamp <= ? ORDER BY timestamp DESC LIMIT 1',
      [ts]
    );
    if (!row) return null;
    return { timestamp: row.timestamp, metrics: JSON.parse(row.metrics) as HealthMetrics };
  }

  async getLatestNEntries(n: number): Promise<Array<{ timestamp: number; metrics: HealthMetrics }>> {
    await this.initialize();
    const rows = await this.db!.getAllAsync<{ timestamp: number; metrics: string }>(
      'SELECT timestamp, metrics FROM health_history ORDER BY timestamp DESC LIMIT ?',[n]
    );
    return rows.map(r => ({ timestamp: r.timestamp, metrics: JSON.parse(r.metrics) as HealthMetrics }));
  }

  async pruneHistory(before: Date | number): Promise<number> {
    await this.initialize();
    const ts = toMillis(before);
    const result = await this.db!.runAsync('DELETE FROM health_history WHERE timestamp < ?', [ts]);
    // runAsync returns { insertId?, rowsAffected? } depending on platform
    // @ts-ignore
    return result?.rowsAffected ?? 0;
  }

  // Alerts APIs
  async upsertAlert(alert: HealthAlert): Promise<void> {
    await this.initialize();
    await this.db!.runAsync(
      `INSERT INTO alerts (id, type, metric, message, recommendation, severity, timestamp, dismissed)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         type=excluded.type,
         metric=excluded.metric,
         message=excluded.message,
         recommendation=excluded.recommendation,
         severity=excluded.severity,
         timestamp=excluded.timestamp,
         dismissed=excluded.dismissed`,
      [
        alert.id,
        alert.type,
        alert.metric as any,
        alert.message,
        alert.recommendation ?? null,
        alert.severity,
        toMillis(alert.timestamp),
        alert.dismissed ? 1 : 0,
      ]
    );
  }

  async getActiveAlerts(): Promise<HealthAlert[]> {
    await this.initialize();
    const rows = await this.db!.getAllAsync<{
      id: string;
      type: 'warning' | 'critical' | 'info';
      metric: any;
      message: string;
      recommendation: string | null;
      severity: number;
      timestamp: number;
      dismissed: number;
    }>('SELECT * FROM alerts WHERE dismissed = 0 ORDER BY timestamp DESC');

    return rows.map(r => ({
      id: r.id,
      type: r.type,
      metric: r.metric,
      message: r.message,
      recommendation: r.recommendation ?? undefined,
      severity: r.severity,
      timestamp: new Date(r.timestamp),
      dismissed: !!r.dismissed,
    }));
  }

  async dismissAlert(id: string, dismissUntilMillis: number): Promise<void> {
    await this.initialize();
    const now = nowMillis();
    await this.db!.runAsync('UPDATE alerts SET dismissed = 1, timestamp = ? WHERE id = ?', [now, id]);
    await this.db!.runAsync(
      `INSERT INTO alert_state (alertKey, lastShownAt, dismissedUntil, lastConditionValue)
       VALUES (?, ?, ?, COALESCE((SELECT lastConditionValue FROM alert_state WHERE alertKey = ?), NULL))
       ON CONFLICT(alertKey) DO UPDATE SET dismissedUntil = excluded.dismissedUntil, lastShownAt = excluded.lastShownAt`,
      [id, now, dismissUntilMillis, id]
    );
  }

  async getAlertState(alertKey: string): Promise<{ lastShownAt?: number; dismissedUntil?: number; lastConditionValue?: number } | null> {
    await this.initialize();
    const row = await this.db!.getFirstAsync<{ lastShownAt: number | null; dismissedUntil: number | null; lastConditionValue: number | null }>(
      'SELECT lastShownAt, dismissedUntil, lastConditionValue FROM alert_state WHERE alertKey = ?',
      [alertKey]
    );
    if (!row) return null;
    return {
      lastShownAt: row.lastShownAt ?? undefined,
      dismissedUntil: row.dismissedUntil ?? undefined,
      lastConditionValue: row.lastConditionValue ?? undefined,
    };
  }

  async setAlertState(alertKey: string, state: { lastShownAt?: number; dismissedUntil?: number; lastConditionValue?: number }): Promise<void> {
    await this.initialize();
    await this.db!.runAsync(
      `INSERT INTO alert_state (alertKey, lastShownAt, dismissedUntil, lastConditionValue)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(alertKey) DO UPDATE SET
         lastShownAt=excluded.lastShownAt,
         dismissedUntil=excluded.dismissedUntil,
         lastConditionValue=excluded.lastConditionValue`,
      [
        alertKey,
        state.lastShownAt ?? null,
        state.dismissedUntil ?? null,
        state.lastConditionValue ?? null,
      ]
    );
  }

  async clearAll(): Promise<void> {
    await this.initialize();
    await this.db!.execAsync('DELETE FROM health_history; DELETE FROM alerts; DELETE FROM alert_state;');
  }
}

export const encryptedDatabaseService = new EncryptedDatabaseService();
