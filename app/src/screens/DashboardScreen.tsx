import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { localStorageService } from '../services/LocalStorageService';
import ThreeAvatar from '../components/ThreeAvatar';
import { FacialExpressionControls } from '../components/controls/FacialExpressionControls';
import { SkinToneButton } from '../components/controls/SkinToneButton';
import { Card } from '../components/ui';
import { UserProfile } from '../models/User';
import { colors, spacing, fontSize, borderRadius, shadows } from '../theme';
import { useAirQuality, useAQICNAirQuality } from '../hooks/useAirQuality';
import {
  getAQIInfo,
  getShortClassification,
  getHealthRecommendations,
  formatPollutantValue,
  formatTimestamp,
  isDataRecent,
} from '../utils/aqiUtils';

interface DashboardScreenProps {
  navigation: any;
}

const DashboardScreen: React.FC<DashboardScreenProps> = ({ navigation }) => {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [facialExpression, setFacialExpression] = useState<string>('neutral');
  const [skinToneAdjustment, setSkinToneAdjustment] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initializeDashboard = async () => {
      try {
        const profile = await localStorageService.getUserProfile();
        if (!profile) {
          throw new Error('User profile not found.');
        }
        setUserProfile(profile);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'An unexpected error occurred.'
        );
      } finally {
        setIsLoading(false);
      }
    };

    initializeDashboard();
  }, []);

  // Use React Query for air quality data - prefer AQICN for better data quality
  const {
    data: airQuality,
    isLoading: isAirQualityLoading,
    error: airQualityError,
  } = useAQICNAirQuality(
    userProfile?.location.latitude || 0,
    userProfile?.location.longitude || 0,
    !!userProfile
  );

  // Fallback to general air quality if AQICN fails
  const { data: fallbackAirQuality } = useAirQuality(
    userProfile?.location.latitude || 0,
    userProfile?.location.longitude || 0,
    !!userProfile && !airQuality && !!airQualityError
  );

  // Use the best available air quality data
  const activeAirQuality = airQuality || fallbackAirQuality;

  const generateHealthVitalsMessage = (): string => {
    if (!activeAirQuality) return 'Analyzing your environment...';

    const aqi = activeAirQuality.aqi;
    if (!aqi) return 'Air quality data unavailable';

    const aqiInfo = getAQIInfo(aqi);
    const primaryPollutant = activeAirQuality.primaryPollutant || 'unknown';

    if (aqi > 100) {
      return `Your twin's lungs are starting with a major debuff due to ${aqiInfo.classification.toLowerCase()} air quality (AQI ${aqi}) in your area. The main pollutant is ${primaryPollutant}.`;
    }
    if (aqi > 50) {
      return `Your twin's lungs are starting with a slight debuff due to ${aqiInfo.classification.toLowerCase()} air quality (AQI ${aqi}) in your area.`;
    }
    return `Your twin is breathing clean air today! The air quality in your area is ${aqiInfo.classification.toLowerCase()} (AQI ${aqi}).`;
  };

  const getSleepMessage = (): string => {
    if (!userProfile) return '';

    if (userProfile.sleepHours < 6) {
      return `Your twin looks tired because you only got ${userProfile.sleepHours} hours of sleep. Consider getting more rest!`;
    }
    if (userProfile.sleepHours >= 8) {
      return `Your twin is well-rested with ${userProfile.sleepHours} hours of sleep. Great job!`;
    }
    return `Your twin got ${userProfile.sleepHours} hours of sleep. Not bad, but could be better!`;
  };

  const getCommuteMessage = (): string => {
    if (!userProfile) return '';

    const commuteMessages = {
      car: 'Your twin drives to work. Consider eco-friendly alternatives!',
      transit: 'Your twin uses public transport. Great for the environment!',
      wfh: 'Your twin works from home. No commute stress!',
      bike: 'Your twin bikes to work. Excellent for health and environment!',
      walk: 'Your twin walks to work. Perfect for health and the planet!',
    };

    return commuteMessages[userProfile.commuteMode];
  };

  const handleFacialExpressionChange = (expression: string) => {
    console.log(`=== Facial expression change requested: ${expression} ===`);
    setFacialExpression(expression);
    console.log(`Facial expression state updated to: ${expression}`);
  };

  const handleSkinToneChange = (value: number) => {
    console.log(`=== Skin tone change requested: ${value} ===`);
    setSkinToneAdjustment(value);
    console.log(`Skin tone adjustment updated to: ${value}`);
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <View style={styles.loadingContent}>
          <ActivityIndicator size="large" color={colors.neutral[600]} />
          <Text style={styles.loadingText}>Loading your digital twin...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <View style={styles.errorContent}>
          <Text style={styles.errorText}>Error: {error}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container}>
        <View style={styles.content}>
          <View style={styles.avatarContainer}>
            <ThreeAvatar
              showAnimationButton={true}
              facialExpression={facialExpression}
              skinToneAdjustment={skinToneAdjustment}
            />
          </View>

          {/* Skin Tone Controls - above facial expressions */}
          <View style={styles.controlsContainer}>
            <Text style={styles.controlsTitle}>Avatar Customization</Text>
            <SkinToneButton
              skinToneAdjustment={skinToneAdjustment}
              onSkinToneChange={handleSkinToneChange}
            />
          </View>

          {/* Facial Expression Controls */}
          <View style={styles.controlsContainer}>
            <FacialExpressionControls
              currentExpression={facialExpression}
              onExpressionChange={handleFacialExpressionChange}
            />
          </View>

          <View style={styles.vitalsContainer}>
            <Text style={styles.sectionTitle}>Health Vitals</Text>

            <Card variant="outline">
              <Text style={styles.vitalTitle}>🫁 Air Quality Impact</Text>
              <Text style={styles.vitalDescription}>
                {generateHealthVitalsMessage()}
              </Text>
            </Card>

            <View style={styles.vitalCard}>
              <Text style={styles.vitalTitle}>😴 Sleep Status</Text>
              <Text style={styles.vitalDescription}>{getSleepMessage()}</Text>
            </View>

            <View style={styles.vitalCard}>
              <Text style={styles.vitalTitle}>🚶 Commute Impact</Text>
              <Text style={styles.vitalDescription}>{getCommuteMessage()}</Text>
            </View>
          </View>

          {activeAirQuality && (
            <View style={styles.statsContainer}>
              <Text style={styles.sectionTitle}>Environmental Data</Text>

              {/* Main AQI Display */}
              <Card
                variant="outline"
                style={{
                  ...styles.aqiCard,
                  borderColor:
                    activeAirQuality.colorCode ||
                    getAQIInfo(activeAirQuality.aqi || 0).colorCode,
                }}
              >
                <View style={styles.aqiHeader}>
                  <Text style={styles.aqiTitle}>Air Quality Index</Text>
                  <Text
                    style={[
                      styles.aqiValue,
                      {
                        color:
                          activeAirQuality.colorCode ||
                          getAQIInfo(activeAirQuality.aqi || 0).colorCode,
                      },
                    ]}
                  >
                    {activeAirQuality.aqi || 'N/A'}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.aqiClassification,
                    {
                      color:
                        activeAirQuality.colorCode ||
                        getAQIInfo(activeAirQuality.aqi || 0).colorCode,
                    },
                  ]}
                >
                  {activeAirQuality.classification ||
                    getShortClassification(
                      getAQIInfo(activeAirQuality.aqi || 0).classification
                    )}
                </Text>
                {activeAirQuality.healthAdvice && (
                  <Text style={styles.healthAdvice} numberOfLines={2}>
                    {activeAirQuality.healthAdvice}
                  </Text>
                )}
                {activeAirQuality.timestamp && (
                  <Text style={styles.dataTimestamp}>
                    Updated {formatTimestamp(activeAirQuality.timestamp)} •{' '}
                    {activeAirQuality.source?.toUpperCase() || 'AQICN'}
                  </Text>
                )}
              </Card>

              {/* Pollutant Details */}
              <View style={styles.pollutantsContainer}>
                <Text style={styles.pollutantsTitle}>Pollutant Levels</Text>
                <View style={styles.pollutantGrid}>
                  {activeAirQuality.pm25 && (
                    <View style={styles.pollutantItem}>
                      <Text style={styles.pollutantLabel}>PM2.5</Text>
                      <Text style={styles.pollutantValue}>
                        {formatPollutantValue(activeAirQuality.pm25, 'pm25')}
                      </Text>
                    </View>
                  )}
                  {activeAirQuality.pm10 && (
                    <View style={styles.pollutantItem}>
                      <Text style={styles.pollutantLabel}>PM10</Text>
                      <Text style={styles.pollutantValue}>
                        {formatPollutantValue(activeAirQuality.pm10, 'pm10')}
                      </Text>
                    </View>
                  )}
                  {activeAirQuality.o3 && (
                    <View style={styles.pollutantItem}>
                      <Text style={styles.pollutantLabel}>Ozone</Text>
                      <Text style={styles.pollutantValue}>
                        {formatPollutantValue(activeAirQuality.o3, 'o3')}
                      </Text>
                    </View>
                  )}
                  {activeAirQuality.no2 && (
                    <View style={styles.pollutantItem}>
                      <Text style={styles.pollutantLabel}>NO₂</Text>
                      <Text style={styles.pollutantValue}>
                        {formatPollutantValue(activeAirQuality.no2, 'no2')}
                      </Text>
                    </View>
                  )}
                </View>

                <View style={styles.statRow}>
                  <Text style={styles.statLabel}>Primary Pollutant:</Text>
                  <Text style={styles.statValue}>
                    {activeAirQuality.primaryPollutant || 'N/A'}
                  </Text>
                </View>

                <View style={styles.statRow}>
                  <Text style={styles.statLabel}>Station:</Text>
                  <Text style={styles.statValue} numberOfLines={1}>
                    {activeAirQuality.location.name}
                  </Text>
                </View>
              </View>

              {/* Health Recommendations */}
              {activeAirQuality.aqi && activeAirQuality.aqi > 50 && (
                <Card variant="outline" style={styles.recommendationsCard}>
                  <Text style={styles.recommendationsTitle}>
                    Health Recommendations
                  </Text>
                  {getHealthRecommendations(activeAirQuality.aqi)
                    .slice(0, 3)
                    .map((recommendation, index) => (
                      <Text key={index} style={styles.recommendationItem}>
                        • {recommendation}
                      </Text>
                    ))}
                </Card>
              )}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.neutral[50],
  },
  container: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.neutral[50],
  },
  loadingContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: fontSize.base,
    color: colors.neutral[600],
    fontWeight: '500',
  },
  errorContainer: {
    flex: 1,
    backgroundColor: colors.neutral[50],
  },
  errorContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  errorText: {
    fontSize: fontSize.base,
    color: colors.neutral[700],
    textAlign: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 30,
    color: '#2D3748',
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 30,
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  controlsContainer: {
    marginBottom: 30,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  controlsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D3748',
    marginBottom: 12,
  },
  vitalsContainer: {
    marginBottom: 30,
    gap: spacing.md,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#2D3748',
  },
  vitalCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  vitalTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#2D3748',
  },
  vitalDescription: {
    fontSize: 14,
    color: '#4A5568',
    lineHeight: 20,
  },
  statsContainer: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    gap: spacing.md,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 14,
    color: '#4A5568',
  },
  statValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2D3748',
  },
  // New AQI-specific styles
  aqiCard: {
    padding: spacing.lg,
    borderWidth: 2,
  },
  aqiHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  aqiTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.neutral[700],
  },
  aqiValue: {
    fontSize: fontSize.xxl,
    fontWeight: 'bold',
  },
  aqiClassification: {
    fontSize: fontSize.base,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  healthAdvice: {
    fontSize: fontSize.sm,
    color: colors.neutral[600],
    lineHeight: 18,
    marginBottom: spacing.sm,
  },
  dataTimestamp: {
    fontSize: fontSize.xs,
    color: colors.neutral[500],
    fontStyle: 'italic',
  },
  pollutantsContainer: {
    backgroundColor: colors.neutral[50],
    padding: spacing.md,
    borderRadius: borderRadius.md,
  },
  pollutantsTitle: {
    fontSize: fontSize.base,
    fontWeight: '600',
    color: colors.neutral[700],
    marginBottom: spacing.sm,
  },
  pollutantGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  pollutantItem: {
    backgroundColor: colors.neutral[100],
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    minWidth: '45%',
    alignItems: 'center',
  },
  pollutantLabel: {
    fontSize: fontSize.xs,
    color: colors.neutral[600],
    fontWeight: '500',
  },
  pollutantValue: {
    fontSize: fontSize.sm,
    color: colors.neutral[800],
    fontWeight: '600',
    marginTop: 2,
  },
  recommendationsCard: {
    padding: spacing.md,
    backgroundColor: '#EBF8FF', // Light blue
    borderColor: '#BEE3F8', // Medium blue
  },
  recommendationsTitle: {
    fontSize: fontSize.base,
    fontWeight: '600',
    color: '#2B6CB0', // Dark blue
    marginBottom: spacing.sm,
  },
  recommendationItem: {
    fontSize: fontSize.sm,
    color: '#2C5282', // Darker blue
    lineHeight: 18,
    marginBottom: 4,
  },
});

export default DashboardScreen;
