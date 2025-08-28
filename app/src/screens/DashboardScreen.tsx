import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Animated,
  Easing,
  ViewStyle,
} from 'react-native';
import { localStorageService } from '../services/LocalStorageService';
import ThreeAvatar from '../components/ThreeAvatar';
import { FacialExpressionControls } from '../components/controls/FacialExpressionControls';
import { SkinToneButton } from '../components/controls/SkinToneButton';
import { Card, HealthSummary } from '../components/ui';
import { UserProfile } from '../models/User';
import { colors, spacing, fontSize, borderRadius } from '../theme';
import { useAQICNAirQuality } from '../hooks/useAirQuality';
import {
  getAQIInfo,
  getShortClassification,
  getHealthRecommendations,
  formatPollutantValue,
  formatTimestamp,
} from '../utils/aqiUtils';

const DashboardScreen: React.FC = () => {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [facialExpression, setFacialExpression] = useState<string>('neutral');
  const [skinToneAdjustment, setSkinToneAdjustment] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [skeletonAnim] = useState(new Animated.Value(0));

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

  // Animate skeleton shimmer/pulse
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(skeletonAnim, {
        toValue: 1,
        duration: 1200,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [skeletonAnim]);

  const skeletonOpacity = skeletonAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.4, 1, 0.4],
  });

  const SkeletonBlock: React.FC<{
    width: number | `${number}%` | 'auto';
    height: number;
    style?: ViewStyle;
  }> = ({ width, height, style }) => (
    <Animated.View
      style={[
        {
          width,
          height,
          backgroundColor: colors.neutral[200],
          borderRadius: 8,
          opacity: skeletonOpacity,
        },
        style,
      ]}
    />
  );

  // Use React Query for air quality data - prefer AQICN for better data quality
  const { data: airQuality, isLoading: isAirQualityLoading } =
    useAQICNAirQuality(
      userProfile?.location.latitude || 0,
      userProfile?.location.longitude || 0,
      !!userProfile
    );

  const handleFacialExpressionChange = (expression: string) => {
    setFacialExpression(expression);
  };

  const handleSkinToneChange = (value: number) => {
    setSkinToneAdjustment(value);
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

          {/* Health Summary */}
          <HealthSummary
            userProfile={userProfile}
            airQuality={airQuality || null}
          />

          {(isAirQualityLoading || airQuality) && (
            <View style={styles.statsContainer}>
              <Text style={styles.sectionTitle}>Environmental Data</Text>

              {/* Main AQI Display */}
              {isAirQualityLoading ? (
                <Card variant="outline" style={{ ...styles.aqiCard }}>
                  <View style={styles.aqiHeader}>
                    <SkeletonBlock width={140} height={18} />
                    <SkeletonBlock width={60} height={28} />
                  </View>
                  <SkeletonBlock
                    width={160}
                    height={16}
                    style={{ marginBottom: spacing.sm }}
                  />
                  <SkeletonBlock
                    width={'100%'}
                    height={14}
                    style={{ marginBottom: spacing.sm }}
                  />
                  <SkeletonBlock width={'70%'} height={12} />
                </Card>
              ) : (
                <Card
                  variant="outline"
                  style={{
                    ...styles.aqiCard,
                    borderColor:
                      airQuality!.colorCode ||
                      getAQIInfo(airQuality!.aqi || 0).colorCode,
                  }}
                >
                  <View style={styles.aqiHeader}>
                    <Text style={styles.aqiTitle}>Air Quality Index</Text>
                    <Text
                      style={[
                        styles.aqiValue,
                        {
                          color:
                            airQuality!.colorCode ||
                            getAQIInfo(airQuality!.aqi || 0).colorCode,
                        },
                      ]}
                    >
                      {airQuality!.aqi || 'N/A'}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.aqiClassification,
                      {
                        color:
                          airQuality!.colorCode ||
                          getAQIInfo(airQuality!.aqi || 0).colorCode,
                      },
                    ]}
                  >
                    {airQuality!.classification ||
                      getShortClassification(
                        getAQIInfo(airQuality!.aqi || 0).classification
                      )}
                  </Text>
                  {airQuality!.healthAdvice && (
                    <Text style={styles.healthAdvice} numberOfLines={2}>
                      {airQuality!.healthAdvice}
                    </Text>
                  )}
                  {airQuality!.timestamp && (
                    <Text style={styles.dataTimestamp}>
                      Updated {formatTimestamp(airQuality!.timestamp)} •{' '}
                      {airQuality!.source?.toUpperCase() || 'AQICN'}
                    </Text>
                  )}
                </Card>
              )}

              {/* Pollutant Details */}
              {airQuality && !isAirQualityLoading && (
                <View style={styles.pollutantsContainer}>
                  <Text style={styles.pollutantsTitle}>Pollutant Levels</Text>
                  <View style={styles.pollutantGrid}>
                    {airQuality.pm25 && (
                      <View style={styles.pollutantItem}>
                        <Text style={styles.pollutantLabel}>PM2.5</Text>
                        <Text style={styles.pollutantValue}>
                          {formatPollutantValue(airQuality.pm25, 'pm25')}
                        </Text>
                      </View>
                    )}
                    {airQuality.pm10 && (
                      <View style={styles.pollutantItem}>
                        <Text style={styles.pollutantLabel}>PM10</Text>
                        <Text style={styles.pollutantValue}>
                          {formatPollutantValue(airQuality.pm10, 'pm10')}
                        </Text>
                      </View>
                    )}
                    {airQuality.o3 && (
                      <View style={styles.pollutantItem}>
                        <Text style={styles.pollutantLabel}>Ozone</Text>
                        <Text style={styles.pollutantValue}>
                          {formatPollutantValue(airQuality.o3, 'o3')}
                        </Text>
                      </View>
                    )}
                    {airQuality.no2 && (
                      <View style={styles.pollutantItem}>
                        <Text style={styles.pollutantLabel}>NO₂</Text>
                        <Text style={styles.pollutantValue}>
                          {formatPollutantValue(airQuality.no2, 'no2')}
                        </Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.statRow}>
                    <Text style={styles.statLabel}>Primary Pollutant:</Text>
                    <Text style={styles.statValue}>
                      {airQuality.primaryPollutant || 'N/A'}
                    </Text>
                  </View>

                  <View style={styles.statRow}>
                    <Text style={styles.statLabel}>Station:</Text>
                    <Text style={styles.statValue} numberOfLines={1}>
                      {airQuality.location.name}
                    </Text>
                  </View>
                </View>
              )}

              {/* Health Recommendations */}
              {airQuality &&
                !isAirQualityLoading &&
                airQuality.aqi &&
                airQuality.aqi > 50 && (
                  <Card variant="outline" style={styles.recommendationsCard}>
                    <Text style={styles.recommendationsTitle}>
                      Health Recommendations
                    </Text>
                    {getHealthRecommendations(airQuality.aqi)
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
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#2D3748',
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
