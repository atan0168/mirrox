import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { localStorageService } from '../../services/LocalStorageService';

interface CacheStats {
  totalFiles: number;
  totalSize: number;
  oldestDownload: number | null;
  newestDownload: number | null;
}

interface CacheManagerProps {
  visible?: boolean;
  onClose?: () => void;
}

const CacheManager: React.FC<CacheManagerProps> = ({ visible = true, onClose }) => {
  const [stats, setStats] = useState<CacheStats>({
    totalFiles: 0,
    totalSize: 0,
    oldestDownload: null,
    newestDownload: null,
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible) {
      loadCacheStats();
    }
  }, [visible]);

  const loadCacheStats = async () => {
    try {
      setLoading(true);
      const cacheStats = await localStorageService.getCacheStats();
      setStats(cacheStats);
    } catch (error) {
      console.error('Error loading cache stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (timestamp: number | null): string => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp).toLocaleDateString();
  };

  const handleClearCache = () => {
    Alert.alert(
      'Clear Avatar Cache',
      `This will delete ${stats.totalFiles} cached avatar files (${formatFileSize(stats.totalSize)}). Are you sure?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              await localStorageService.clearAvatarCache();
              await loadCacheStats();
              Alert.alert('Success', 'Avatar cache cleared successfully');
            } catch (error) {
              console.error('Error clearing cache:', error);
              Alert.alert('Error', 'Failed to clear cache');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleCleanupOldCache = () => {
    Alert.alert(
      'Cleanup Old Cache',
      'Remove cached avatars older than 30 days?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Cleanup',
          onPress: async () => {
            try {
              setLoading(true);
              const removedCount = await localStorageService.cleanupOldCache(30);
              await loadCacheStats();
              Alert.alert('Success', `Removed ${removedCount} old cached avatars`);
            } catch (error) {
              console.error('Error cleaning up cache:', error);
              Alert.alert('Error', 'Failed to cleanup cache');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  if (!visible) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Avatar Cache Manager</Text>
        {onClose && (
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>×</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView style={styles.content}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>Loading cache information...</Text>
          </View>
        ) : (
          <>
            <View style={styles.statsContainer}>
              <Text style={styles.sectionTitle}>Cache Statistics</Text>
              
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Cached Files:</Text>
                <Text style={styles.statValue}>{stats.totalFiles}</Text>
              </View>
              
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Total Size:</Text>
                <Text style={styles.statValue}>{formatFileSize(stats.totalSize)}</Text>
              </View>
              
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Oldest Cache:</Text>
                <Text style={styles.statValue}>{formatDate(stats.oldestDownload)}</Text>
              </View>
              
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Newest Cache:</Text>
                <Text style={styles.statValue}>{formatDate(stats.newestDownload)}</Text>
              </View>
            </View>

            <View style={styles.actionsContainer}>
              <Text style={styles.sectionTitle}>Cache Actions</Text>
              
              <TouchableOpacity
                style={[styles.actionButton, styles.refreshButton]}
                onPress={loadCacheStats}
              >
                <Text style={styles.actionButtonText}>Refresh Stats</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.actionButton, styles.cleanupButton]}
                onPress={handleCleanupOldCache}
                disabled={stats.totalFiles === 0}
              >
                <Text style={styles.actionButtonText}>Cleanup Old Cache</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.actionButton, styles.clearButton]}
                onPress={handleClearCache}
                disabled={stats.totalFiles === 0}
              >
                <Text style={styles.actionButtonText}>Clear All Cache</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.infoContainer}>
              <Text style={styles.infoTitle}>About Avatar Caching</Text>
              <Text style={styles.infoText}>
                Avatar files are cached locally to improve loading times and reduce data usage. 
                Cached avatars load instantly without requiring an internet connection.
              </Text>
              <Text style={styles.infoText}>
                • New avatars are automatically cached after creation
              </Text>
              <Text style={styles.infoText}>
                • Cache is checked first before downloading from the internet
              </Text>
              <Text style={styles.infoText}>
                • Old cache files can be cleaned up to save storage space
              </Text>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 20,
    color: '#666',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  statsContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
  },
  statValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  actionsContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  actionButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 6,
    marginVertical: 4,
    alignItems: 'center',
  },
  refreshButton: {
    backgroundColor: '#007AFF',
  },
  cleanupButton: {
    backgroundColor: '#FF9500',
  },
  clearButton: {
    backgroundColor: '#FF3B30',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  infoContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 4,
  },
});

export default CacheManager;