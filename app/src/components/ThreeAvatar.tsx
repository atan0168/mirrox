import React, { useState, useEffect, useRef } from "react";
import { View, StyleSheet } from "react-native";
import { Canvas } from "@react-three/fiber/native";
import { OrbitControls } from "@react-three/drei/native";
import * as THREE from "three";

import { AvatarModel } from "./avatar/AvatarModel";
import { SmogController } from "./effects/SmogController";
import { AnimationControls } from "./controls/AnimationControls";
import { EffectControls } from "./controls/EffectControls";
import { SkinToneControls } from "./controls/SkinToneControls";
import { LoadingState, ErrorState } from "./ui/StateComponents";
import AvatarLoadingIndicator from "./ui/AvatarLoadingIndicator";
import { localStorageService } from "../services/LocalStorageService";
import {
  suppressEXGLWarnings,
  configureMobileCompatibility,
  configureTextureLoader,
} from "../utils/ThreeUtils";

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
}

const AVAILABLE_ANIMATIONS = [
  { name: "M_Standing_Idle_Variations_006", label: "Idle 1" },
  { name: "M_Standing_Idle_Variations_003", label: "Idle 2" },
  { name: "M_Standing_Expressions_007", label: "Cough" },
  { name: "Armature|wiping_sweat", label: "Wiping Seat" },
  { name: "mixamo.com", label: "Bad Cough" },
];

function ThreeAvatar({
  showAnimationButton = false,
  showSkinToneControls = false,
  width = 300,
  height = 500,
  facialExpression: externalFacialExpression = "neutral",
  skinToneAdjustment = 0,
  onSkinToneChange,
}: ThreeAvatarProps) {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeAnimation, setActiveAnimation] = useState<string | null>(null);
  const [hazeEnabled, setHazeEnabled] = useState<boolean>(false);
  const [smogIntensity, setSmogIntensity] = useState<number>(1.0);
  const [isAvatarLoading, setIsAvatarLoading] = useState<boolean>(false);
  const [loadingProgress, setLoadingProgress] = useState<{
    loaded: number;
    total: number;
    item: string;
  }>({ loaded: 0, total: 0, item: "" });
  const canvasRef = useRef<any>(null);

  // Use external facial expression prop, fallback to "neutral"
  const facialExpression = externalFacialExpression;

  useEffect(() => {
    const loadAvatar = async () => {
      try {
        console.log("Attempting to load avatar with caching...");

        // Try to get cached avatar first, then fallback to remote
        let url = await localStorageService.getAvatarWithCaching();

        if (!url) {
          console.log("No saved URL, using fallback.");
          const fallbackUrl =
            "https://models.readyplayer.me/64bfa15f0e72c63d7c3934a6.glb";
          // Try to cache the fallback URL too
          url = await localStorageService.getAvatarWithCaching(fallbackUrl);
          if (!url) {
            url = fallbackUrl; // Final fallback to remote URL
          }
        }

        console.log(`Loading avatar from: ${url}`);
        setAvatarUrl(url);
      } catch (err) {
        console.error("Error loading avatar:", err);
        setError("Failed to load avatar");
      }
    };

    loadAvatar();
  }, []);

  const handleAnimationToggle = (animationName: string) => {
    if (activeAnimation === animationName) {
      console.log(`Stopping animation: ${animationName}`);
      setActiveAnimation(null);
    } else {
      console.log(`Starting animation: ${animationName}`);
      setActiveAnimation(animationName);
    }
  };

  const handleHazeToggle = () => {
    setHazeEnabled(!hazeEnabled);
    console.log(`Smog effect ${!hazeEnabled ? "enabled" : "disabled"}`);
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
          powerPreference: "high-performance",
          preserveDrawingBuffer: true,
        }}
        camera={{
          position: [0, 0.5, 5],
          fov: 60,
        }}
        onCreated={({ gl }) => {
          console.log("Canvas created. Configuring renderer...");
          gl.setClearColor("#f0f0f0");
          gl.outputColorSpace = THREE.SRGBColorSpace;
          gl.toneMapping = THREE.NoToneMapping;
          gl.shadowMap.enabled = true;
          gl.shadowMap.type = THREE.PCFSoftShadowMap;
          console.log("Renderer configured.");
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
          enabled={hazeEnabled}
          intensity={smogIntensity}
          windStrength={1.0}
          density={60}
          enableTurbulence={true}
          turbulenceStrength={[0.005, 0.005, 0.005]}
          enableWind={true}
          windDirection={[1, 0.2, 0]}
          maxVelocity={[2, 2, 1]}
          minBounds={[-10, -3, -10]}
          maxBounds={[10, 8, 10]}
          size={[200, 200, 200]}
          opacity={0.3}
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
    backgroundColor: "#f0f0f0",
    borderRadius: 12,
    overflow: "hidden",
  },
});

export default ThreeAvatar;
