import React, { useMemo } from 'react';
import { View, StyleSheet, Dimensions, Text, Platform } from 'react-native';
import { Canvas } from '@react-three/fiber/native';
import { OrbitControls } from '@react-three/drei/native';
import * as THREE from 'three';

import { AvatarModel } from './AvatarModel';
import { SmogController } from '../effects/SmogController';
import { StressAura } from '../effects/StressAura';
import { FloatingStressIcon } from '../effects/FloatingStressIcon';
import { AnimationControls } from '../controls/AnimationControls';
import { LoadingState, ErrorState } from '../ui/StateComponents';
import AvatarLoadingIndicator from '../ui/AvatarLoadingIndicator';
import { useTrafficData } from '../../hooks/useTrafficData';
import { useStressVisualsPreference } from '../../hooks/useStressVisualsPreference';
import { useDeveloperControlsPreference } from '../../hooks/useDeveloperControlsPreference';
import { localStorageService } from '../../services/LocalStorageService';
import { assetPreloader } from '../../services/AssetPreloader';
import {
  suppressEXGLWarnings,
  configureMobileCompatibility,
  configureTextureLoader,
} from '../../utils/ThreeUtils';
import { calculateSmogEffects } from '../../utils/skinEffectsUtils';
import { AVAILABLE_ANIMATIONS } from '../../constants';
import {
  getAnimationForAQI,
  getAnimationCycleForAQI,
  shouldOverrideAnimation,
} from '../../utils/animationUtils';
import { useState, useEffect, useRef } from 'react';
import { StressInfoModal } from '../ui/StressInfoModal';
import { useHealthData } from '../../hooks/useHealthData';
import { computeEnergy } from '../../utils/healthUtils';
import HealthBubble from '../effects/HealthBubble';
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
  // Location for traffic data
  latitude?: number;
  longitude?: number;
  // Air quality props for automatic smog effects
  airQualityData?: {
    aqi?: number | null;
    pm25?: number | null;
    pm10?: number | null;
  } | null;
  // Traffic stress configuration
  enableTrafficStress?: boolean;
  trafficRefreshInterval?: number;
  // Optional environment context
  weather?: 'sunny' | 'cloudy' | 'rainy' | null;
  // Notify parent when user is interacting (e.g., to disable ScrollView)
  // onInteractionChange removed (unused)
  // Scene selection
  scene?: 'zenpark' | 'city' | 'home';
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
  latitude,
  longitude,
  airQualityData = null,
  enableTrafficStress = true,
  trafficRefreshInterval = 300000, // 5 minutes
  weather = null,
  // onInteractionChange removed,
  scene = 'zenpark',
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

  const setActiveAnimation = useAvatarStore(s => s.setActiveAnimation);
  const setSleepMode = useAvatarStore(s => s.setSleepMode);
  const setOverrideWeather = useAvatarStore(s => s.setOverrideWeather);
  const setIsAvatarLoading = useAvatarStore(s => s.setAvatarLoading);
  const setLoadingProgress = useAvatarStore(s => s.setLoadingProgress);
  const setShowStressInfoModal = useAvatarStore(s => s.setShowStressInfoModal);

  const canvasRef = useRef<View | null>(null);
  const animationCycleRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch traffic data
  const { data: trafficData, loading: trafficLoading } = useTrafficData({
    latitude,
    longitude,
    enabled: enableTrafficStress && !!latitude && !!longitude,
    refreshInterval: trafficRefreshInterval,
  });

  // Get stress visuals preference
  const { stressVisualsEnabled } = useStressVisualsPreference();

  // Get developer controls preference
  const { developerControlsEnabled } = useDeveloperControlsPreference();

  // Health data
  const { data: health } = useHealthData({ autoSync: false });
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

  // Calculate stress effects from traffic data
  const stressEffects = useMemo(() => {
    if (!trafficData || !enableTrafficStress || !stressVisualsEnabled) {
      return {
        stressLevel: 'none' as const,
        intensity: 0,
        shouldShowIcon: false,
        facialExpression: externalFacialExpression,
      };
    }

    const { stressLevel, congestionFactor } = trafficData;

    // Calculate intensity based on congestion factor
    let intensity = 0;
    switch (stressLevel) {
      case 'mild':
        intensity = 0.3;
        break;
      case 'moderate':
        intensity = 0.6;
        break;
      case 'high':
        intensity = 1.0;
        break;
      default:
        intensity = 0;
    }

    // Determine facial expression based on stress level
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
      shouldShowIcon: stressLevel !== 'none',
      facialExpression,
      congestionFactor,
    };
  }, [trafficData, enableTrafficStress, externalFacialExpression]);

  // Use stress-modified facial expression
  const facialExpression = stressEffects.facialExpression;
  // If no traffic stress override, tweak facial expression based on sleep
  const healthDrivenFacial = useMemo(() => {
    if (!health) return facialExpression;
    if (stressEffects.stressLevel !== 'none') return facialExpression;
    const sleepH = (health.sleepMinutes || 0) / 60;
    // Only mark tired if we have sleep data and it's under 6h
    if (sleepH > 0 && sleepH < 6) return 'tired';
    if (sleepH > 8.5) return 'calm';
    return facialExpression;
  }, [health, facialExpression, stressEffects.stressLevel]);

  // Determine if user is sleep-deprived (less than 6h but greater than 0)
  const isSleepDeprived = useMemo(() => {
    if (!health) return false;
    const sleepH = (health.sleepMinutes || 0) / 60;
    return sleepH > 0 && sleepH < 6;
  }, [health]);

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
      setHomeTime(derivedPhase as any);
    }
  }, [scene, derivedPhase, setHomeTime]);

  // Automatic animation control based on AQI and traffic stress (suppressed during sleepMode unless user overrides)
  // During sleep mode: if not manually overridden, enforce 'sleeping'. If user manually selects something else, allow it until that animation naturally stops or is toggled off.
  useEffect(() => {
    if (sleepMode && !isManualAnimation) {
      if (activeAnimation !== 'sleeping') {
        setActiveAnimation('sleeping');
      }
      return; // prevent AQI/stress competition
    }
    if (!sleepMode && activeAnimation === 'sleeping' && !isManualAnimation) {
      setActiveAnimation(null);
    }
  }, [sleepMode, isManualAnimation, activeAnimation]);

  useEffect(() => {
    const aqi = airQualityData?.aqi;

    // If auto-sleeping, suppress AQI/stress logic entirely
    if (sleepMode && !isManualAnimation) {
      if (animationCycleRef.current) {
        clearInterval(animationCycleRef.current);
        animationCycleRef.current = null;
      }
      return; // do not proceed further
    }

    // Clear any existing animation cycle timer
    if (animationCycleRef.current) {
      clearInterval(animationCycleRef.current);
      animationCycleRef.current = null;
    }

    // Only apply automatic animations if not manually set
    if (!isManualAnimation) {
      // Traffic stress animations take priority over AQI animations, but only if stress visuals are enabled
      if (stressEffects.stressLevel === 'high' && stressVisualsEnabled) {
        console.log(
          '🚨 High traffic stress detected - triggering stress animation'
        );
        setActiveAnimation('M_Standing_Expressions_007'); // Cough animation for high stress
      } else if (aqiAnimationRecommendation) {
        if (
          shouldOverrideAnimation(
            activeAnimation,
            aqiAnimationRecommendation,
            isManualAnimation
          )
        ) {
          console.log(
            `🌬️ AQI-based animation: ${aqiAnimationRecommendation.reason}`
          );
          setActiveAnimation(aqiAnimationRecommendation.animation);

          // For moderate air quality (breathing) + sleep deprivation, cycle with yawn
          if (
            aqi &&
            aqi > 50 &&
            aqi <= 100 &&
            isSleepDeprived &&
            aqiAnimationRecommendation.animation === 'breathing'
          ) {
            const cycleAnimations = ['breathing', 'yawn'];
            let currentIndex = 0;
            animationCycleRef.current = setInterval(() => {
              currentIndex = (currentIndex + 1) % cycleAnimations.length;
              const nextAnimation = cycleAnimations[currentIndex];
              console.log(
                `🔄 Cycling to animation: ${nextAnimation} (moderate AQI + sleep deprivation)`
              );
              setActiveAnimation(nextAnimation);
            }, 10000);
          }

          // For unhealthy air quality, set up animation cycling
          if (aqi && aqi >= 101) {
            let cycleAnimations = getAnimationCycleForAQI(aqi);

            // If stress visuals are disabled, filter out breathing animations from cycling
            if (!stressVisualsEnabled) {
              cycleAnimations = cycleAnimations.filter(
                animation => animation !== 'breathing'
              );
              console.log(
                '🚫 Stress visuals disabled - filtered out breathing from animation cycle'
              );
            }

            // Add yawn to cycle if sleep deprived
            if (isSleepDeprived && !cycleAnimations.includes('yawn')) {
              cycleAnimations.push('yawn');
            }

            if (cycleAnimations.length > 1) {
              let currentIndex = 0;
              animationCycleRef.current = setInterval(() => {
                currentIndex = (currentIndex + 1) % cycleAnimations.length;
                const nextAnimation = cycleAnimations[currentIndex];
                console.log(
                  `🔄 Cycling to animation: ${nextAnimation} (unhealthy AQI: ${aqi}${isSleepDeprived ? ' + sleep deprivation' : ''})`
                );
                setActiveAnimation(nextAnimation);
              }, 8000);
            } else if (cycleAnimations.length === 1) {
              // If only one animation left after filtering, just use it without cycling
              console.log(
                `🔄 Single animation remaining: ${cycleAnimations[0]} (unhealthy AQI: ${aqi})`
              );
            } else {
              // If no animations left after filtering, use idle animations
              console.log(
                '🔄 No animations remaining after filtering - using idle animations'
              );
              setActiveAnimation(null);
            }
          }
        }
      }
    }

    // Cleanup function
    return () => {
      if (animationCycleRef.current) {
        clearInterval(animationCycleRef.current);
        animationCycleRef.current = null;
      }
    };
  }, [
    airQualityData?.aqi,
    isManualAnimation,
    aqiAnimationRecommendation,
    activeAnimation,
    stressEffects.stressLevel,
    stressVisualsEnabled,
    isSleepDeprived,
    sleepMode,
  ]);

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

  // Handle stress visuals toggle - stop breathing animations immediately
  useEffect(() => {
    if (
      !stressVisualsEnabled &&
      activeAnimation === 'breathing' &&
      !isManualAnimation
    ) {
      console.log('🚫 Stress visuals disabled - stopping breathing animation');
      setActiveAnimation(null); // Switch to idle animations

      // Clear any animation cycling that might include breathing
      if (animationCycleRef.current) {
        clearInterval(animationCycleRef.current);
        animationCycleRef.current = null;
      }
    }
  }, [stressVisualsEnabled, activeAnimation, isManualAnimation]);

  // Cleanup animation cycle timer on unmount
  useEffect(() => {
    return () => {
      if (animationCycleRef.current) {
        clearInterval(animationCycleRef.current);
        animationCycleRef.current = null;
      }
    };
  }, []);

  const handleAnimationToggle = (animationName: string) => {
    if (animationCycleRef.current) {
      clearInterval(animationCycleRef.current);
      animationCycleRef.current = null;
    }

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
            preserveDrawingBuffer: true,
          }}
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
            turbulenceStrength={[0.005, 0.005, 0.005]}
            enableWind={true}
            windDirection={[1, 0.2, 0]}
            maxVelocity={[2, 2, 1]}
            minBounds={[-10, -3, -10]}
            maxBounds={[10, 8, 10]}
            size={[200, 200, 200]}
            opacity={effectiveSmogOpacity}
            color={new THREE.Color(0x888888)}
          />

          {/* Traffic Stress Effects - only show if stress visuals are enabled */}
          {enableTrafficStress && trafficData && stressVisualsEnabled && (
            <>
              <StressAura
                intensity={stressEffects.intensity}
                stressLevel={stressEffects.stressLevel}
                congestionFactor={stressEffects.congestionFactor || 1.0}
                enabled={stressEffects.stressLevel !== 'none'}
              />
              <FloatingStressIcon
                stressLevel={stressEffects.stressLevel}
                congestionFactor={stressEffects.congestionFactor || 1.0}
                enabled={stressEffects.shouldShowIcon}
                onPress={() => {
                  setShowStressInfoModal(true);
                }}
                position={[0, 2.5, 0]}
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
                sleepMode && !isManualAnimation ? 'sleep' : healthDrivenFacial
              }
              skinToneAdjustment={skinToneAdjustment}
              animationSpeedScale={energyInfo?.speedScale ?? 1}
              onLoadingChange={handleAvatarLoadingChange}
              onLoadingProgress={handleLoadingProgress}
              additionalIdleAnimations={isSleepDeprived ? ['yawn'] : []}
            />
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
        isLoading={isAvatarLoading || trafficLoading}
        progress={loadingProgress}
      />

      {/* Traffic Status Indicator - only show if stress visuals are enabled */}
      {enableTrafficStress &&
        trafficData &&
        stressVisualsEnabled &&
        stressEffects.stressLevel !== 'none' && (
          <View style={styles.trafficStatus}>
            <View
              style={[
                styles.statusIndicator,
                { backgroundColor: getStatusColor(stressEffects.stressLevel) },
              ]}
            />
          </View>
        )}

      <StressInfoModal
        visible={showStressInfoModal}
        onClose={() => setShowStressInfoModal(false)}
        stressLevel="moderate"
        congestionFactor={2.0}
        // stressLevel={stressEffects.stressLevel}
        // congestionFactor={stressEffects.congestionFactor || 1.0}
      />

      {/* Health bubble with dynamic text */}
      <HealthBubble message={energyInfo?.message ?? null} />
    </View>
  );
}

const getStatusColor = (stressLevel: string): string => {
  switch (stressLevel) {
    case 'mild':
      return '#FFC107';
    case 'moderate':
      return '#FF9800';
    case 'high':
      return '#F44336';
    default:
      return '#4CAF50';
  }
};

const styles = StyleSheet.create({
  container: {
    // Full-bleed container for canvas
    position: 'relative',
  },
  trafficStatus: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 1000,
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: 'white',
  },
});

export default AvatarExperience;
