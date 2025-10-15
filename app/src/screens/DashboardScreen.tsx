import QuestList from '../components/QuestList';
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
import * as Location from 'expo-location';
import AvatarExperience from '../components/avatar/AvatarExperience';
import { colors, spacing, fontSize } from '../theme';
import { useAQICNAirQuality } from '../hooks/useAirQuality';
import { useUserProfile } from '../hooks/useUserProfile';
import { useDeveloperControlsPreference } from '../hooks/useDeveloperControlsPreference';
import { calculateCombinedEnvironmentalSkinEffects } from '../utils/skinEffectsUtils';
import { getCombinedRecommendedExpression } from '../utils/expressionUtils';
import { useHealthData } from '../hooks/useHealthData';
import { useDengueNearby } from '../hooks/useDengueNearby';
import { SceneOption } from '../components/controls/SceneSwitcher';
import { useAvatarStore } from '../store/avatarStore';
import { useIsFocused } from '@react-navigation/native';
import OnboardingOverlay from '../components/ui/OnboardingOverlay';
import { ENV_REFRESH_INTERVAL_MS } from '../constants';
import { useUIStore } from '../store/uiStore';
import { useHydrationStore } from '../store/hydrationStore';
import { hydrationService } from '../services/HydrationService';
import { CelebrationSpotlight } from '../components/CelebrationSpotlight';
import { CelebrationIndicator } from '../components/CelebrationIndicator';
import { Coordinates } from '../models/User';
import { isWithinRadiusKm } from '../utils/geoUtils';
import { useQuestCelebrations } from '../hooks/useQuestCelebrations';
import DeveloperControls from '../components/controls/DeveloperControls';

