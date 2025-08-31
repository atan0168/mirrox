import React from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView } from 'react-native';
import { TrendingUp, Clock, Wind } from 'lucide-react-native';
import {
  EnvironmentalInfoSquares,
  EnvironmentalInfoSquaresSkeleton,
} from '../components/ui';
import { useUserProfile } from '../hooks/useUserProfile';
import { useAQICNAirQuality } from '../hooks/useAirQuality';
import { useTrafficData } from '../hooks/useTrafficData';
import { getAQIInfo, getShortClassification } from '../utils/aqiUtils';

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

  // Use traffic data hook
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
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Your Stats</Text>
          <Text style={styles.subtitle}>
            Track your environmental wellness journey
          </Text>
        </View>

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
          />
        )}

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

          <View style={styles.statCard}>
            <View style={styles.statIcon}>
              <Clock size={24} color="#7C3AED" />
            </View>
            <Text style={styles.statValue}>8.2h</Text>
            <Text style={styles.statLabel}>Avg Sleep</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Weekly Trends</Text>
          <View style={styles.placeholder}>
            <Text style={styles.placeholderText}>
              Historical charts and trends coming soon
            </Text>
          </View>
        </View>
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
  dataTimestamp: {
    fontSize: 12,
    color: '#9CA3AF',
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
