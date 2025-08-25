import React, { useState, useEffect, useRef } from "react";
import { View, StyleSheet } from "react-native";
import { Canvas } from "@react-three/fiber/native";
import { OrbitControls } from "@react-three/drei/native";
import * as THREE from "three";

import { AvatarModel } from "./avatar/AvatarModel";
import { SmogController } from "./effects/SmogController";
import { AnimationControls } from "./controls/AnimationControls";
import { EffectControls } from "./controls/EffectControls";
import { DebugOverlay } from "./ui/DebugOverlay";
import { LoadingState, ErrorState } from "./ui/StateComponents";
import { localStorageService } from "../services/LocalStorageService";
import { 
  suppressEXGLWarnings, 
  configureMobileCompatibility,
  configureTextureLoader 
} from "../utils/ThreeUtils";

// Initialize Three.js configuration
suppressEXGLWarnings();
configureMobileCompatibility();
configureTextureLoader();

interface ThreeAvatarProps {
  showAnimationButton?: boolean;
  width?: number;
  height?: number;
}

const AVAILABLE_ANIMATIONS = [
  { name: "M_Standing_Expressions_007", label: "Expressions" },
  { name: "mixamo.com", label: "Cough" },
];

function ThreeAvatar({
  showAnimationButton = false,
  width = 300,
  height = 500,
}: ThreeAvatarProps) {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeAnimation, setActiveAnimation] = useState<string | null>(null);
  const [hazeEnabled, setHazeEnabled] = useState<boolean>(false);
  const canvasRef = useRef<any>(null);

  useEffect(() => {
    const loadAvatar = async () => {
      try {
        console.log("Attempting to load avatar URL...");
        let url = await localStorageService.getAvatarUrl();
        if (!url) {
          console.log("No saved URL, using fallback.");
          url = "https://models.readyplayer.me/64bfa15f0e72c63d7c3934a6.glb";
        } else {
          console.log(`Found saved URL: ${url}`);
        }

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
    console.log(`Smog effect ${!hazeEnabled ? 'enabled' : 'disabled'}`);
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
          fov: 60 
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
        <SmogController enabled={hazeEnabled} />
        <group position={[0, -1.5, 0]} scale={1.8}>
          <AvatarModel url={avatarUrl} activeAnimation={activeAnimation} />
        </group>

        <OrbitControls
          enablePan={false}
          enableZoom={false}
          enableRotate={false}
          enabled={false}
        />
      </Canvas>

      {/* UI Overlays */}
      <DebugOverlay />
      <EffectControls 
        hazeEnabled={hazeEnabled} 
        onHazeToggle={handleHazeToggle} 
      />
      <AnimationControls
        availableAnimations={AVAILABLE_ANIMATIONS}
        activeAnimation={activeAnimation}
        onAnimationToggle={handleAnimationToggle}
        visible={showAnimationButton}
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