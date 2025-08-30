import { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Canvas } from '@react-three/fiber/native';
import { OrbitControls } from '@react-three/drei/native';
import * as THREE from 'three';

import { AvatarModel } from './AvatarModel';
import { SmogController } from '../effects/SmogController';
import { StressAura } from '../effects/StressAura';
import { FloatingStressIcon } from '../effects/FloatingStressIcon';
import { AnimationControls } from '../controls/AnimationControls';
import { SkinToneControls } from '../controls/SkinToneControls';
import { LoadingState, ErrorState } from '../ui/StateComponents';
import AvatarLoadingIndicator from '../ui/AvatarLoadingIndicator';
import { useTrafficData } from '../../hooks/useTrafficData';
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

// Initialize Three.js configuration
suppressEXGLWarnings();
configureMobileCompatibility();
configureTextureLoader();

interface AvatarWithTrafficStressProps {
  showAnimationButton?: boolean;
  showSkinToneControls?: boolean;
  width?: number;
  height?: number;
  facialExpression?: string;
  skinToneAdjustment?: number;
  onSkinToneChange?: (value: number) => void;
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
}

function AvatarWithTrafficStress({
  showAnimationButton = false,
  showSkinToneControls = false,
  width = 300,
  height = 500,
  facialExpression: externalFacialExpression = 'neutral',
  skinToneAdjustment = 0,
  onSkinToneChange,
  latitude,
  longitude,
  airQualityData = null,
  enableTrafficStress = true,
  trafficRefreshInterval = 300000, // 5 minutes
}: AvatarWithTrafficStressProps) {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeAnimation, setActiveAnimation] = useState<string | null>(null);
  const [isManualAnimation, setIsManualAnimation] = useState<boolean>(false);
  const [isAvatarLoading, setIsAvatarLoading] = useState<boolean>(false);
  const [loadingProgress, setLoadingProgress] = useState<{
    loaded: number;
    total: number;
    item: string;
  }>({ loaded: 0, total: 0, item: '' });
  const [showStressInfoModal, setShowStressInfoModal] =
    useState<boolean>(false);
  const canvasRef = useRef<View | null>(null);
  const animationCycleRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch traffic data
  const { data: trafficData, loading: trafficLoading } = useTrafficData({
    latitude,
    longitude,
    enabled: enableTrafficStress && !!latitude && !!longitude,
    refreshInterval: trafficRefreshInterval,
  });

  // Calculate stress effects from traffic data
  const stressEffects = useMemo(() => {
    if (!trafficData || !enableTrafficStress) {
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
    return getAnimationForAQI(aqi);
  }, [airQualityData?.aqi]);

  // Automatic animation control based on AQI and traffic stress
  useEffect(() => {
    const aqi = airQualityData?.aqi;

    // Clear any existing animation cycle timer
    if (animationCycleRef.current) {
      clearInterval(animationCycleRef.current);
      animationCycleRef.current = null;
    }

    // Only apply automatic animations if not manually set
    if (!isManualAnimation) {
      // Traffic stress animations take priority over AQI animations
      if (stressEffects.stressLevel === 'high') {
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

          // For unhealthy air quality, set up animation cycling
          if (aqi && aqi >= 101) {
            const cycleAnimations = getAnimationCycleForAQI(aqi);
            if (cycleAnimations.length > 1) {
              let currentIndex = 0;
              animationCycleRef.current = setInterval(() => {
                currentIndex = (currentIndex + 1) % cycleAnimations.length;
                const nextAnimation = cycleAnimations[currentIndex];
                console.log(
                  `🔄 Cycling to animation: ${nextAnimation} (unhealthy AQI: ${aqi})`
                );
                setActiveAnimation(nextAnimation);
              }, 8000);
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
      setActiveAnimation(null);
      setIsManualAnimation(false);
    } else {
      console.log(`Starting animation: ${animationName}`);
      setActiveAnimation(animationName);
      setIsManualAnimation(true);
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
    return <LoadingState width={width} height={height} />;
  }

  if (error) {
    return <ErrorState error={error} width={width} height={height} />;
  }

  return (
    <View style={[styles.container, { width, height }]}>
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
        onCreated={({ gl }) => {
          console.log('Canvas created. Configuring renderer...');
          gl.setClearColor('#f0f0f0');
          gl.outputColorSpace = THREE.SRGBColorSpace;
          gl.toneMapping = THREE.NoToneMapping;
          gl.shadowMap.enabled = true;
          gl.shadowMap.type = THREE.PCFSoftShadowMap;
          console.log('Renderer configured.');
        }}
      >
        {/* Lighting setup */}
        <ambientLight intensity={1.5} />
        <directionalLight
          position={[5, 5, 5]}
          intensity={2}
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
        />
        <pointLight position={[-5, 5, 5]} intensity={1} />

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

        {/* Traffic Stress Effects */}
        {enableTrafficStress && trafficData && (
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

        <group position={[0, -1.6, 1.0]} scale={1.8}>
          <AvatarModel
            url={avatarUrl}
            activeAnimation={activeAnimation}
            facialExpression={facialExpression}
            skinToneAdjustment={skinToneAdjustment}
            onLoadingChange={handleAvatarLoadingChange}
            onLoadingProgress={handleLoadingProgress}
          />
        </group>

        <OrbitControls
          enablePan={false}
          enableZoom={false}
          enableRotate={false}
          enabled={false}
        />
      </Canvas>

      {/* UI Overlays */}
      {__DEV__ && (
        <>
          <SkinToneControls
            skinToneAdjustment={skinToneAdjustment}
            onSkinToneChange={onSkinToneChange || (() => {})}
            visible={showSkinToneControls}
          />
          <AnimationControls
            availableAnimations={AVAILABLE_ANIMATIONS}
            activeAnimation={activeAnimation}
            onAnimationToggle={handleAnimationToggle}
            visible={showAnimationButton}
          />
        </>
      )}

      {/* Loading Indicator Overlay */}
      <AvatarLoadingIndicator
        isLoading={isAvatarLoading || trafficLoading}
        progress={loadingProgress}
      />

      {/* Traffic Status Indicator */}
      {enableTrafficStress &&
        trafficData &&
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
    backgroundColor: '#f0f0f0',
    borderRadius: 12,
    overflow: 'hidden',
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

export default AvatarWithTrafficStress;
