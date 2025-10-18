import React, { useMemo } from 'react';
import { View, StyleSheet, Dimensions, Text, Platform } from 'react-native';
import { Canvas } from '@react-three/fiber/native';
import { OrbitControls } from '@react-three/drei/native';
import * as THREE from 'three';

import { AvatarModel } from './AvatarModel';
import { SmogController } from '../effects/SmogController';
import { StressAura } from '../effects/StressAura';
import { FloatingStressIcon } from '../effects/FloatingStressIcon';
import { MosquitoSwarm } from '../effects/MosquitoSwarm';
import { AnimationControls } from '../controls/AnimationControls';
import { LoadingState, ErrorState } from '../ui/StateComponents';
import AvatarLoadingIndicator from '../ui/AvatarLoadingIndicator';
import { useStressVisualsPreference } from '../../hooks/useStressVisualsPreference';
import { useDeveloperControlsPreference } from '../../hooks/useDeveloperControlsPreference';
import { useStressLevel } from '../../hooks/useStressLevel';
import { useMeal } from '../../hooks/useMeal';
import { useUserProfile } from '../../hooks/useUserProfile';
import { localStorageService } from '../../services/LocalStorageService';
import { assetPreloader } from '../../services/AssetPreloader';
import {
  suppressEXGLWarnings,
  configureMobileCompatibility,
  configureTextureLoader,
} from '../../utils/ThreeUtils';
import { calculateSmogEffects } from '../../utils/skinEffectsUtils';
import { AVAILABLE_ANIMATIONS, FULL_SLEEP_MINUTES } from '../../constants';
import { getAnimationForAQI } from '../../utils/animationUtils';
import { useState, useEffect, useRef } from 'react';
import { StressInfoModal } from '../ui/StressInfoModal';
import { useHealthData } from '../../hooks/useHealthData';
import { computeEnergy } from '../../utils/healthUtils';
import { healthDataService } from '../../services/HealthDataService';
import { SceneEnvironment } from '../scene/SceneEnvironment';
import { buildEnvironmentForContext } from '../../scene/environmentBuilder';
import SceneZenPark from '../scene/SceneZenPark';
import SceneCityStreet from '../scene/SceneCityStreet';
import WeatherLighting, { getLightingConfig } from '../scene/WeatherLighting';
import WeatherControls from '../controls/WeatherControls';
import TimeOfDayControls from '../controls/TimeOfDayControls';
import SceneHome from '../scene/SceneHome';
import { useHomeSceneStore } from '../../store/homeSceneStore';
import HomeSceneControls from '../controls/HomeSceneControls'; // legacy controls (timeOfDay portion will be ignored)
import { useAvatarStore } from '../../store/avatarStore';
import RainParticles from '../effects/RainParticles';
import SpriteClouds from '../scene/SpriteClouds';
import Mattress from '../scene/Mattress';
import BatteryIndicator from '../BatteryIndicator';
import HydrationIndicator from '../HydrationIndicator';
import { colors } from '../../theme';
import { useAvatarAnimationEngine } from '../../hooks/useAvatarAnimationEngine';
import ViewAchievementButton from '../ViewAchievementButton';
import {
  estimateDailyCalorieGoal,
  getMealItemNutrientTotal,
} from '../../utils/nutritionUtils';
import TypingChatBubble from '../ui/TypingChatBubble';

// Initialize Three.js configuration
suppressEXGLWarnings();
configureMobileCompatibility();
configureTextureLoader();

interface AvatarExperienceProps {
  showAnimationButton?: boolean;
  width?: number;
  height?: number;
  heightRatio?: number; // If height not provided, use width * heightRatio
  facialExpression?: string;
  skinToneAdjustment?: number;
  rainIntensity?: number; // 0..1 slider for developer to control rain density
  rainDirection?: 'vertical' | 'angled';
  // Air quality props for automatic smog effects
  airQualityData?: {
    aqi?: number | null;
    pm25?: number | null;
    pm10?: number | null;
    temperature?: number | null;
    humidity?: number | null;
  } | null;
  // Optional environment context
  weather?: 'sunny' | 'cloudy' | 'rainy' | null;
  // Notify parent when user is interacting (e.g., to disable ScrollView)
  // onInteractionChange removed (unused)
  // Scene selection
  scene?: 'zenpark' | 'city' | 'home';
  // Whether this canvas is active/visible (used to pause rendering when not focused)
  isActive?: boolean;
  // Hydration progress percentage (0-100) for visual feedback
  hydrationProgressPercentage?: number;
  hasNearbyDengueRisk?: boolean;
}

