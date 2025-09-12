import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import * as FileSystem from 'expo-file-system';
import {
  Database as LucideDatabase,
  Share2,
  Copy,
  Lock,
  Unlock,
  RotateCcw,
} from 'lucide-react-native';
import { colors, spacing, fontSize, borderRadius } from '../theme';
import {
  DB_NAME,
  isEncryptionEnabled,
  getDatabase,
} from '../services/db/sqlite';

let Sharing: any = null;
let Clipboard: any = null;

export default function DebugDatabaseScreen() {
  const [sharing, setSharing] = useState(false);

  const sqliteDir = useMemo(() => `${FileSystem.documentDirectory}SQLite/`, []);
  const dbPath = useMemo(() => `${sqliteDir}${DB_NAME}`, [sqliteDir]);
  const encryption = useMemo(() => isEncryptionEnabled(), []);

  const shareDb = async () => {
    try {
      setSharing(true);
      // Flush WAL so the main DB file contains latest data
      try {
        const db = await getDatabase();
        await db.execAsync('PRAGMA wal_checkpoint(TRUNCATE);');
      } catch {
        // ignore if unavailable
      }
      const info = await FileSystem.getInfoAsync(dbPath);
      if (!info.exists) {
        Alert.alert('Database Not Found', `Expected at: ${dbPath}`);
        return;
      }
      if (!Sharing) {
        try {
          Sharing = require('expo-sharing');
        } catch {}
      }
      if (Sharing && (await Sharing.isAvailableAsync())) {
        await Sharing.shareAsync(dbPath, {
          dialogTitle: 'Share SQLite database',
        });
      } else {
        Alert.alert(
          'Sharing Module Missing',
          'Install expo-sharing to export the database file, or copy the path and retrieve it with Xcode/Files.'
        );
      }
    } catch (e: any) {
      Alert.alert(
        'Share Failed',
        e?.message ?? 'Unable to share database file.'
      );
    } finally {
      setSharing(false);
    }
  };

  const copyPath = async () => {
    if (!Clipboard) {
      try {
        Clipboard = require('expo-clipboard');
      } catch {}
    }
    if (Clipboard?.setStringAsync) {
      await Clipboard.setStringAsync(dbPath);
      Alert.alert('Copied', 'Database path copied to clipboard.');
    } else {
      Alert.alert(
        'Clipboard Module Missing',
        'Install expo-clipboard to copy text to clipboard.'
      );
    }
  };

  const confirmResetHealthData = () => {
    Alert.alert(
      'Reset Health Data',
      'This will permanently delete all saved health snapshots from the local database. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            try {
              const db = await getDatabase();
              await db.execAsync('DELETE FROM health_snapshots;');
              try {
                // Attempt to truncate WAL and vacuum space (best-effort)
                await db.execAsync('PRAGMA wal_checkpoint(TRUNCATE);');
              } catch {}
              Alert.alert('Reset Complete', 'All health data has been removed.');
            } catch (e: any) {
              Alert.alert(
                'Reset Failed',
                e?.message ?? 'Unable to reset health data.'
              );
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={[{ padding: spacing.lg }, styles.contentWrap]}>
        <View style={styles.headerRow}>
          <LucideDatabase size={24} color={colors.neutral[700]} />
          <Text style={styles.title}>Debug Database</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.row}>
            {encryption ? (
              <Lock size={18} color={colors.neutral[700]} />
            ) : (
              <Unlock size={18} color={colors.neutral[700]} />
            )}
            <Text style={styles.label}>Encryption:</Text>
            <Text style={[styles.value, { fontWeight: '600' }]}>
              {encryption ? 'Enabled' : 'Disabled (dev)'}
            </Text>
          </View>
          <View style={[styles.row, { alignItems: 'flex-start' }]}>
            <Text style={styles.label}>Path:</Text>
            <Text style={[styles.value, { flex: 1 }]}>{dbPath}</Text>
          </View>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={shareDb}
            disabled={sharing}
          >
            {sharing ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Share2 size={18} color={colors.white} />
            )}
            <Text style={styles.actionText}>
              {sharing ? 'Sharing…' : 'Share Database'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, styles.secondary]}
            onPress={copyPath}
          >
            <Copy size={18} color={colors.black} />
            <Text style={[styles.actionText, { color: colors.black }]}>
              Copy Path
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: '#d35400' }]}
            onPress={confirmResetHealthData}
          >
            <RotateCcw size={18} color={colors.white} />
            <Text style={styles.actionText}>Reset Health Data</Text>
          </TouchableOpacity>
        </View>

        {__DEV__ && (
          <View style={[styles.contentWrap, { marginTop: spacing.md }]}>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: '#c0392b' }]}
              onPress={async () => {
                try {
                  const info = await FileSystem.getInfoAsync(dbPath);
                  if (!info.exists) {
                    Alert.alert('Not Found', 'No database file to delete.');
                    return;
                  }
                  await FileSystem.deleteAsync(dbPath, { idempotent: true });
                  Alert.alert(
                    'Deleted',
                    'Database deleted. Restart the app to recreate it.'
                  );
                } catch (e: any) {
                  Alert.alert(
                    'Delete Failed',
                    e?.message ?? 'Unable to delete database file.'
                  );
                }
              }}
            >
              <Text style={[styles.actionText, { color: colors.white }]}>
                Delete Database (dev)
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <View style={[styles.note, styles.contentWrap]}>
        <Text style={styles.noteText}>
          Tip: On iOS, use Share to save to Files or AirDrop to your Mac, then
          open the .db file with your preferred SQLite viewer.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white, padding: spacing.lg },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    marginLeft: spacing.sm,
    fontSize: fontSize.xl,
    fontWeight: '600',
    color: colors.black,
  },
  card: {
    backgroundColor: colors.neutral[50],
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
  },
  contentWrap: { width: '100%', maxWidth: 520, alignSelf: 'center' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    gap: 8,
  },
  label: {
    marginLeft: spacing.sm,
    fontSize: fontSize.sm,
    color: colors.neutral[600],
  },
  value: { marginLeft: spacing.sm, fontSize: fontSize.sm, color: colors.black },
  actions: {
    marginTop: spacing.xl,
    gap: spacing.md,
    alignItems: 'stretch',
    width: '100%',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.black,
    alignSelf: 'stretch',
    width: '100%',
  },
  secondary: { backgroundColor: colors.neutral[200] },
  actionText: {
    marginLeft: spacing.sm,
    color: colors.white,
    fontWeight: '600',
  },
  note: { padding: spacing.md },
  noteText: {
    fontSize: fontSize.sm,
    color: colors.neutral[600],
    lineHeight: 20,
  },
});
