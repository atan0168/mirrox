import QuestList from '../components/QuestList';
import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Animated,
  Easing,
  Switch,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { useQueryClient } from '@tanstack/react-query';
import * as Location from 'expo-location';
import ConfettiCannon from 'react-native-confetti-cannon';
import AvatarExperience from '../components/avatar/AvatarExperience';
import { EffectsList, EffectData, Button } from '../components/ui';
import { colors, spacing, fontSize, borderRadius } from '../theme';
import { useAQICNAirQuality } from '../hooks/useAirQuality';
import { useUserProfile } from '../hooks/useUserProfile';
import { useDeveloperControlsPreference } from '../hooks/useDeveloperControlsPreference';
import {
  calculateCombinedEnvironmentalSkinEffects,
  calculateSmogEffects,
} from '../utils/skinEffectsUtils';
import { getCombinedRecommendedExpression } from '../utils/expressionUtils';
import { useHealthData } from '../hooks/useHealthData';
import { useDengueNearby } from '../hooks/useDengueNearby';
import { SkinToneButton } from '../components/controls/SkinToneButton';
import SceneSwitcher, {
  SceneOption,
} from '../components/controls/SceneSwitcher';
import RainIntensityControls from '../components/controls/RainIntensityControls';
import SandboxControls from '../components/controls/SandboxControls';
import { FacialExpressionControls } from '../components/controls/FacialExpressionControls';
import { useAvatarStore } from '../store/avatarStore';
import { useIsFocused } from '@react-navigation/native';
import OnboardingOverlay from '../components/ui/OnboardingOverlay';
import { ENV_REFRESH_INTERVAL_MS } from '../constants';
import { useUIStore } from '../store/uiStore';
import { useHydrationStore } from '../store/hydrationStore';
import { hydrationService } from '../services/HydrationService';
import { Coordinates } from '../models/User';
import { isWithinRadiusKm } from '../utils/geoUtils';

import dayjs from 'dayjs';
import { useQuestHistory } from '../hooks/useQuests';
import { useBadges } from '../hooks/useBadges';
import type { CompletedLog, QuestId, RewardTag, Streak } from '../models/quest';
import { QuestRepository } from '../services/db/QuestRepository';

const ALL_QUEST_IDS: QuestId[] = [
  'drink_2l',
  'haze_mask_today',
  'nature_walk_10m',
  'calm_breath_5m',
  'gratitude_note',
];

const QUEST_REWARD_TAG: Record<QuestId, RewardTag> = {
  drink_2l: 'skin',
  haze_mask_today: 'lung',
  nature_walk_10m: 'stress',
  calm_breath_5m: 'calm',
  gratitude_note: 'happiness',
};

const QUEST_SHORT_TITLE: Record<QuestId, string> = {
  drink_2l: 'Drink Water',
  haze_mask_today: 'Wear Mask',
  nature_walk_10m: 'Walk 10m',
  calm_breath_5m: 'Calm Breathing',
  gratitude_note: 'Gratitude',
};

const QUEST_LONG_TITLE: Record<QuestId, string> = {
  drink_2l: 'Drink 2L Water',
  haze_mask_today: 'Wear Mask on Hazy Day',
  nature_walk_10m: '10-min Nature Walk',
  calm_breath_5m: '5-min Calm Breathing',
  gratitude_note: 'Gratitude Note',
};