function AvatarExperience({
  showAnimationButton = false,
  width,
  height,
  heightRatio = 1.6,
  facialExpression: externalFacialExpression = 'neutral',
  skinToneAdjustment = 0,
  rainIntensity = 0.6,
  rainDirection = 'vertical',
  airQualityData = null,
  weather = null,
  // onInteractionChange removed,
  scene = 'zenpark',
  isActive = true,
  hydrationProgressPercentage = 50,
  hasNearbyDengueRisk = false,
}: AvatarExperienceProps) {
  const screenWidth = Dimensions.get('window').width;
  const effectiveWidth = width ?? screenWidth;
  const effectiveHeight = height ?? Math.round(effectiveWidth * heightRatio);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const activeAnimation = useAvatarStore(s => s.activeAnimation);
  const isManualAnimation = useAvatarStore(s => s.isManualAnimation);
  const sleepMode = useAvatarStore(s => s.sleepMode);
  const overrideWeather = useAvatarStore(s => s.overrideWeather);
  const timeOfDayOverride = useAvatarStore(s => s.timeOfDayOverride);
  const currentPhase = useAvatarStore(s => s.currentPhase);
  // const setTimeOfDayOverride = useAvatarStore(s => s.setTimeOfDayOverride);
  const isAvatarLoading = useAvatarStore(s => s.isAvatarLoading);
  const loadingProgress = useAvatarStore(s => s.loadingProgress);
  const showStressInfoModal = useAvatarStore(s => s.showStressInfoModal);
  const manualFacialExpression = useAvatarStore(s => s.manualFacialExpression);
  const isManualFacialExpression = useAvatarStore(
    s => s.isManualFacialExpression
  );

  const setActiveAnimation = useAvatarStore(s => s.setActiveAnimation);
  const setSleepMode = useAvatarStore(s => s.setSleepMode);
  const setOverrideWeather = useAvatarStore(s => s.setOverrideWeather);
  const setIsAvatarLoading = useAvatarStore(s => s.setAvatarLoading);
  const setLoadingProgress = useAvatarStore(s => s.setLoadingProgress);
  const setShowStressInfoModal = useAvatarStore(s => s.setShowStressInfoModal);

  const canvasRef = useRef<View | null>(null);

  // Get stress visuals preference
  const { stressVisualsEnabled } = useStressVisualsPreference();

  // Get developer controls preference
  const { developerControlsEnabled } = useDeveloperControlsPreference();

  // HRV-driven stress insights
  const stressResult = useStressLevel();

  // Health data
  const { data: health } = useHealthData({ autoSync: false });
  const { data: mealItems } = useMeal();
  const { data: userProfile } = useUserProfile();
  const totalDietaryEnergyKcal = useMemo(() => {
    if (!mealItems || mealItems.length === 0) {
      return 0;
    }
    return Math.round(
      mealItems.reduce((sum, item) => {
        const val = getMealItemNutrientTotal(item, 'energy_kcal');
        return sum + (val ?? 0);
      }, 0)
    );
  }, [mealItems]);
  const nutritionGoalInfo = useMemo(
    () => estimateDailyCalorieGoal(userProfile),
    [userProfile]
  );
  const hasMetCalorieGoal =
    nutritionGoalInfo.goal > 0 &&
    totalDietaryEnergyKcal >= nutritionGoalInfo.goal;
  const energyInfo = useMemo(() => {
    if (!health) return null;
    return computeEnergy(health.steps, health.sleepMinutes);
  }, [health]);

  // Build environment config from context (AQI, sleep, weather)
  const environmentConfig = useMemo(() => {
    return buildEnvironmentForContext({
      aqi: airQualityData?.aqi ?? null,
      sleepMinutes: health?.sleepMinutes ?? null,
      weather: overrideWeather ?? weather ?? null,
    });
  }, [airQualityData?.aqi, health?.sleepMinutes, weather, overrideWeather]);

  // Determine lighting preset and background color based on weather
  const baseWeatherPreset = (overrideWeather ?? weather ?? 'sunny') as
    | 'sunny'
    | 'cloudy'
    | 'rainy';
  // Derive global time-of-day phase (morning/day/evening/night) from override or clock
  const derivedPhase = useMemo(() => {
    if (timeOfDayOverride) return timeOfDayOverride;
    return currentPhase; // Provided by scheduler hook
  }, [timeOfDayOverride, currentPhase]);
  const isNight = derivedPhase === 'night';
  const weatherPreset = isNight ? 'night' : baseWeatherPreset;
  const lightingBackground = useMemo(() => {
    return getLightingConfig(
      weatherPreset as 'sunny' | 'cloudy' | 'rainy' | 'night'
    ).background;
  }, [weatherPreset]);
  const mappedLightingPreset = useMemo(
    () => weatherPreset as 'sunny' | 'cloudy' | 'rainy' | 'night',
    [weatherPreset]
  );

  const isSweatyWeather = useMemo(() => {
    const temp = airQualityData?.temperature ?? null;
    const humidity = airQualityData?.humidity ?? null;
    const effectiveWeather = overrideWeather ?? weather ?? null;
    const rainy =
      effectiveWeather === 'rainy' || mappedLightingPreset === 'rainy';

    if (rainy) {
      return false;
    }

    if (typeof temp === 'number') {
      if (temp >= 32) return true;
      if (temp >= 28 && typeof humidity === 'number' && humidity >= 70) {
        return true;
      }
    }

    return false;
  }, [
    airQualityData?.humidity,
    airQualityData?.temperature,
    mappedLightingPreset,
    overrideWeather,
    weather,
  ]);

  // Calculate stress effects from HRV-based health signals
  const stressEffects = useMemo(() => {
    const result = stressResult;
    const stressLevel = stressVisualsEnabled ? result.stressLevel : 'none';
    const intensity = stressVisualsEnabled ? result.intensity : 0;

    let facialExpression = externalFacialExpression;
    if (stressLevel !== 'none') {
      switch (stressLevel) {
        case 'mild':
          facialExpression = 'concerned';
          break;
        case 'moderate':
          facialExpression = 'tired';
          break;
        case 'high':
          facialExpression = 'exhausted';
          break;
      }
    }

    return {
      stressLevel,
      intensity,
      shouldShowIcon: stressLevel !== 'none' && stressVisualsEnabled,
      facialExpression,
      hrvMs: result.hrvMs,
      baselineHrvMs: result.baselineHrvMs,
      restingHeartRateBpm: result.restingHeartRateBpm,
      baselineRestingHeartRateBpm: result.baselineRestingHeartRateBpm,
      reasons: result.reasons,
    } as const;
  }, [stressResult, stressVisualsEnabled, externalFacialExpression]);

  // Use stress-modified facial expression unless manually overridden via controls
  const facialExpression = stressEffects.facialExpression;
  // If no HRV stress override, tweak facial expression based on sleep and hydration
  const healthDrivenFacial = useMemo(() => {
    if (!health) return facialExpression;
    if (stressEffects.stressLevel !== 'none') return facialExpression;
    // Only apply internal health tweaks when no external recommendation was provided
    // i.e., parent baseline is neutral (no combined logic).
    if (externalFacialExpression !== 'neutral') return facialExpression;

    // Hydration takes priority over sleep if severely dehydrated
    if (hydrationProgressPercentage < 25) {
      return 'exhausted'; // Severe dehydration - fatigued expression
    }

    const sleepH = (health.sleepMinutes || 0) / 60;
    if (sleepH > 0 && sleepH < 6) return 'tired';
    if (sleepH > 8.5) return 'calm';

    // Optimal hydration (≥100%) promotes calm/happy expression
    if (hydrationProgressPercentage >= 100) {
      return 'calm'; // Well-hydrated - calm, content expression
    }

    return facialExpression;
  }, [
    health,
    facialExpression,
    stressEffects.stressLevel,
    externalFacialExpression,
    hydrationProgressPercentage,
  ]);

  // Final expression with full manual override (bypasses sleep/stress/health)
  const finalFacialExpression = useMemo(() => {
    if (isManualFacialExpression && manualFacialExpression) {
      return manualFacialExpression;
    }
    return healthDrivenFacial;
  }, [isManualFacialExpression, manualFacialExpression, healthDrivenFacial]);

  // Determine if user is sleep-deprived (less than 6h but greater than 0)
  // Also drive slump animation when user had <6h sleep (only when not in sleep mode and no manual animation)

  const isSleepDeprived = useMemo(() => {
    if (!health) return false;
    const sleepH = (health.sleepMinutes || 0) / 60;
    return sleepH > 0 && sleepH < 6;
  }, [health]);

  // Eye-bag effect (dark circles) — auto derive from sleep when not explicitly provided
  // If user sleeps < 7.5h (FULL_SLEEP_MINUTES), apply 0.1 intensity per
  // consecutive day of insufficient sleep, capped at 0.6. Disable when >= 7.5h.
  const setEyeBagsAuto = useAvatarStore(s => s.setEyeBagsAuto);
  useEffect(() => {
    let cancelled = false;
    const updateEyeBags = async () => {
      const sleepMin = health?.sleepMinutes ?? null;
      if (sleepMin == null || sleepMin <= 0) {
        if (!cancelled) setEyeBagsAuto(false, 0);
        return;
      }

      if (sleepMin >= FULL_SLEEP_MINUTES) {
        if (!cancelled) setEyeBagsAuto(false, 0);
        return;
      }

      try {
        const history = await healthDataService.getHistory();
        const snapshots = history?.snapshots ?? [];

        const todayDate = health?.date ?? null;
        let streak = 1; // We've already confirmed today's sleep was insufficient
        let previousDate: Date | null = todayDate
          ? new Date(`${todayDate}T00:00:00`)
          : null;

        for (let i = snapshots.length - 1; i >= 0 && streak < 6; i--) {
          const snapshot = snapshots[i];
          if (!snapshot) continue;

          // Skip today's snapshot if it's already counted via `health`
          if (todayDate && snapshot.date === todayDate) {
            continue;
          }

          const minutes = snapshot.sleepMinutes ?? 0;
          if (minutes > 0 && minutes < FULL_SLEEP_MINUTES) {
            if (snapshot.date) {
              const currentDate = new Date(`${snapshot.date}T00:00:00`);
              if (previousDate) {
                const diffDays = Math.round(
                  (previousDate.getTime() - currentDate.getTime()) /
                    (24 * 60 * 60 * 1000)
                );
                if (diffDays > 1) break; // Non-consecutive day -> stop streak
              }
              previousDate = currentDate;
            }
            streak += 1;
          } else {
            break; // Streak broken by sufficient sleep or missing data
          }
        }

        const enabled = streak > 0;
        const intensity = enabled
          ? Math.min(0.7, Math.max(0.1, streak * 0.1))
          : 0;

        if (!cancelled) setEyeBagsAuto(enabled, intensity);
      } catch {
        // On error, degrade gracefully to last-night-only logic
        if (!cancelled) setEyeBagsAuto(true, 0.1);
      }
    };

    updateEyeBags();
    return () => {
      cancelled = true;
    };
  }, [health?.sleepMinutes, health?.date, setEyeBagsAuto]);

  // Calculate automatic smog effects based on air quality
  const autoSmogEffects = useMemo(() => {
    if (!airQualityData) {
      return {
        enabled: false,
        intensity: 0,
        opacity: 0,
        density: 0,
        description: 'No air quality data',
      };
    }
    return calculateSmogEffects(airQualityData);
  }, [airQualityData]);

  // Use automatic smog effects, but allow manual override via controls
  const effectiveHazeEnabled = autoSmogEffects.enabled;
  const effectiveSmogIntensity = autoSmogEffects.intensity;
  const effectiveSmogOpacity = autoSmogEffects.enabled
    ? autoSmogEffects.opacity
    : 0.3;
  const effectiveSmogDensity = autoSmogEffects.enabled
    ? autoSmogEffects.density
    : 60;

  // Get AQI-based animation recommendation
  const aqiAnimationRecommendation = useMemo(() => {
    const aqi = airQualityData?.aqi;
    const recommendation = getAnimationForAQI(aqi);

    // If stress visuals are disabled, filter out breathing animations
    if (!stressVisualsEnabled && recommendation.animation === 'breathing') {
      console.log(
        `🚫 Stress visuals disabled - blocking breathing animation for AQI: ${aqi}`
      );
      return {
        animation: null, // Use idle animations instead
        reason: `Stress visuals disabled - using idle animations instead of breathing (AQI: ${aqi})`,
        isAutomatic: true,
      };
    }

    return recommendation;
  }, [airQualityData?.aqi, stressVisualsEnabled]);

  const recommendedAnimation = aqiAnimationRecommendation?.animation ?? null;

  // Sleep mode time window (00:00 - 08:00 local)
  useEffect(() => {
    const checkSleepWindow = () => {
      const now = new Date();
      const hours = now.getHours();
      const inWindow = hours >= 0 && hours < 8; // 00:00 inclusive to 07:59
      setSleepMode(inWindow);
    };
    checkSleepWindow();
    const interval = setInterval(checkSleepWindow, 60 * 1000); // every minute
    return () => clearInterval(interval);
  }, []);

  // Sync derived global phase into home scene store when active
  const setHomeTime = useHomeSceneStore?.(s => s.setTimeOfDay);
  useEffect(() => {
    if (scene === 'home' && setHomeTime) {
      // Map derivedPhase directly (phases align names)
      setHomeTime(derivedPhase);
    }
  }, [scene, derivedPhase, setHomeTime]);

  const animationContext = useMemo(
    () => ({
      activeAnimation,
      isManualAnimation,
      sleepMode,
      stressLevel: stressEffects.stressLevel,
      stressVisualsEnabled,
      isSweatyWeather,
      isSleepDeprived,
      hasNearbyDengueRisk,
      recommendedAnimation,
      hasMetCalorieGoal,
      aqi: airQualityData?.aqi ?? null,
      aqiReason:
        aqiAnimationRecommendation?.reason ??
        'No automatic animation recommendation',
    }),
    [
      activeAnimation,
      isManualAnimation,
      sleepMode,
      stressEffects.stressLevel,
      stressVisualsEnabled,
      isSweatyWeather,
      isSleepDeprived,
      hasNearbyDengueRisk,
      recommendedAnimation,
      airQualityData?.aqi,
      aqiAnimationRecommendation?.reason,
    ]
  );

  const { resetEngine, idleAnimations } = useAvatarAnimationEngine({
    context: animationContext,
    setActiveAnimation,
    isActive,
  });

  const showNutritionBubble =
    hasMetCalorieGoal && activeAnimation === 'thumbs_up';

  useEffect(() => {
    return () => {
      resetEngine();
    };
  }, [resetEngine]);

  // Load avatar
  useEffect(() => {
    const loadAvatar = async () => {
      try {
        console.log('Loading avatar from preloaded assets...');

        let url = assetPreloader.getPreloadedAvatarUrl();

        if (!url) {
          console.log('No preloaded avatar found, falling back to cache...');
          url = await localStorageService.getAvatarWithCaching();
        }

        if (!url) {
          throw new Error('Failed to load avatar');
        }

        console.log(
          `Loading avatar from: ${url.startsWith('file://') ? 'local cache' : 'remote'}`
        );
        setAvatarUrl(url);
      } catch {
        setError('Failed to load avatar');
      }
    };

    loadAvatar();
  }, []);

  const handleAnimationToggle = (animationName: string) => {
    resetEngine();

    if (activeAnimation === animationName) {
      console.log(`Stopping animation: ${animationName}`);
      setActiveAnimation(null, { manual: false });
    } else {
      console.log(`Starting animation: ${animationName}`);
      setActiveAnimation(animationName, { manual: true });
    }
  };

  const handleAvatarLoadingChange = (loading: boolean) => {
    setIsAvatarLoading(loading);
  };

  const handleLoadingProgress = (progress: {
    loaded: number;
    total: number;
    item: string;
  }) => {
    setLoadingProgress(progress);
  };

  if (!avatarUrl) {
    return <LoadingState width={effectiveWidth} height={effectiveHeight} />;
  }

  if (error) {
    return (
      <ErrorState
        error={error}
        width={effectiveWidth}
        height={effectiveHeight}
      />
    );
  }

  return (
    <View
      style={[
        styles.container,
        {
          width: '100%',
          height: effectiveHeight,
          backgroundColor: lightingBackground,
        },
      ]}
    >
      {/* Canvas container */}
      <View style={{ flex: 1 }}>
        <Canvas
          ref={canvasRef}
          gl={{
            antialias: false,
            powerPreference: 'high-performance',
            // Avoid preserveDrawingBuffer for perf/memory; not needed for screenshots
            preserveDrawingBuffer: false,
          }}
          // Pause render loop when screen is not focused to reduce GPU/CPU load
          frameloop={isActive ? 'always' : 'never'}
          camera={{
            position: [0, 0.5, 5],
            fov: 60,
          }}
          onCreated={({ gl, camera }) => {
            console.log('Canvas created. Configuring renderer...');
            // Backdrop from current lighting preset
            gl.setClearColor(lightingBackground);
            gl.outputColorSpace = THREE.SRGBColorSpace;
            gl.toneMapping = THREE.NoToneMapping;
            // Disable expensive shadow maps on Android for performance/visual artifacts
            gl.shadowMap.enabled = Platform.OS !== 'android';
            gl.shadowMap.type = THREE.PCFSoftShadowMap;
            // Center camera on avatar group to keep props placed relative visually consistent
            camera.lookAt(0, -1.6, 1.0);
            console.log('Renderer configured.');
          }}
        >
          {/* Lighting preset, reacts to weather (or developer override) */}
          <WeatherLighting preset={mappedLightingPreset} />

          {/* Subtle distance fog for city to soften horizon */}
          {scene === 'city' && (
            <fog
              attach="fog"
              color={'#dfe7f2'}
              near={12}
              far={85}
              args={[0, 0, 0]}
            />
          )}

          {/* Rain effect for rainy preset */}
          {mappedLightingPreset === 'rainy' && scene !== 'home' && (
            <RainParticles
              enabled
              mode="streaks"
              count={Math.round(1200 + rainIntensity * 1400)}
              area={[22, 22]}
              dropHeight={10}
              groundY={-1.72}
              speed={6 + rainIntensity * 4}
              wind={
                rainDirection === 'angled'
                  ? [0.6 + 0.4 * rainIntensity, 0.18 + 0.12 * rainIntensity]
                  : [0, 0]
              }
              lengthRange={[
                0.08 + rainIntensity * 0.04,
                0.16 + rainIntensity * 0.06,
              ]}
              slantFactor={rainDirection === 'angled' ? 1.0 : 0}
              color={0xd0e8ff}
              opacity={0.9}
            />
          )}
          {/* Home scene rain now handled inside SceneHome for proper layering */}
          {/* Night fills: stronger and warmer for city to illuminate avatar */}
          {mappedLightingPreset === 'night' && (
            <>
              {scene === 'city' ? (
                <>
                  {/* Warm key from street-lamp side */}
                  <pointLight
                    position={[1.2, 1.2, 2.0]}
                    color={0xffe4b5}
                    intensity={1.0}
                    distance={12}
                    decay={2}
                  />
                  {/* Cool fill from opposite side for balance */}
                  <pointLight
                    position={[-1.0, 1.4, 2.4]}
                    color={0xaac6ff}
                    intensity={0.6}
                    distance={10}
                    decay={2}
                  />
                  {/* Subtle spotlight aimed at avatar center */}
                  <spotLight
                    position={[0.6, 1.8, 2.6]}
                    color={0xffe8c0}
                    intensity={20}
                    distance={13}
                    angle={0.7}
                    penumbra={0.55}
                    decay={2}
                    castShadow
                  >
                    {/* Attach target as a child to avoid null refs */}
                    <object3D attach="target" position={[0, -1.1, 0]} />
                  </spotLight>
                </>
              ) : (
                <pointLight
                  position={[0, 0.8, 2.2]}
                  color={0xaac6ff}
                  intensity={0.6}
                  distance={10}
                  decay={2}
                />
              )}
            </>
          )}
          {/* Clouds on cloudy days */}
          {scene === 'city' ? (
            // Push clouds farther back so they don't overlap buildings
            <group position={[0, 2.5, -4]} scale={1.2}>
              <SpriteClouds visible={mappedLightingPreset === 'cloudy'} />
            </group>
          ) : (
            <SpriteClouds visible={mappedLightingPreset === 'cloudy'} />
          )}
          {scene === 'city' && (
            <SceneCityStreet
              lampIntensity={mappedLightingPreset === 'night' ? 25.0 : 2.4}
              lampDistance={mappedLightingPreset === 'night' ? 12 : 7}
              lampColor={
                mappedLightingPreset === 'night' ? '#ffd8a0' : '#ffd9a8'
              }
            />
          )}
          {scene === 'zenpark' && <SceneZenPark />}
          {scene === 'home' && (
            <SceneHome
              rainy={mappedLightingPreset === 'rainy'}
              rainIntensity={rainIntensity}
              rainDirection={rainDirection}
            />
          )}

          {/* Environment objects and textures (data-driven) */}
          <SceneEnvironment config={environmentConfig} />

          {/* 3D Content */}
          <SmogController
            enabled={effectiveHazeEnabled}
            intensity={effectiveSmogIntensity}
            windStrength={1.0}
            density={effectiveSmogDensity}
            enableTurbulence={true}
            enableWind={true}
            windDirection={[1, 0.2, 0]}
            minBounds={[-10, -3, -10]}
            maxBounds={[10, 8, 10]}
            size={[200, 200, 200]}
            opacity={effectiveSmogOpacity}
            color={new THREE.Color(0x888888)}
          />

          {/* HRV-driven stress effects */}
          {stressVisualsEnabled && stressEffects.stressLevel !== 'none' && (
            <>
              <StressAura
                intensity={stressEffects.intensity}
                stressLevel={stressEffects.stressLevel}
                enabled={stressEffects.stressLevel !== 'mild'}
              />
              <FloatingStressIcon
                stressLevel={stressEffects.stressLevel}
                stressIntensity={stressEffects.intensity}
                enabled={stressEffects.shouldShowIcon}
                onPress={() => {
                  setShowStressInfoModal(true);
                }}
                // Nudge forward in Z while sleeping to avoid occlusion from interior geometry
                position={[0, 2.5, sleepMode && !isManualAnimation ? 1.2 : 0]}
              />
            </>
          )}

          {/* Mattress for sleeping state */}
          {sleepMode && !isManualAnimation && (
            // Align with AvatarModel's sleeping offset (z +1.0) and groundY (~-1.7)
            <Mattress
              position={[0, -1.6, 1.0]}
              size={[1.5, 0.22, 4.5]}
              rotation={[0, -(1 / 2) * Math.PI, 0]}
            />
          )}

          <group position={[0, -1.6, 0.0]} scale={1.8}>
            <AvatarModel
              url={avatarUrl}
              activeAnimation={activeAnimation}
              facialExpression={
                isManualFacialExpression && manualFacialExpression
                  ? manualFacialExpression
                  : sleepMode && !isManualAnimation
                    ? 'sleep'
                    : finalFacialExpression
              }
              skinToneAdjustment={skinToneAdjustment}
              animationSpeedScale={energyInfo?.speedScale ?? 1}
              onLoadingChange={handleAvatarLoadingChange}
              onLoadingProgress={handleLoadingProgress}
              idleAnimations={idleAnimations}
              isActive={isActive}
            />
            {hasNearbyDengueRisk && !sleepMode && (
              <MosquitoSwarm
                anchor={[0, 1.15, 0.35]}
                radius={0.55}
                orbitSpeed={1.4}
                height={0.05}
              />
            )}
          </group>

          <OrbitControls
            enablePan={false}
            enableZoom={true}
            enableRotate={false}
            enabled={false}
          />
        </Canvas>
      </View>

      {/* UI Overlays */}
      {sleepMode && !isManualAnimation && (
        <View
          style={{
            position: 'absolute',
            top: 10,
            left: 10,
            backgroundColor: 'rgba(0,0,0,0.5)',
            paddingHorizontal: 8,
            paddingVertical: 4,
            borderRadius: 12,
            flexDirection: 'row',
            alignItems: 'center',
          }}
        >
          {/* Simple text badge; could be replaced with 3D indicator later */}
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View
              style={{
                width: 6,
                height: 6,
                borderRadius: 3,
                backgroundColor: '#8ab4f8',
                marginRight: 6,
              }}
            />
            <View>
              <View>{/* Placeholder for potential icon */}</View>
            </View>
            <Text style={{ color: 'white', fontSize: 12, fontWeight: '600' }}>
              Sleeping
            </Text>
          </View>
        </View>
      )}
      {developerControlsEnabled && (
        <AnimationControls
          availableAnimations={AVAILABLE_ANIMATIONS}
          activeAnimation={activeAnimation}
          onAnimationToggle={handleAnimationToggle}
          visible={showAnimationButton}
        />
      )}

      {developerControlsEnabled && (
        <>
          <TimeOfDayControls visible />
          <WeatherControls
            value={overrideWeather}
            onChange={setOverrideWeather}
            visible={true}
          />
        </>
      )}

      {developerControlsEnabled && scene === 'home' && (
        <HomeSceneControls visible />
      )}

      {/* Loading Indicator Overlay */}
      <AvatarLoadingIndicator
        isLoading={isAvatarLoading}
        progress={loadingProgress}
      />

      {/* HRV stress status indicator */}
      {stressVisualsEnabled && stressEffects.stressLevel !== 'none' && (
        <View style={styles.stressStatus}>
          <View
            style={[
              styles.statusIndicator,
              {
                backgroundColor: getStressIndicatorColor(
                  stressEffects.stressLevel
                ),
              },
            ]}
          />
          <Text style={styles.statusLabel}>HRV Stress</Text>
        </View>
      )}

      <StressInfoModal
        visible={showStressInfoModal}
        onClose={() => setShowStressInfoModal(false)}
        stressLevel={stressResult.stressLevel}
        hrvMs={stressResult.hrvMs}
        baselineHrvMs={stressResult.baselineHrvMs}
        restingHeartRateBpm={stressResult.restingHeartRateBpm}
        baselineRestingHeartRateBpm={stressResult.baselineRestingHeartRateBpm}
        reasons={stressResult.reasons}
      />

      <ViewAchievementButton style={styles.achievementButton} />

      <TypingChatBubble
        text="Great job achieving your nutrition goals! 👍"
        isVisible={showNutritionBubble}
        style={styles.nutritionBubble}
      />

      {/* Hydration indicator overlay */}
      <View style={styles.hydrationIndicator}>
        <HydrationIndicator />
      </View>

      {/* Sleep battery indicator overlay */}
      <View style={styles.batteryIndicator}>
        <BatteryIndicator sleepMinutes={health?.sleepMinutes} />
      </View>
    </View>
  );
}

const getStressIndicatorColor = (stressLevel: string): string => {
  switch (stressLevel) {
    case 'mild':
      return colors.yellow[400];
    case 'moderate':
      return colors.orange[500];
    case 'high':
      return colors.red[500];
    default:
      return colors.green[500];
  }
};

const styles = StyleSheet.create({
  container: {
    // Full-bleed container for canvas
    position: 'relative',
  },
  stressStatus: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 1000,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  achievementButton: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    zIndex: 1000,
  },
  hydrationIndicator: {
    position: 'absolute',
    bottom: 36,
    right: 8,
    zIndex: 1000,
  },
  batteryIndicator: {
    position: 'absolute',
    bottom: 8,
    right: 12,
    zIndex: 1000,
  },
  nutritionBubble: {
    position: 'absolute',
    bottom: 12,
    left: 80,
    right: 80,
    zIndex: 950,
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: 'white',
    marginRight: 6,
  },
  statusLabel: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
});

export default AvatarExperience;
