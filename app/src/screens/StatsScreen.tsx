import React, { useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Alert,
  Linking,
  RefreshControl,
  Platform,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { HeartPulse } from 'lucide-react-native';
import {
  EnvironmentalInfoSquares,
  EnvironmentalInfoSquaresSkeleton,
  HealthInfoSquares,
  InlineBanner,
} from '../components/ui';
import { useUserProfile } from '../hooks/useUserProfile';
import { useAQICNAirQuality } from '../hooks/useAirQuality';
import { useTrafficData } from '../hooks/useTrafficData';
import { useDenguePrediction } from '../hooks/useDenguePrediction';
import { useDengueNearby } from '../hooks/useDengueNearby';
import { useReverseGeocode } from '../hooks/useReverseGeocode';
import { useHealthData } from '../hooks/useHealthData';
import { useHealthHistory } from '../hooks/useHealthHistory';
import { ENV_REFRESH_INTERVAL_MS } from '../constants';
import { colors } from '../theme';

const StatsScreen: React.FC = () => {
  const { data: userProfile } = useUserProfile();
  const {
    data: airQuality,
    isLoading: isAirQualityLoading,
    error: airQualityError,
  } = useAQICNAirQuality(
    userProfile?.location.latitude || 0,
    userProfile?.location.longitude || 0,
    !!userProfile,
    ENV_REFRESH_INTERVAL_MS
  );

  // Use traffic data hook
  const {
    data: trafficData,
    loading: isTrafficLoading,
    error: trafficError,
  } = useTrafficData({
    latitude: userProfile?.location.latitude,
    longitude: userProfile?.location.longitude,
    enabled: !!userProfile?.location,
    refreshInterval: ENV_REFRESH_INTERVAL_MS,
  });

  // Dengue prediction based on user location
  const {
    data: dengue,
    isLoading: isDengueLoading,
    error: dengueError,
  } = useDenguePrediction({
    latitude: userProfile?.location.latitude,
    longitude: userProfile?.location.longitude,
    enabled: !!userProfile?.location,
    live: true,
  });

  // Determine if user is in Malaysia to conditionally show dengue tile
  const { data: reverseGeo } = useReverseGeocode(
    userProfile?.location.latitude,
    userProfile?.location.longitude,
    !!userProfile?.location
  );
  const isMalaysia =
    reverseGeo?.countryCode === 'MY' || reverseGeo?.country === 'Malaysia';

  // Query nearby hotspots/outbreaks (5km)
  const { data: dengueNearby } = useDengueNearby({
    latitude: userProfile?.location.latitude,
    longitude: userProfile?.location.longitude,
    radiusKm: 5,
    enabled: !!userProfile?.location && !!isMalaysia,
  });

  // Health data (steps, sleep)
  const {
    data: health,
    loading: isHealthLoading,
    error: healthError,
    requestPermissions,
    refresh: refreshHealth,
  } = useHealthData({ autoSync: true });

  const [healthBannerDismissed, setHealthBannerDismissed] = useState(false);
  const [enablingHealth, setEnablingHealth] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [historyWindow] = useState<7 | 14 | 30>(7);

  // Health history for bar chart
  const { refresh: refreshHistory } = useHealthHistory(historyWindow);

  const openPlatformHealthSettings = async () => {
    if (Platform.OS === 'ios') {
      // Best-effort deep link to Health app Sources (Data Access & Devices)
      const sourcesUrl = 'x-apple-health://sources';
      const healthUrl = 'x-apple-health://';
      try {
        if (await Linking.canOpenURL(sourcesUrl)) {
          await Linking.openURL(sourcesUrl);
          return;
        }
        if (await Linking.canOpenURL(healthUrl)) {
          await Linking.openURL(healthUrl);
          return;
        }
      } catch {}
    }
    // Fallback to app settings (works on both platforms)
    try {
      await Linking.openSettings();
    } catch {}
  };

  const shouldShowHealthBanner = useMemo(() => {
    if (healthBannerDismissed) return false;
    if (healthError) return true;
    if (!health || isHealthLoading) return false;
    const allEmpty =
      (health.steps ?? 0) === 0 &&
      (health.sleepMinutes ?? 0) === 0 &&
      health.hrvMs == null &&
      health.restingHeartRateBpm == null &&
      health.activeEnergyKcal == null &&
      health.mindfulMinutes == null &&
      health.respiratoryRateBrpm == null &&
      health.workoutsCount == null;
    return allEmpty;
  }, [health, isHealthLoading, healthError, healthBannerDismissed]);

  const handleEnableHealth = async () => {
    try {
      setEnablingHealth(true);
      const granted = await requestPermissions();
      if (granted) {
        await refreshHealth();
        setHealthBannerDismissed(true);
      } else {
        Alert.alert(
          'Enable Health Access',
          Platform.OS === 'ios'
            ? 'To re-enable Health permissions, open the Health app, then go to Data Access & Devices and select Mirrox to allow access.'
            : 'To re-enable health permissions, open your app settings and allow Health access.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Open Settings',
              onPress: () => openPlatformHealthSettings(),
            },
          ]
        );
      }
    } finally {
      setEnablingHealth(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshHealth();
      await refreshHistory();
    } finally {
      setRefreshing(false);
    }
  }, [refreshHealth, refreshHistory]);

  // When returning to this screen (e.g., from Settings), try to refresh
  useFocusEffect(
    useCallback(() => {
      if (healthError || !health) {
        refreshHealth().then(health => {
          if (!!health) setHealthBannerDismissed(true);
        });
      }
    }, [healthError, health, refreshHealth])
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.header}>
          <Text style={styles.title}>Stats</Text>
          <Text style={styles.subtitle}>
            Track your environmental wellness journey
          </Text>
        </View>

        {shouldShowHealthBanner && (
          <InlineBanner
            type={healthError ? 'warning' : 'info'}
            title={
              healthError ? 'Health data unavailable' : 'Enable health access'
            }
            description={
              healthError
                ? 'We could not read your health data. You can re-enable permissions to show steps and sleep.'
                : 'Turn on permissions to sync your steps, sleep, and more.'
            }
            icon={<HeartPulse size={20} color="#111827" />}
            primaryAction={
              healthError
                ? {
                    label: 'Open Health App',
                    onPress: openPlatformHealthSettings,
                    disabled: enablingHealth,
                  }
                : {
                    label: enablingHealth ? 'Enabling…' : 'Enable',
                    onPress: handleEnableHealth,
                    disabled: enablingHealth,
                  }
            }
            secondaryAction={
              healthError
                ? {
                    label: 'Retry',
                    onPress: onRefresh,
                    disabled: enablingHealth,
                  }
                : {
                    label: 'Not now',
                    onPress: () => setHealthBannerDismissed(true),
                  }
            }
            onClose={() => setHealthBannerDismissed(true)}
            style={{ marginTop: -8 }}
          />
        )}

        {/* Environmental Info Squares */}
        {isAirQualityLoading && isTrafficLoading ? (
          <EnvironmentalInfoSquaresSkeleton />
        ) : (
          <EnvironmentalInfoSquares
            airQuality={airQuality}
            trafficData={trafficData}
            isAirQualityLoading={isAirQualityLoading}
            isTrafficLoading={isTrafficLoading}
            isAirQualityError={!!airQualityError}
            isTrafficError={!!trafficError}
            airQualityErrorMessage={
              airQualityError?.message || 'Unable to load air quality data'
            }
            trafficErrorMessage={
              trafficError?.message || 'Unable to load traffic conditions'
            }
            queryLatitude={userProfile?.location.latitude}
            queryLongitude={userProfile?.location.longitude}
            denguePrediction={dengue?.data || null}
            isDengueLoading={isDengueLoading}
            isDengueError={!!dengueError}
            dengueErrorMessage={
              (dengueError as Error | undefined)?.message ||
              'Unable to load dengue risk'
            }
            dengueHotspotCount={dengueNearby?.hotspotCount}
            dengueOutbreakCount={dengueNearby?.outbreakCount}
            dengueHotspotsData={dengueNearby?.hotspots}
            dengueOutbreaksData={dengueNearby?.outbreaks}
            showDengue={!!isMalaysia}
          />
        )}

        {/* Health Info Squares */}
        <HealthInfoSquares
          health={health}
          isLoading={isHealthLoading}
          isError={!!healthError}
          errorMessage={healthError || undefined}
        />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 30,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    lineHeight: 24,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    marginBottom: 30,
    gap: 16,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  placeholder: {
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
  },
  placeholderText: {
    fontSize: 16,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 24,
  },
  toggle: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#FFFFFF',
  },
  toggleActive: {
    borderWidth: 1,
    borderColor: colors.green[600],
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#ECFDF5',
  },
  toggleText: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '600',
  },
  toggleTextActive: {
    fontSize: 12,
    color: colors.green[700],
    fontWeight: '700',
  },
  aqiCard: {
    marginBottom: 20,
    padding: 20,
  },
  aqiHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  aqiTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  aqiValue: {
    fontSize: 32,
    fontWeight: '700',
  },
  aqiClassification: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  healthAdvice: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 12,
  },
  pollutantsContainer: {
    marginBottom: 20,
  },
  pollutantsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  pollutantGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  pollutantItem: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  pollutantLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
    fontWeight: '500',
  },
  pollutantValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  statRowLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  statRowValue: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  recommendationsCard: {
    marginBottom: 20,
    padding: 16,
  },
  recommendationsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  recommendationItem: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 8,
  },
});

export default StatsScreen;
