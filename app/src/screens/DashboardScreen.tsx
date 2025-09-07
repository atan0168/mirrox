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
} from 'react-native';
import AvatarExperience from '../components/avatar/AvatarExperience';
import { EffectsList, EffectData } from '../components/ui';
import { colors, spacing, fontSize, borderRadius } from '../theme';
import { useAQICNAirQuality } from '../hooks/useAirQuality';
import { useUserProfile } from '../hooks/useUserProfile';
import { useDeveloperControlsPreference } from '../hooks/useDeveloperControlsPreference';
import {
  calculateCombinedEnvironmentalSkinEffects,
  getRecommendedFacialExpression,
  calculateSmogEffects,
} from '../utils/skinEffectsUtils';
import { SkinToneButton } from '../components/controls/SkinToneButton';
import SceneSwitcher, {
  SceneOption,
} from '../components/controls/SceneSwitcher';
import RainIntensityControls from '../components/controls/RainIntensityControls';

const DashboardScreen: React.FC = () => {
  const { data: userProfile, isLoading, error } = useUserProfile();
  const [skeletonAnim] = useState(new Animated.Value(0));
  const [manualSkinToneAdjustment, setManualSkinToneAdjustment] = useState(0);
  const [scrollEnabled, setScrollEnabled] = useState(true);
  const [scene, setScene] = useState<SceneOption>('home');
  const [rainIntensity, setRainIntensity] = useState(0.7);
  const [rainDirection, setRainDirection] = useState<'vertical' | 'angled'>(
    'vertical'
  );

  // Use developer controls preference
  const { developerControlsEnabled } = useDeveloperControlsPreference();

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

  const { data: airQuality, error: airQualityError } = useAQICNAirQuality(
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
    const currentUVIndex =
      airQuality.uvIndex ||
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
      0 // Base skin tone adjustment
    );
  }, [airQuality]);

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

  // Create effects data for the effects list
  const activeEffects = useMemo((): EffectData[] => {
    const effects: EffectData[] = [];

    // Skin effects
    if (skinEffects.totalAdjustment !== 0) {
      const severity =
        Math.abs(skinEffects.totalAdjustment) > 0.3
          ? 'high'
          : Math.abs(skinEffects.totalAdjustment) > 0.15
            ? 'medium'
            : 'low';

      effects.push({
        id: 'skin-effects',
        title: 'Skin Tone Changes',
        description: skinEffects.description,
        details: [
          `Total skin adjustment: ${(skinEffects.totalAdjustment * 100).toFixed(0)}% darker`,
          `Pollution effect: ${(skinEffects.pollutionEffect * 100).toFixed(0)}%`,
          `UV effect: ${(skinEffects.uvEffect * 100).toFixed(0)}%`,
          `Redness factor: ${(skinEffects.redness * 100).toFixed(0)}%`,
          `Primary factor: ${skinEffects.primaryFactor}`,
          ...skinEffects.recommendations,
        ],
        severity,
        source: airQuality?.source?.toUpperCase() || 'Environmental Data',
        actionRecommendations: [
          'Use sunscreen with SPF 30+ when outdoors',
          'Consider wearing protective clothing',
          'Apply antioxidant-rich skincare products',
          'Stay hydrated to maintain skin health',
          'Limit outdoor activities during peak pollution hours',
        ],
      });
    }

    // Smog/atmospheric effects
    if (smogEffects.enabled) {
      const severity =
        smogEffects.intensity > 0.7
          ? 'high'
          : smogEffects.intensity > 0.4
            ? 'medium'
            : 'low';

      effects.push({
        id: 'atmospheric-effects',
        title: 'Atmospheric Effects',
        description: smogEffects.description,
        details: [
          `Smog intensity: ${(smogEffects.intensity * 100).toFixed(0)}%`,
          `Visibility opacity: ${(smogEffects.opacity * 100).toFixed(0)}%`,
          `Particle density: ${(smogEffects.density / 20).toFixed(1)}x normal`,
          'Simulates real-world air quality conditions',
          'Based on PM2.5 and PM10 particulate matter levels',
        ],
        severity,
        source: airQuality?.source?.toUpperCase() || 'Air Quality Data',
        actionRecommendations: [
          'Wear an N95 or KN95 mask when outdoors',
          'Keep windows closed and use air purifiers indoors',
          'Avoid outdoor exercise during high pollution periods',
          'Use public transportation to reduce emissions',
          'Check air quality before planning outdoor activities',
        ],
      });
    }

    // Facial expression effects
    if (recommendedExpression !== 'neutral') {
      const severity =
        airQuality?.aqi && airQuality.aqi > 150
          ? 'high'
          : airQuality?.aqi && airQuality.aqi > 100
            ? 'medium'
            : 'low';

      effects.push({
        id: 'facial-expression',
        title: 'Facial Expression',
        description: `Avatar expression adjusted to "${recommendedExpression}" based on air quality conditions`,
        details: [
          `Current expression: ${recommendedExpression}`,
          `Based on AQI: ${airQuality?.aqi || 'N/A'}`,
          `PM2.5 level: ${airQuality?.pm25 || 'N/A'} μg/m³`,
          'Expression reflects health impact of air quality',
        ],
        severity,
        source: 'Air Quality Analysis',
        actionRecommendations: [
          'Practice deep breathing exercises to reduce stress',
          'Take breaks from outdoor activities if feeling discomfort',
          'Monitor your symptoms and adjust activities accordingly',
          'Consider using a humidifier to ease respiratory discomfort',
          'Stay informed about air quality forecasts',
        ],
      });
    }

    return effects;
  }, [skinEffects, smogEffects, recommendedExpression, airQuality]);

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
      <ScrollView style={styles.container} scrollEnabled={scrollEnabled}>
        <View style={styles.content}>
          <View style={styles.avatarContainer}>
            <AvatarExperience
              showAnimationButton={developerControlsEnabled}
              facialExpression="neutral"
              skinToneAdjustment={skinEffects.totalAdjustment}
              rainIntensity={rainIntensity}
              rainDirection={rainDirection}
              latitude={userProfile?.location.latitude}
              longitude={userProfile?.location.longitude}
              enableTrafficStress={true}
              trafficRefreshInterval={300000} // 5 minutes
              airQualityData={
                airQuality
                  ? {
                      aqi: airQuality.aqi,
                      pm25: airQuality.pm25,
                      pm10: airQuality.pm10,
                    }
                  : null
              }
              scene={scene}
            />
          </View>

          {/* Skin Tone Controls - above facial expressions */}
          {developerControlsEnabled && (
            <View style={styles.controlsContainer}>
              <Text style={styles.controlsTitle}>Avatar Customization</Text>
              <SceneSwitcher value={scene} onChange={setScene} />
              <SkinToneButton
                skinToneAdjustment={manualSkinToneAdjustment}
                onSkinToneChange={setManualSkinToneAdjustment}
              />
              <RainIntensityControls
                value={rainIntensity}
                onChange={setRainIntensity}
                direction={rainDirection}
                onChangeDirection={setRainDirection}
              />
            </View>
          )}

          {/* Traffic Information */}
          <EffectsList effects={activeEffects} />
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
    // Full-bleed inside a padded ScrollView: cancel horizontal padding
    marginHorizontal: -spacing.lg,
    marginTop: -spacing.lg,
    // Let child fill width
    alignItems: 'stretch',
    // Optional spacing below the canvas
    marginBottom: 16,
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
