import React, { useState, useEffect, useMemo } from 'react';
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
import ThreeAvatar from '../components/ThreeAvatar';
import { FacialExpressionControls } from '../components/controls/FacialExpressionControls';
import { SkinToneButton } from '../components/controls/SkinToneButton';
import { Card, HealthSummary } from '../components/ui';
import { colors, spacing, fontSize, borderRadius } from '../theme';
import { useAQICNAirQuality } from '../hooks/useAirQuality';
import { useUserProfile } from '../hooks/useUserProfile';
import {
  getAQIInfo,
  getShortClassification,
  getHealthRecommendations,
  formatPollutantValue,
  formatTimestamp,
  mapPrimaryPollutant,
} from '../utils/aqiUtils';
import {
  calculateCombinedSkinEffects,
  calculateCombinedEnvironmentalSkinEffects,
  getRecommendedFacialExpression,
  calculateSmogEffects,
} from '../utils/skinEffectsUtils';

const DashboardScreen: React.FC = () => {
  const { data: userProfile, isLoading, error } = useUserProfile();
  const [facialExpression, setFacialExpression] = useState<string>('neutral');
  const [skinToneAdjustment, setSkinToneAdjustment] = useState<number>(0);
  const [skeletonAnim] = useState(new Animated.Value(0));

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

  // Calculate combined environmental skin effects (air quality + UV)
  const skinEffects = useMemo(() => {
    if (!airQuality) {
      return {
        totalAdjustment: 0,
        pollutionEffect: 0,
        uvEffect: 0,
        redness: 0,
        primaryFactor: 'none',
        description: 'No environmental data available',
        recommendations: [],
      };
    }
    
    // Get current UV index from forecast data (use today's average if available)
    const currentUVIndex = airQuality.uvIndex || 
      (airQuality.uvForecast && airQuality.uvForecast.length > 0 
        ? airQuality.uvForecast[0].avg 
        : undefined);
    
    return calculateCombinedEnvironmentalSkinEffects(
      {
        pm25: airQuality.pm25,
        pm10: airQuality.pm10,
        aqi: airQuality.aqi,
      },
      {
        uvIndex: currentUVIndex,
        exposureHours: 2, // Assume 2 hours of outdoor exposure
      },
      skinToneAdjustment // Use current skin tone as base
    );
  }, [airQuality, skinToneAdjustment]);

  // Calculate smog effects based on air quality
  const smogEffects = useMemo(() => {
    if (!airQuality) {
      return {
        enabled: false,
        intensity: 0,
        opacity: 0,
        density: 0,
        description: 'No air quality data available',
      };
    }
    return calculateSmogEffects({
      aqi: airQuality.aqi,
      pm25: airQuality.pm25,
      pm10: airQuality.pm10,
    });
  }, [airQuality]);

  // Auto-adjust facial expression based on air quality
  const recommendedExpression = useMemo(() => {
    if (!airQuality) return 'neutral';
    return getRecommendedFacialExpression(airQuality.pm25, airQuality.aqi);
  }, [airQuality]);

  // Update facial expression when air quality changes (but allow manual override)
  const [hasManualExpression, setHasManualExpression] = useState(false);

  useEffect(() => {
    if (!hasManualExpression && recommendedExpression !== facialExpression) {
      setFacialExpression(recommendedExpression);
    }
  }, [recommendedExpression, hasManualExpression, facialExpression]);

  const handleFacialExpressionChange = (expression: string) => {
    setFacialExpression(expression);
    setHasManualExpression(true); // Mark as manually set to prevent auto-override
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
          <Text style={styles.errorText}>Error: {error.message}</Text>
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
              skinToneAdjustment={skinToneAdjustment + skinEffects.totalAdjustment}
              airQualityData={
                airQuality
                  ? {
                      aqi: airQuality.aqi,
                      pm25: airQuality.pm25,
                      pm10: airQuality.pm10,
                    }
                  : null
              }
            />
          </View>

          {/* Skin Tone Controls - above facial expressions */}
          <View style={styles.controlsContainer}>
            <Text style={styles.controlsTitle}>Avatar Customization</Text>
            <SkinToneButton
              skinToneAdjustment={skinToneAdjustment}
              onSkinToneChange={handleSkinToneChange}
            />

            {/* Air Quality Effects Indicator */}
            {(skinEffects.adjustment !== 0 || smogEffects.enabled) && (
              <View style={styles.skinEffectsIndicator}>
                <Text style={styles.skinEffectsTitle}>
                  Air Quality Effects on Avatar
                </Text>

                {/* Skin Effects */}
                {skinEffects.adjustment !== 0 && (
                  <View style={styles.effectSection}>
                    <Text style={styles.effectSubtitle}>Skin Effects:</Text>
                    <Text style={styles.skinEffectsDescription}>
                      {skinEffects.description}
                    </Text>
                    <Text style={styles.skinEffectsLabel}>
                      Adjustment: {(skinEffects.adjustment * 100).toFixed(0)}%
                      darker
                    </Text>
                  </View>
                )}

                {/* Smog Effects */}
                {smogEffects.enabled && (
                  <View style={styles.effectSection}>
                    <Text style={styles.effectSubtitle}>
                      Atmospheric Effects:
                    </Text>
                    <Text style={styles.skinEffectsDescription}>
                      {smogEffects.description}
                    </Text>
                    <Text style={styles.skinEffectsLabel}>
                      Smog intensity: {(smogEffects.intensity * 100).toFixed(0)}
                      % • Opacity: {(smogEffects.opacity * 100).toFixed(0)}%
                    </Text>
                  </View>
                )}

                <View style={styles.skinEffectsDetails}>
                  <Text style={styles.skinEffectsSource}>
                    Based on{' '}
                    {skinEffects.primaryFactor ||
                    smogEffects.description.includes('PM2.5')
                      ? 'PM2.5'
                      : 'AQI'}
                  </Text>
                </View>
              </View>
            )}
          </View>

          {/* Facial Expression Controls */}
          <View style={styles.controlsContainer}>
            <FacialExpressionControls
              currentExpression={facialExpression}
              onExpressionChange={handleFacialExpressionChange}
            />
          </View>

          {/* Health Summary */}
          <HealthSummary userProfile={userProfile} airQuality={airQuality} />

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
                      {mapPrimaryPollutant(
                        airQuality.primaryPollutant || 'N/A'
                      )}
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
  // Skin effects indicator styles
  skinEffectsIndicator: {
    backgroundColor: '#FFF5F5', // Light red/pink background
    borderColor: '#FEB2B2', // Light red border
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  skinEffectsTitle: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: '#C53030', // Dark red
    marginBottom: spacing.xs,
  },
  skinEffectsDescription: {
    fontSize: fontSize.sm,
    color: '#744210', // Dark orange/brown
    lineHeight: 18,
    marginBottom: spacing.sm,
  },
  skinEffectsDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  skinEffectsLabel: {
    fontSize: fontSize.xs,
    color: '#9C4221', // Medium brown
    fontWeight: '500',
  },
  skinEffectsSource: {
    fontSize: fontSize.xs,
    color: colors.neutral[500],
    fontStyle: 'italic',
  },
  effectSection: {
    marginBottom: spacing.sm,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[200],
  },
  effectSubtitle: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    color: '#B91C1C', // Darker red
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});

export default DashboardScreen;
