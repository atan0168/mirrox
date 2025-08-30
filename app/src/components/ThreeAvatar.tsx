import { useState, useEffect, useRef, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Canvas } from '@react-three/fiber/native';
import { OrbitControls } from '@react-three/drei/native';
import * as THREE from 'three';

import { AvatarModel } from './avatar/AvatarModel';
import { SmogController } from './effects/SmogController';
import { AnimationControls } from './controls/AnimationControls';
import { EffectControls } from './controls/EffectControls';
import { SkinToneControls } from './controls/SkinToneControls';
import { LoadingState, ErrorState } from './ui/StateComponents';
import AvatarLoadingIndicator from './ui/AvatarLoadingIndicator';
import { localStorageService } from '../services/LocalStorageService';
import { assetPreloader } from '../services/AssetPreloader';
import {
  suppressEXGLWarnings,
  configureMobileCompatibility,
  configureTextureLoader,
} from '../utils/ThreeUtils';
import { calculateSmogEffects } from '../utils/skinEffectsUtils';
import { AVAILABLE_ANIMATIONS } from '../constants';
import {
  getAnimationForAQI,
  getAnimationCycleForAQI,
  shouldOverrideAnimation,
} from '../utils/animationUtils';

// Initialize Three.js configuration
suppressEXGLWarnings();
configureMobileCompatibility();
configureTextureLoader();

interface ThreeAvatarProps {
  showAnimationButton?: boolean;
  showSkinToneControls?: boolean;
  width?: number;
  height?: number;
  facialExpression?: string;
  skinToneAdjustment?: number; // -1 to 1, where negative darkens and positive lightens
  onSkinToneChange?: (value: number) => void;
  // Air quality props for automatic smog effects
  airQualityData?: {
    aqi?: number | null;
    pm25?: number | null;
    pm10?: number | null;
  } | null;
}

function ThreeAvatar({
  showAnimationButton = false,
  showSkinToneControls = false,
  width = 300,
  height = 500,
  facialExpression: externalFacialExpression = 'neutral',
  skinToneAdjustment = 0,
  onSkinToneChange,
  airQualityData = null,
}: ThreeAvatarProps) {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeAnimation, setActiveAnimation] = useState<string | null>(null);
  const [isManualAnimation, setIsManualAnimation] = useState<boolean>(false);
  const [hazeEnabled, setHazeEnabled] = useState<boolean>(false);
  const [smogIntensity, setSmogIntensity] = useState<number>(1.0);
  const [isAvatarLoading, setIsAvatarLoading] = useState<boolean>(false);
  const [loadingProgress, setLoadingProgress] = useState<{
    loaded: number;
    total: number;
    item: string;
  }>({ loaded: 0, total: 0, item: '' });
  const canvasRef = useRef<any>(null);
  const animationCycleRef = useRef<NodeJS.Timeout | null>(null);

  // Use external facial expression prop, fallback to "neutral"
  const facialExpression = externalFacialExpression;

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
  const effectiveHazeEnabled = autoSmogEffects.enabled || hazeEnabled;
  const effectiveSmogIntensity = autoSmogEffects.enabled
    ? autoSmogEffects.intensity
    : smogIntensity;
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

  // Automatic animation control based on AQI
  useEffect(() => {
    const aqi = airQualityData?.aqi;

    // Clear any existing animation cycle timer
    if (animationCycleRef.current) {
      clearInterval(animationCycleRef.current);
      animationCycleRef.current = null;
    }

    // Only apply automatic animations if not manually set
    if (!isManualAnimation && aqiAnimationRecommendation) {
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

        // For unhealthy air quality, set up animation cycling between cough and breathing
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
            }, 8000); // Change animation every 8 seconds for unhealthy air quality
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
  ]);

  useEffect(() => {
    const loadAvatar = async () => {
      try {
        console.log('Loading avatar from preloaded assets...');

        // First try to get from preloaded assets
        let url = assetPreloader.getPreloadedAvatarUrl();

        if (!url) {
          console.log('No preloaded avatar found, falling back to cache...');
          // Fallback to cache if preloading failed
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
    // Clear any automatic animation cycling when user manually controls animations
    if (animationCycleRef.current) {
      clearInterval(animationCycleRef.current);
      animationCycleRef.current = null;
    }

    if (activeAnimation === animationName) {
      console.log(`Stopping animation: ${animationName}`);
      setActiveAnimation(null);
      setIsManualAnimation(false); // Allow automatic control again when stopping
    } else {
      console.log(`Starting animation: ${animationName}`);
      setActiveAnimation(animationName);
      setIsManualAnimation(true); // Mark as manually controlled
    }
  };

  const handleHazeToggle = () => {
    setHazeEnabled(!hazeEnabled);
    console.log(`Smog effect ${!hazeEnabled ? 'enabled' : 'disabled'}`);
  };

  const handleIntensityChange = (intensity: number) => {
    setSmogIntensity(intensity);
    console.log(`Smog intensity changed to: ${intensity}`);
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

      {/* UI Overlays - positioned on top of canvas */}
      <EffectControls
        hazeEnabled={hazeEnabled}
        onHazeToggle={handleHazeToggle}
        intensity={smogIntensity}
        onIntensityChange={handleIntensityChange}
      />
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

      {/* Loading Indicator Overlay */}
      <AvatarLoadingIndicator
        isLoading={isAvatarLoading}
        progress={loadingProgress}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f0f0f0',
    borderRadius: 12,
    overflow: 'hidden',
  },
});

export default ThreeAvatar;