const DashboardScreen: React.FC = () => {
  const queryClient = useQueryClient();
  const { history: questHistory } = useQuestHistory();
  useBadges();

  const [celebrateId, setCelebrateId] = useState<
    | null
    | 'streak7_drink'
    | 'streak7_mask'
    | 'streak7_walk'
    | 'streak7_breathe'
    | 'streak7_gratitude'
  >(null);
  const confettiRef = useRef<ConfettiCannon>(null);
  const [previousHistoryLength, setPreviousHistoryLength] = useState(0);

  // --------------------------------- DEV seed helpers ---------------------------------
  const updateHistoryCache = useCallback(
    (updater: (prev: CompletedLog[]) => CompletedLog[]) => {
      queryClient.setQueriesData(
        { queryKey: ['quest-history'] },
        (old: CompletedLog[] | undefined) => updater(old ?? [])
      );
    },
    [queryClient]
  );

  const updateStreakCache = useCallback(
    (questId: QuestId, count: number, lastDate: string) => {
      queryClient.setQueryData(
        ['quest-streaks'],
        (old: Record<QuestId, Streak> | undefined) => ({
          ...(old ?? ({} as Record<QuestId, Streak>)),
          [questId]: { id: questId, count, lastDate },
        })
      );
    },
    [queryClient]
  );

  const seed7DayHistory = useCallback(
    (questId: QuestId) => {
      const now = dayjs();
      const logs: CompletedLog[] = Array.from({ length: 7 }).map((_, i) => {
        const ts = now
          .subtract(6 - i, 'day')
          .endOf('day')
          .valueOf();
        return {
          questId,
          title: QUEST_LONG_TITLE[questId],
          rewardPoints: 0,
          rewardTag: QUEST_REWARD_TAG[questId],
          completedAt: ts,
          streakCount: i + 1,
          note: 'Dev Test Seed',
        };
      });

      updateHistoryCache(prev => [...logs, ...prev].slice(0, 50));
      console.log('✅ [DEV TEST] Seeded 7-day history for:', questId);
    },
    [updateHistoryCache]
  );

  const seed6ThenCompleteToday = useCallback(
    async (questId: QuestId) => {
      const now = dayjs();
      const logs: CompletedLog[] = Array.from({ length: 6 }).map((_, i) => {
        const ts = now
          .subtract(6 - i, 'day')
          .endOf('day')
          .valueOf();
        return {
          questId,
          title: QUEST_SHORT_TITLE[questId],
          rewardPoints: 0,
          rewardTag: QUEST_REWARD_TAG[questId],
          completedAt: ts,
          streakCount: i + 1,
          note: 'DEV seed 6d',
        };
      });

      updateHistoryCache(prev => [...logs, ...prev].slice(0, 50));

      const yesterday = now.subtract(1, 'day').format('YYYY-MM-DD');
      updateStreakCache(questId, 6, yesterday);
      try {
        await QuestRepository.upsertStreak(questId, 6, yesterday);
      } catch (err) {
        console.warn('Failed to seed quest streak for test', err);
      }

      console.log(
        '✅ Seeded 6 days for',
        questId,
        '— streak preset to 6 (lastDate=yesterday). Complete once today to award.'
      );
    },
    [updateHistoryCache, updateStreakCache]
  );

  const clearHistoryForRetest = useCallback(async () => {
    updateHistoryCache(() => []);
    setCelebrateId(null);

    try {
      const today = dayjs().format('YYYY-MM-DD');
      await Promise.all(
        ALL_QUEST_IDS.map(id => QuestRepository.upsertStreak(id, 0, today))
      );
      queryClient.setQueryData(
        ['quest-streaks'],
        (old: Record<QuestId, Streak> | undefined) => {
          const next = { ...(old ?? ({} as Record<QuestId, Streak>)) };
          ALL_QUEST_IDS.forEach(id => {
            next[id] = { id, count: 0, lastDate: today };
          });
          return next;
        }
      );
    } catch (err) {
      console.warn('Failed to reset streaks during dev clear', err);
    }

    console.log('♻️ [DEV TEST] Cleared history for re-test');
  }, [updateHistoryCache, queryClient]);
  // -------------------------------------------------------------------------------------

  const isFocused = useIsFocused();
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

  // Eye-bags controls via store (no prop drilling)
  const eyeBagsOverride = useAvatarStore(s => s.eyeBagsOverrideEnabled);
  const setEyeBagsOverride = useAvatarStore(s => s.setEyeBagsOverrideEnabled);
  const eyeBagsIntensity = useAvatarStore(s => s.eyeBagsIntensity);
  const setEyeBagsIntensity = useAvatarStore(s => s.setEyeBagsIntensity);
  const eyeBagsOffsetX = useAvatarStore(s => s.eyeBagsOffsetX);
  const eyeBagsOffsetY = useAvatarStore(s => s.eyeBagsOffsetY);
  const eyeBagsOffsetZ = useAvatarStore(s => s.eyeBagsOffsetZ);
  const setEyeBagsOffsets = useAvatarStore(s => s.setEyeBagsOffsets);
  const eyeBagsWidth = useAvatarStore(s => s.eyeBagsWidth);
  const eyeBagsHeight = useAvatarStore(s => s.eyeBagsHeight);
  const setEyeBagsSize = useAvatarStore(s => s.setEyeBagsSize);

  const { developerControlsEnabled } = useDeveloperControlsPreference();

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
    if (!userProfile) {
      if (autoScene !== 'home') setAutoScene('home');
      return;
    }

    if (
      locationPermissionStatus !== Location.PermissionStatus.GRANTED ||
      !currentLocation
    ) {
      if (autoScene !== 'home') setAutoScene('home');
      return;
    }

    const homeLocation = userProfile.homeLocation || null;
    const workLocation = userProfile.workLocation || null;

    const nearHome =
      !!homeLocation &&
      isWithinRadiusKm(currentLocation, homeLocation.coordinates, 1);
    const nearWork =
      !!workLocation &&
      isWithinRadiusKm(currentLocation, workLocation.coordinates, 1);

    let nextScene: SceneOption = 'home';
    if (nearHome) nextScene = 'home';
    else if (nearWork) nextScene = 'city';

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

  // Effects list data
  const activeEffects = useMemo((): EffectData[] => {
    const effects: EffectData[] = [];

    // Skin
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

    // Smog
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
        source: 'Air Quality Data',
        actionRecommendations: [
          'Wear an N95 or KN95 mask when outdoors',
          'Keep windows closed and use air purifiers indoors',
          'Avoid outdoor exercise during high pollution periods',
          'Use public transportation to reduce emissions',
          'Check air quality before planning outdoor activities',
        ],
      });
    }

    // Expression
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
        description: `Avatar expression set to "${recommendedExpression}" based on air quality and sleep`,
        details: [
          `Current expression: ${recommendedExpression}`,
          `Based on AQI: ${airQuality?.aqi || 'N/A'}`,
          `PM2.5 level: ${airQuality?.pm25 || 'N/A'} μg/m³`,
          `Last-night sleep: ${
            health?.sleepMinutes != null
              ? (health.sleepMinutes / 60).toFixed(1) + 'h'
              : 'N/A'
          }`,
          'Expression reflects health impact of air quality and sleep',
        ],
        severity,
        source: 'Air + Sleep Analysis',
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
  }, [
    skinEffects,
    smogEffects,
    recommendedExpression,
    airQuality,
    health?.sleepMinutes,
  ]);

  // -------------------------------- 7-day streak detection (UI only) ----------------------------
  // NEW: Generic helper — detect any 7-day consecutive streak from YYYY-MM-DD strings
  const has7Consecutive = (days: string[]) => {
    if ((days?.length ?? 0) < 7) return false;
    const uniqSorted = Array.from(new Set(days)).sort();
    let streak = 1;
    for (let i = 1; i < uniqSorted.length; i++) {
      if (dayjs(uniqSorted[i]).diff(dayjs(uniqSorted[i - 1]), 'day') === 1) {
        streak++;
        if (streak >= 7) return true;
      } else {
        streak = 1;
      }
    }
    return false;
  };

  // NEW: Aggregate days per quest from history; compute 7-day flags (drink/mask/walk/breathe/gratitude)
  const flags = useMemo(() => {
    if (!questHistory?.length)
      return {
        drink7: false,
        mask7: false,
        walk7: false,
        breathe7: false,
        gratitude7: false,
      };

    const map: Record<string, string[]> = {};
    questHistory.forEach(h => {
      const dayKey = dayjs(h.completedAt).format('YYYY-MM-DD');
      if (!map[h.questId]) map[h.questId] = [];
      map[h.questId].push(dayKey);
    });

    return {
      drink7: has7Consecutive(map['drink_2l'] ?? []),
      mask7: has7Consecutive(map['haze_mask_today'] ?? []),
      walk7: has7Consecutive(map['nature_walk_10m'] ?? []),
      breathe7: has7Consecutive(map['calm_breath_5m'] ?? []),
      gratitude7: has7Consecutive(map['gratitude_note'] ?? []),
    };
  }, [questHistory]);

  // Trigger a celebration modal for the first truthy flag
  useEffect(() => {
    if (celebrateId) return;

    if (flags.drink7) setCelebrateId('streak7_drink');
    else if (flags.mask7) setCelebrateId('streak7_mask');
    else if (flags.walk7) setCelebrateId('streak7_walk');
    else if (flags.breathe7) setCelebrateId('streak7_breathe');
    else if (flags.gratitude7) setCelebrateId('streak7_gratitude');
  }, [flags, celebrateId]);

  useEffect(() => {
    if (questHistory && questHistory.length > previousHistoryLength) {
      confettiRef.current?.start();
    }
    setPreviousHistoryLength(questHistory?.length ?? 0);
  }, [questHistory?.length]);
  // ----------------------------------------------------------------------------------------------

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
          </View>

          {/* Developer controls */}
          {developerControlsEnabled && (
            <View style={styles.controlsContainer}>
              <Text style={styles.controlsTitle}>Avatar Customization</Text>
              <SceneSwitcher
                value={scene}
                onChange={value => {
                  setScene(value);
                  setSceneManuallyOverridden(value !== autoScene);
                }}
              />
              <SkinToneButton
                skinToneAdjustment={manualSkinToneAdjustment}
                onSkinToneChange={setManualSkinToneAdjustment}
              />
              <SandboxControls location={userProfile?.location} />
              <RainIntensityControls
                value={rainIntensity}
                onChange={setRainIntensity}
                direction={rainDirection}
                onChangeDirection={setRainDirection}
              />

              {/* Eye Bags (Dark Circles) Developer Controls */}
              <View style={styles.devCard}>
                <View style={styles.devRow}>
                  <Text style={styles.devLabel}>Eye Bags (Override)</Text>
                  <Switch
                    value={eyeBagsOverride}
                    onValueChange={setEyeBagsOverride}
                  />
                </View>
                {eyeBagsOverride && (
                  <View style={{ marginTop: spacing.sm }}>
                    <Text style={styles.devSubtle}>
                      Intensity: {(eyeBagsIntensity * 100).toFixed(0)}%
                    </Text>
                    <Slider
                      value={eyeBagsIntensity}
                      onValueChange={setEyeBagsIntensity}
                      minimumValue={0}
                      maximumValue={1}
                      step={0.05}
                      minimumTrackTintColor={colors.neutral[700]}
                      maximumTrackTintColor={colors.neutral[300]}
                    />
                    <Text style={styles.devSubtle}>
                      Offset X: {eyeBagsOffsetX.toFixed(3)}
                    </Text>
                    <Slider
                      value={eyeBagsOffsetX}
                      onValueChange={v =>
                        setEyeBagsOffsets(v, eyeBagsOffsetY, eyeBagsOffsetZ)
                      }
                      minimumValue={-0.15}
                      maximumValue={0.15}
                      step={0.005}
                      minimumTrackTintColor={colors.neutral[700]}
                      maximumTrackTintColor={colors.neutral[300]}
                    />
                    <Text style={styles.devSubtle}>
                      Offset Y: {eyeBagsOffsetY.toFixed(3)}
                    </Text>
                    <Slider
                      value={eyeBagsOffsetY}
                      onValueChange={v =>
                        setEyeBagsOffsets(eyeBagsOffsetX, v, eyeBagsOffsetZ)
                      }
                      minimumValue={-0.15}
                      maximumValue={0.15}
                      step={0.005}
                      minimumTrackTintColor={colors.neutral[700]}
                      maximumTrackTintColor={colors.neutral[300]}
                    />
                    <Text style={styles.devSubtle}>
                      Offset Z: {eyeBagsOffsetZ.toFixed(3)}
                    </Text>
                    <Slider
                      value={eyeBagsOffsetZ}
                      onValueChange={v =>
                        setEyeBagsOffsets(eyeBagsOffsetX, eyeBagsOffsetY, v)
                      }
                      minimumValue={-0.2}
                      maximumValue={0.2}
                      step={0.005}
                      minimumTrackTintColor={colors.neutral[700]}
                      maximumTrackTintColor={colors.neutral[300]}
                    />
                    <Text style={styles.devSubtle}>
                      Width: {eyeBagsWidth.toFixed(3)}
                    </Text>
                    <Slider
                      value={eyeBagsWidth}
                      onValueChange={v => setEyeBagsSize(v, eyeBagsHeight)}
                      minimumValue={0.05}
                      maximumValue={0.25}
                      step={0.005}
                      minimumTrackTintColor={colors.neutral[700]}
                      maximumTrackTintColor={colors.neutral[300]}
                    />
                    <Text style={styles.devSubtle}>
                      Height: {eyeBagsHeight.toFixed(3)}
                    </Text>
                    <Slider
                      value={eyeBagsHeight}
                      onValueChange={v => setEyeBagsSize(eyeBagsWidth, v)}
                      minimumValue={0.03}
                      maximumValue={0.15}
                      step={0.005}
                      minimumTrackTintColor={colors.neutral[700]}
                      maximumTrackTintColor={colors.neutral[300]}
                    />
                    <Text style={styles.devHint}>
                      When override is off, eye bags follow sleep data.
                    </Text>
                  </View>
                )}
              </View>

              {/* Developer utility: Reset onboarding and seed badges */}
              <View style={{ marginTop: spacing.md }}>
                <Button
                  onPress={async () => {
                    resetOnboardingSeen();
                    setOnboardingStep(0);
                    setShowOnboarding(true);
                    setScrollEnabled(false);
                  }}
                >
                  Show onboarding again
                </Button>

                {/* NEW: Badge & Streak testing helpers for all 5 quests */}
                <View style={{ marginTop: spacing.md, gap: 8 }}>
                  <Button onPress={() => seed7DayHistory('drink_2l')}>
                    🧪 DEV: Seed 7-day Hydration
                  </Button>
                  <Button onPress={() => seed7DayHistory('haze_mask_today')}>
                    🧪 DEV: Seed 7-day Mask
                  </Button>
                  <Button onPress={() => seed7DayHistory('nature_walk_10m')}>
                    🧪 DEV: Seed 7-day Walk
                  </Button>
                  <Button onPress={() => seed7DayHistory('calm_breath_5m')}>
                    🧪 DEV: Seed 7-day Breathe
                  </Button>
                  <Button onPress={() => seed7DayHistory('gratitude_note')}>
                    🧪 DEV: Seed 7-day Gratitude
                  </Button>
                  <Button onPress={() => void clearHistoryForRetest()}>
                    ♻️ DEV: Clear injected history
                  </Button>
                  <Button
                    onPress={() => void seed6ThenCompleteToday('drink_2l')}
                  >
                    🧪 Seed 6d Hydration (award on today)
                  </Button>
                  <Button
                    onPress={() =>
                      void seed6ThenCompleteToday('haze_mask_today')
                    }
                  >
                    🧪 Seed 6d Mask (award on today)
                  </Button>
                  <Button
                    onPress={() =>
                      void seed6ThenCompleteToday('nature_walk_10m')
                    }
                  >
                    🧪 Seed 6d Walk (award on today)
                  </Button>
                  <Button
                    onPress={() =>
                      void seed6ThenCompleteToday('calm_breath_5m')
                    }
                  >
                    🧪 Seed 6d Breathe (award on today)
                  </Button>
                  <Button
                    onPress={() =>
                      void seed6ThenCompleteToday('gratitude_note')
                    }
                  >
                    🧪 Seed 6d Gratitude (award on today)
                  </Button>
                </View>
              </View>
            </View>
          )}

          {/* Facial Expressions (dev only) */}
          {developerControlsEnabled && (
            <FacialExpressionControls
              currentExpression={manualExpression}
              onExpressionChange={setManualExpression}
              onReset={clearManualExpression}
            />
          )}

          {/* Main quest list */}
          <QuestList />

          {/* Effects list */}
          <EffectsList effects={activeEffects} />
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

      {/* Confetti effect for quest completion */}
      <ConfettiCannon
        ref={confettiRef}
        count={200}
        origin={{ x: -10, y: 0 }}
        autoStart={false}
        fadeOut
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
    // Let child fill width
    alignItems: 'stretch',
    // Optional spacing below the canvas
    marginBottom: 16,
  },
  controlsContainer: {
    marginBottom: 30,
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    ...{
      elevation: 3,
      shadowColor: colors.black,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
    },
  },
  controlsTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.neutral[800],
    marginBottom: spacing.md,
  },
  devCard: {
    backgroundColor: colors.white,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    ...{
      elevation: 2,
      shadowColor: colors.black,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.08,
      shadowRadius: 2,
    },
    marginTop: spacing.md,
  },
  devRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  devLabel: {
    fontSize: fontSize.base,
    fontWeight: '600',
    color: colors.neutral[800],
  },
  devSubtle: {
    fontSize: fontSize.sm,
    color: colors.neutral[600],
    marginBottom: spacing.xs,
  },
  devHint: {
    fontSize: fontSize.xs,
    color: colors.neutral[500],
    marginTop: spacing.xs,
  },
});

export default DashboardScreen;