const DashboardScreen: React.FC = () => {
  const { developerControlsEnabled } = useDeveloperControlsPreference();

  const {
    activeCelebration,
    indicatorCelebration,
    handleOpenCelebration,
    handleDismissCelebration,
    dev: { seed7DayHistory, seed6ThenCompleteToday, clearHistoryForRetest },
  } = useQuestCelebrations();

  const { data: userProfile, isLoading, error } = useUserProfile();
  const [skeletonAnim] = useState(new Animated.Value(0));
  const [manualSkinToneAdjustment, setManualSkinToneAdjustment] = useState(0);
  const [scrollEnabled, setScrollEnabled] = useState(true);
  const [scene, setScene] = useState<SceneOption>('home');
  const [sceneManuallyOverridden, setSceneManuallyOverridden] = useState(false);
  const [autoScene, setAutoScene] = useState<SceneOption>('home');
  const [locationPermissionStatus, setLocationPermissionStatus] =
    useState<Location.PermissionStatus | null>(null);
  const [currentLocation, setCurrentLocation] = useState<Coordinates | null>(
    null
  );
  const manualExpression = useAvatarStore(s => s.manualFacialExpression);
  const setManualExpression = useAvatarStore(s => s.setManualFacialExpression);
  const clearManualExpression = useAvatarStore(
    s => s.clearManualFacialExpression
  );
  const [rainIntensity, setRainIntensity] = useState(0.7);
  const [rainDirection, setRainDirection] = useState<'vertical' | 'angled'>(
    'vertical'
  );
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [storeHydrated, setStoreHydrated] = useState(false);
  const dashboardOnboardingSeen = useUIStore(s => s.dashboardOnboardingSeen);
  const markOnboardingSeen = useUIStore(s => s.markDashboardOnboardingSeen);
  const resetOnboardingSeen = useUIStore(s => s.resetDashboardOnboarding);

  const isFocused = useIsFocused();

  // Skeleton shimmer
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

  const { data: airQuality, error: _airQualityError } = useAQICNAirQuality(
    userProfile?.location.latitude || 0,
    userProfile?.location.longitude || 0,
    !!userProfile,
    ENV_REFRESH_INTERVAL_MS
  );

  const { data: dengueNearby } = useDengueNearby({
    latitude: userProfile?.location.latitude,
    longitude: userProfile?.location.longitude,
    radiusKm: 5,
    enabled: !!userProfile?.location,
  });

  const hasNearbyDengueRisk =
    (dengueNearby?.hotspotCount ?? 0) > 0 ||
    (dengueNearby?.outbreakCount ?? 0) > 0;

  // Location lifecycle
  useEffect(() => {
    let isMounted = true;
    let subscription: Location.LocationSubscription | null = null;

    const syncLocation = async () => {
      try {
        const existing = await Location.getForegroundPermissionsAsync();
        let status = existing.status;

        if (status === Location.PermissionStatus.UNDETERMINED) {
          const requested = await Location.requestForegroundPermissionsAsync();
          status = requested.status;
        }

        if (!isMounted) return;

        setLocationPermissionStatus(status);

        if (status !== Location.PermissionStatus.GRANTED) {
          setCurrentLocation(null);
          return;
        }

        const initialPosition = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

        if (isMounted) {
          setCurrentLocation({
            latitude: initialPosition.coords.latitude,
            longitude: initialPosition.coords.longitude,
          });
        }

        subscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.Balanced,
            distanceInterval: 250,
          },
          position => {
            if (!isMounted) return;
            setCurrentLocation({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            });
          }
        );
      } catch (err) {
        console.warn('Unable to retrieve location for scene selection', err);
        if (isMounted) {
          setCurrentLocation(null);
        }
      }
    };

    if (isFocused) {
      syncLocation();
    }

    return () => {
      isMounted = false;
      if (subscription) {
        subscription.remove();
      }
    };
  }, [isFocused]);

  // Scene selection from location
  useEffect(() => {
    const permissionGranted =
      locationPermissionStatus === Location.PermissionStatus.GRANTED;

    if (!userProfile || !permissionGranted || !currentLocation) {
      if (autoScene !== 'home') setAutoScene('home');
      return;
    }

    const homeLocation = userProfile.homeLocation ?? null;

    if (!homeLocation) {
      if (autoScene !== 'home') setAutoScene('home');
      return;
    }

    const workLocation = userProfile.workLocation ?? null;

    const nearHome = isWithinRadiusKm(
      currentLocation,
      homeLocation.coordinates,
      2
    );
    const nearWork =
      !!workLocation &&
      isWithinRadiusKm(currentLocation, workLocation.coordinates, 2);

    let nextScene: SceneOption;

    if (nearWork) {
      nextScene = 'city';
    } else if (nearHome) {
      nextScene = 'home';
    } else {
      nextScene = 'zenpark';
    }

    if (nextScene !== autoScene) setAutoScene(nextScene);
  }, [autoScene, currentLocation, locationPermissionStatus, userProfile]);

  // Respect manual override
  useEffect(() => {
    if (sceneManuallyOverridden) return;
    if (scene !== autoScene) setScene(autoScene);
  }, [autoScene, scene, sceneManuallyOverridden]);

  // Disable manual override if developer controls are off
  useEffect(() => {
    if (!developerControlsEnabled && sceneManuallyOverridden) {
      setSceneManuallyOverridden(false);
    }
  }, [developerControlsEnabled, sceneManuallyOverridden]);

  // Track hydration of persisted store to avoid flicker
  useEffect(() => {
    const hasHydrated = useUIStore.persist?.hasHydrated?.();
    if (hasHydrated) setStoreHydrated(true);
    const unsub = useUIStore.persist?.onFinishHydration?.(() => {
      setStoreHydrated(true);
    });
    return () => {
      if (typeof unsub === 'function') unsub();
    };
  }, []);

  // Show onboarding only after store hydration
  useEffect(() => {
    if (!storeHydrated) return;
    if (!dashboardOnboardingSeen) {
      setShowOnboarding(true);
      setScrollEnabled(false);
    }
  }, [storeHydrated, dashboardOnboardingSeen]);

  // Health data (for sleep minutes)
  const { data: health } = useHealthData({ autoSync: false });

  // Hydration init
  useEffect(() => {
    if (userProfile && storeHydrated) {
      hydrationService.initialize();
    }
  }, [userProfile, storeHydrated]);

  // Avatar hydration bar (0-200%) from store
  const hydrationProgressPercentage = useHydrationStore(s =>
    s.getProgressPercentage()
  );

  // Auto facial expression
  const recommendedExpression = useMemo(() => {
    return getCombinedRecommendedExpression({
      aqi: airQuality?.aqi ?? null,
      pm25: airQuality?.pm25 ?? null,
      sleepMinutes: health?.sleepMinutes ?? null,
    });
  }, [airQuality?.aqi, airQuality?.pm25, health?.sleepMinutes]);

  // Combined environmental skin effects (AQI + UV)
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
        exposureHours: 2,
      },
      0
    );
  }, [airQuality]);

  // Smog effects
  // const smogEffects = useMemo(() => {
  //   if (!airQuality) {
  //     return {
  //       enabled: false,
  //       intensity: 0,
  //       opacity: 0,
  //       density: 0,
  //       description: 'No air quality data available',
  //     };
  //   }
  //   return calculateSmogEffects({
  //     aqi: airQuality.aqi,
  //     pm25: airQuality.pm25,
  //     pm10: airQuality.pm10,
  //   });
  // }, [airQuality]);

  // Effects list data
  // const activeEffects = useMemo((): EffectData[] => {
  //   const effects: EffectData[] = [];
  //
  //   // Skin
  //   if (skinEffects.totalAdjustment !== 0) {
  //     const severity =
  //       Math.abs(skinEffects.totalAdjustment) > 0.3
  //         ? 'high'
  //         : Math.abs(skinEffects.totalAdjustment) > 0.15
  //           ? 'medium'
  //           : 'low';
  //
  //     effects.push({
  //       id: 'skin-effects',
  //       title: 'Skin Tone Changes',
  //       description: skinEffects.description,
  //       details: [
  //         `Total skin adjustment: ${(skinEffects.totalAdjustment * 100).toFixed(0)}% darker`,
  //         `Pollution effect: ${(skinEffects.pollutionEffect * 100).toFixed(0)}%`,
  //         `UV effect: ${(skinEffects.uvEffect * 100).toFixed(0)}%`,
  //         `Redness factor: ${(skinEffects.redness * 100).toFixed(0)}%`,
  //         `Primary factor: ${skinEffects.primaryFactor}`,
  //         ...skinEffects.recommendations,
  //       ],
  //       severity,
  //       source: airQuality?.source?.toUpperCase() || 'Environmental Data',
  //       actionRecommendations: [
  //         'Use sunscreen with SPF 30+ when outdoors',
  //         'Consider wearing protective clothing',
  //         'Apply antioxidant-rich skincare products',
  //         'Stay hydrated to maintain skin health',
  //         'Limit outdoor activities during peak pollution hours',
  //       ],
  //     });
  //   }
  //
  //   // Smog
  //   if (smogEffects.enabled) {
  //     const severity =
  //       smogEffects.intensity > 0.7
  //         ? 'high'
  //         : smogEffects.intensity > 0.4
  //           ? 'medium'
  //           : 'low';
  //
  //     effects.push({
  //       id: 'atmospheric-effects',
  //       title: 'Atmospheric Effects',
  //       description: smogEffects.description,
  //       details: [
  //         `Smog intensity: ${(smogEffects.intensity * 100).toFixed(0)}%`,
  //         `Visibility opacity: ${(smogEffects.opacity * 100).toFixed(0)}%`,
  //         `Particle density: ${(smogEffects.density / 20).toFixed(1)}x normal`,
  //         'Simulates real-world air quality conditions',
  //         'Based on PM2.5 and PM10 particulate matter levels',
  //       ],
  //       severity,
  //       source: 'Air Quality Data',
  //       actionRecommendations: [
  //         'Wear an N95 or KN95 mask when outdoors',
  //         'Keep windows closed and use air purifiers indoors',
  //         'Avoid outdoor exercise during high pollution periods',
  //         'Use public transportation to reduce emissions',
  //         'Check air quality before planning outdoor activities',
  //       ],
  //     });
  //   }
  //
  //   // Expression
  //   if (recommendedExpression !== 'neutral') {
  //     const severity =
  //       airQuality?.aqi && airQuality.aqi > 150
  //         ? 'high'
  //         : airQuality?.aqi && airQuality.aqi > 100
  //           ? 'medium'
  //           : 'low';
  //
  //     effects.push({
  //       id: 'facial-expression',
  //       title: 'Facial Expression',
  //       description: `Avatar expression set to "${recommendedExpression}" based on air quality and sleep`,
  //       details: [
  //         `Current expression: ${recommendedExpression}`,
  //         `Based on AQI: ${airQuality?.aqi || 'N/A'}`,
  //         `PM2.5 level: ${airQuality?.pm25 || 'N/A'} μg/m³`,
  //         `Last-night sleep: ${
  //           health?.sleepMinutes != null
  //             ? (health.sleepMinutes / 60).toFixed(1) + 'h'
  //             : 'N/A'
  //         }`,
  //         'Expression reflects health impact of air quality and sleep',
  //       ],
  //       severity,
  //       source: 'Air + Sleep Analysis',
  //       actionRecommendations: [
  //         'Practice deep breathing exercises to reduce stress',
  //         'Take breaks from outdoor activities if feeling discomfort',
  //         'Monitor your symptoms and adjust activities accordingly',
  //         'Consider using a humidifier to ease respiratory discomfort',
  //         'Stay informed about air quality forecasts',
  //       ],
  //     });
  //   }
  //
  //   return effects;
  // }, [
  //   skinEffects,
  //   smogEffects,
  //   recommendedExpression,
  //   airQuality,
  //   health?.sleepMinutes,
  // ]);

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
      <ScrollView
        style={styles.container}
        scrollEnabled={scrollEnabled && !activeCelebration}
      >
        <View style={styles.content}>
          <View style={styles.avatarContainer}>
            <AvatarExperience
              showAnimationButton={false && developerControlsEnabled}
              facialExpression={manualExpression || recommendedExpression}
              skinToneAdjustment={skinEffects.totalAdjustment}
              isActive={!!isFocused}
              rainIntensity={rainIntensity}
              rainDirection={rainDirection}
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
              hydrationProgressPercentage={hydrationProgressPercentage}
              hasNearbyDengueRisk={hasNearbyDengueRisk}
            />
            {indicatorCelebration && (
              <CelebrationIndicator
                badgeId={indicatorCelebration}
                onPress={handleOpenCelebration}
              />
            )}
          </View>

          {/* Developer controls */}
          {developerControlsEnabled && (
            <DeveloperControls
              scene={scene}
              setScene={setScene}
              setSceneManuallyOverridden={setSceneManuallyOverridden}
              autoScene={autoScene}
              manualSkinToneAdjustment={manualSkinToneAdjustment}
              setManualSkinToneAdjustment={setManualSkinToneAdjustment}
              rainIntensity={rainIntensity}
              setRainIntensity={setRainIntensity}
              rainDirection={rainDirection}
              setRainDirection={setRainDirection}
              manualExpression={manualExpression}
              setManualExpression={setManualExpression}
              clearManualExpression={clearManualExpression}
              resetOnboarding={() => {
                resetOnboardingSeen();
                setOnboardingStep(0);
                setShowOnboarding(true);
                setScrollEnabled(false);
              }}
              seed7DayHistory={seed7DayHistory}
              seed6ThenCompleteToday={seed6ThenCompleteToday}
              clearHistoryForRetest={clearHistoryForRetest}
              userProfile={userProfile}
            />
          )}

          {/* Main quest list */}
          <QuestList />

          {/* Effects list */}
          {/* <EffectsList effects={activeEffects} /> */}
        </View>
      </ScrollView>

      {/* Onboarding overlay */}
      <OnboardingOverlay
        visible={showOnboarding}
        step={onboardingStep}
        onNext={() => setOnboardingStep(s => Math.min(s + 1, 2))}
        onSkip={async () => {
          setShowOnboarding(false);
          setScrollEnabled(true);
          setOnboardingStep(0);
          markOnboardingSeen();
        }}
        onDone={async () => {
          setShowOnboarding(false);
          setScrollEnabled(true);
          setOnboardingStep(0);
          markOnboardingSeen();
        }}
      />

      <CelebrationSpotlight
        visible={!!activeCelebration}
        badgeId={activeCelebration}
        onClose={handleDismissCelebration}
      />
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
  avatarContainer: {
    // Full-bleed inside a padded ScrollView: cancel horizontal padding
    marginHorizontal: -spacing.lg,
    marginTop: -spacing.lg,
    position: 'relative',
    alignItems: 'stretch',
    marginBottom: 16,
  },
});

export default DashboardScreen;
