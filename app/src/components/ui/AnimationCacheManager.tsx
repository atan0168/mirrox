import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert, StyleSheet, ActivityIndicator } from 'react-native';
import AnimationCacheService from '../../services/AnimationCacheService';

interface AnimationCacheManagerProps {
  style?: any;
}

export function AnimationCacheManager({ style }: AnimationCacheManagerProps) {
  const [cacheStats, setCacheStats] = useState({
    fileCount: 0,
    totalSize: 0,
    oldestFile: null as Date | null,
    newestFile: null as Date | null,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  const loadCacheStats = async () => {
    setIsLoading(true);
    try {
      const stats = await AnimationCacheService.getCacheStats();
      setCacheStats(stats);
    } catch (error) {
      console.error('Error loading animation cache stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCacheStats();
  }, []);

  const handleClearCache = () => {
    Alert.alert(
      'Clear Animation Cache',
      `This will delete ${cacheStats.fileCount} cached animation files (${formatSize(cacheStats.totalSize)}). They will be re-downloaded when needed.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Clear Cache',
          style: 'destructive',
          onPress: async () => {
            setIsClearing(true);
            try {
              await AnimationCacheService.clearCache();
              await loadCacheStats();
              Alert.alert('Success', 'Animation cache cleared successfully');
            } catch (error) {
              console.error('Error clearing cache:', error);
              Alert.alert('Error', 'Failed to clear animation cache');
            } finally {
              setIsClearing(false);
            }
          },
        },
      ]
    );
  };

  const formatSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const formatDate = (date: Date | null): string => {
    if (!date) return 'N/A';
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  if (isLoading) {
    return (
      <View style={[styles.container, style]}>
        <Text style={styles.title}>Animation Cache</Text>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#007AFF" />
          <Text style={styles.loadingText}>Loading cache info...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <Text style={styles.title}>Animation Cache</Text>
      
      <View style={styles.statsContainer}>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Cached Animations:</Text>
          <Text style={styles.statValue}>{cacheStats.fileCount}</Text>
        </View>
        
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Total Size:</Text>
          <Text style={styles.statValue}>{formatSize(cacheStats.totalSize)}</Text>
        </View>
        
        {cacheStats.oldestFile && (
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>First Cached:</Text>
            <Text style={styles.statValue}>{formatDate(cacheStats.oldestFile)}</Text>
          </View>
        )}
        
        {cacheStats.newestFile && (
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Last Cached:</Text>
            <Text style={styles.statValue}>{formatDate(cacheStats.newestFile)}</Text>
          </View>
        )}
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={loadCacheStats}
          disabled={isLoading}
        >
          <Text style={styles.refreshButtonText}>Refresh</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.clearButton, 
            (isClearing || cacheStats.fileCount === 0) && styles.clearButtonDisabled
          ]}
          onPress={handleClearCache}
          disabled={isClearing || cacheStats.fileCount === 0}
        >
          <Text style={styles.clearButtonText}>
            {isClearing ? 'Clearing...' : 'Clear Cache'}
          </Text>
        </TouchableOpacity>
      </View>
      
      <Text style={styles.description}>
        Animation files are permanently cached and never expire. Cache is only cleared when manually requested or when size limit (100MB) is exceeded.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  loadingText: {
    marginLeft: 10,
    fontSize: 14,
    color: '#666',
  },
  statsContainer: {
    marginBottom: 16,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    textAlign: 'right',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  refreshButton: {
    flex: 1,
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  refreshButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  clearButton: {
    flex: 1,
    backgroundColor: '#FF3B30',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  clearButtonDisabled: {
    backgroundColor: '#CCC',
  },
  clearButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  description: {
    fontSize: 12,
    color: '#666',
    lineHeight: 16,
    textAlign: 'center',
  },
});

export default AnimationCacheManager;
