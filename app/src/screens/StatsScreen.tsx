// app/src/screens/StatsScreen.tsx
import React from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView } from 'react-native';
import { TrendingUp, Wind } from 'lucide-react-native';
import {
  EnvironmentalInfoSquares,
  EnvironmentalInfoSquaresSkeleton,
  HealthInfoSquares,
} from '../components/ui';
import { useUserProfile } from '../hooks/useUserProfile';
import { useAQICNAirQuality } from '../hooks/useAirQuality';
import { useTrafficData } from '../hooks/useTrafficData';
import { getAQIInfo, getShortClassification } from '../utils/aqiUtils';
import { useHealthData } from '../hooks/useHealthData';

// ✅ Use NutritionSummaryCard instead of NutritionCard
import { NutritionSummaryCard } from '../components/NutritionSummaryCard';

const StatsScreen: React.FC = () => {
  const { data: userProfile } = useUserProfile();

  const {
    data: airQuality,
    isLoading: isAirQualityLoading,
    error: airQualityError,
  } = useAQICNAirQuality(
    userProfile?.location.latitude || 0,
    userProfile?.location.longitude || 0,
    !!userProfile
  );

  const {
    data: trafficData,
    loading: isTrafficLoading,
    error: trafficError,
  } = useTrafficData({
    latitude: userProfile?.location.latitude,
    longitude: userProfile?.location.longitude,
    enabled: !!userProfile?.location,
    refreshInterval: 300000, // 5 minutes
  });

  const {
    data: health,
    loading: isHealthLoading,
    error: healthError,
  } = useHealthData({ autoSync: true });

  const getAirQualityStatValue = () => {
    if (isAirQualityLoading) return '...';
    if (!airQuality?.aqi) return 'N/A';
    return (
      airQuality.classification ||
      getShortClassification(getAQIInfo(airQuality.aqi).classification)
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Your Stats</Text>
          <Text style={styles.subtitle}>Track your environmental wellness journey</Text>
        </View>

        {/* Environmental Info Section */}
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
            airQualityErrorMessage={airQualityError?.message || 'Unable to load air quality data'}
            trafficErrorMessage={trafficError?.message || 'Unable to load traffic conditions'}
          />
        )}

        {/* Health Info Section */}
        <HealthInfoSquares
          health={health}
          isLoading={isHealthLoading}
          isError={!!healthError}
          errorMessage={healthError || undefined}
        />

        {/* ✅ Nutrition summary card (always rendered, handles its own state) */}
        <View style={styles.section}>
          <NutritionSummaryCard />
        </View>

        {/* Other Stats Section */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <View style={styles.statIcon}>
              <TrendingUp size={24} color="#059669" />
            </View>
            <Text style={styles.statValue}>7 Days</Text>
            <Text style={styles.statLabel}>Wellness Streak</Text>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statIcon}>
              <Wind size={24} color="#6366F1" />
            </View>
            <Text style={styles.statValue}>{getAirQualityStatValue()}</Text>
            <Text style={styles.statLabel}>Air Quality</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  scrollView: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 30 },
  title: { fontSize: 32, fontWeight: '700', color: '#111827', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#6B7280', lineHeight: 24 },
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
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  statValue: { fontSize: 24, fontWeight: '700', color: '#111827', marginBottom: 4 },
  statLabel: { fontSize: 14, color: '#6B7280', textAlign: 'center' },
  section: { paddingHorizontal: 20, marginBottom: 30 },
});

export default StatsScreen;
