import React, { useRef, useEffect, useState, Suspense } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { Canvas } from "@react-three/fiber/native";
import { useGLTF, useAnimations, useFBX } from "@react-three/drei/native";
import * as THREE from "three";
import { localStorageService } from "../services/LocalStorageService";

// Suppress EXGL warnings for unsupported WebGL features
if (__DEV__) {
  const originalInfo = console.info;
  console.info = (...args) => {
    if (
      args[0] &&
      typeof args[0] === "string" &&
      args[0].includes("EXGL: gl.pixelStorei()")
    ) {
      return; // Suppress EXGL pixelStorei warnings
    }
    originalInfo.apply(console, args);
  };
}

// Configure Three.js for better mobile compatibility
THREE.ColorManagement.enabled = false;

// Preload and configure texture loader for React Native
const textureLoader = new THREE.TextureLoader();
textureLoader.crossOrigin = "anonymous";

// Override Three.js texture loading to prevent EXGL issues
const originalLoad = textureLoader.load.bind(textureLoader);
textureLoader.load = function (url, onLoad, onProgress, onError) {
  return originalLoad(
    url,
    (texture) => {
      // Configure texture to avoid EXGL warnings
      texture.generateMipmaps = false;
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;
      texture.wrapS = THREE.ClampToEdgeWrapping;
      texture.wrapT = THREE.ClampToEdgeWrapping;
      texture.flipY = false;
      if (onLoad) onLoad(texture);
    },
    onProgress,
    onError,
  );
};

interface ThreeAvatarProps {
  showAnimationButton?: boolean;
}

function AvatarModel({
  animation,
  avatarUrl,
  onLoad,
  onError,
}: {
  animation: string;
  avatarUrl: string;
  onLoad: () => void;
  onError: (error: string) => void;
}) {
  const group = useRef<THREE.Group>(null);

  try {
    const { scene, animations } = useGLTF(avatarUrl);
    const { actions } = useAnimations(animations, group);

    useEffect(() => {
      if (scene) {
        console.log("Avatar model loaded successfully:", avatarUrl);
        onLoad();

        // Center and scale the model
        if (scene) {
          try {
            const box = new THREE.Box3().setFromObject(scene);
            const center = box.getCenter(new THREE.Vector3());
            const size = box.getSize(new THREE.Vector3());

            // Center the model
            scene.position.sub(center);

            // Scale to fit in view
            const maxDim = Math.max(size.x, size.y, size.z);
            const scale = 2 / maxDim;
            scene.scale.setScalar(scale);
          } catch (scaleError) {
            console.warn("Could not scale model, using default:", scaleError);
            // Use default positioning
            scene.position.set(0, 0, 0);
            scene.scale.setScalar(1);
          }
        }
      }
    }, [scene, avatarUrl, onLoad]);

    useEffect(() => {
      if (actions && animation) {
        actions[animation]?.play();
        return () => {
          actions[animation]?.fadeOut(0.5);
        };
      }
    }, [actions, animation]);

    return (
      <primitive
        ref={group}
        object={scene}
        dispose={null}
        position={[0, 0, 0]}
      />
    );
  } catch (error) {
    console.error("Error loading avatar model:", error);
    onError(`Failed to load model: ${error}`);

    // Return a fallback avatar when the model fails to load
    return (
      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[0.5, 0.5, 2, 8]} />
        <meshStandardMaterial color="#9B59B6" />
      </mesh>
    );
  }
}

// Three.js-based loading fallback for Suspense inside Canvas
function ThreeLoadingFallback() {
  return (
    <mesh position={[0, 0, 0]}>
      <boxGeometry args={[0.5, 0.5, 0.5]} />
      <meshStandardMaterial color="#3182CE" />
    </mesh>
  );
}

// React Native loading fallback for initial loading state
function LoadingFallback() {
  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#3182CE" />
      <Text style={styles.loadingText}>Loading 3D Avatar...</Text>
    </View>
  );
}

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; errorMessage: string }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, errorMessage: "" };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, errorMessage: error.message || "Unknown error" };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
    this.setState({ errorMessage: error.message || "Unknown error" });
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Failed to load avatar.</Text>
          <Text style={styles.errorDetails}>{this.state.errorMessage}</Text>
        </View>
      );
    }

    return this.props.children;
  }
}

const ThreeAvatar: React.FC<ThreeAvatarProps> = ({
  showAnimationButton = false,
}) => {
  const [currentAnimation, setCurrentAnimation] = useState<string>("idle");
  const [isAnimating, setIsAnimating] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [modelLoaded, setModelLoaded] = useState(false);
  const [modelError, setModelError] = useState<string | null>(null);
  const [canvasReady, setCanvasReady] = useState(false);
  const [canvasError, setCanvasError] = useState<string | null>(null);

  useEffect(() => {
    const loadAvatar = async () => {
      try {
        console.log("ThreeAvatar: Starting to load avatar...");
        const savedAvatarUrl = localStorageService.getAvatarUrl();
        if (savedAvatarUrl) {
          console.log("ThreeAvatar: Using saved avatar URL:", savedAvatarUrl);
          setAvatarUrl(savedAvatarUrl);
        } else {
          // Use the working ReadyPlayerMe URL
          const defaultUrl =
            "https://models.readyplayer.me/64bfa15f0e72c63d7c3934a6.glb";
          console.log("ThreeAvatar: Using default avatar URL:", defaultUrl);
          setAvatarUrl(defaultUrl);
        }
        setIsLoading(false);
      } catch (error) {
        console.error("ThreeAvatar: Error loading avatar URL:", error);
        setModelError("Failed to load avatar URL");
        setIsLoading(false);
      }
    };

    loadAvatar();
  }, []);

  const handleModelLoad = () => {
    console.log("ThreeAvatar: Model loaded successfully");
    setModelLoaded(true);
    setModelError(null);
  };

  const handleModelError = (error: string) => {
    console.error("ThreeAvatar: Model loading error:", error);
    setModelError(error);
    setModelLoaded(false);
  };

  const handleCanvasError = (error: any) => {
    console.error("ThreeAvatar: Canvas error:", error);
    setCanvasError(`Canvas error: ${error?.message || error}`);
  };

  const triggerExpression = () => {
    if (isAnimating) return;

    setIsAnimating(true);
    setCurrentAnimation("expression");

    setTimeout(() => {
      setCurrentAnimation("idle");
      setIsAnimating(false);
    }, 3000);
  };

  if (isLoading) {
    return <LoadingFallback />;
  }

  if (modelError) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Avatar Loading Error</Text>
          <Text style={styles.errorDetails}>{modelError}</Text>
          <Text style={styles.errorDetails}>URL: {avatarUrl}</Text>
        </View>
      </View>
    );
  }

  if (!avatarUrl) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>No Avatar URL Available</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ErrorBoundary>
        <Canvas
          style={styles.canvas}
          camera={{ position: [0, 0, 3], fov: 50 }}
          gl={{
            antialias: false,
            powerPreference: "high-performance",
            alpha: false,
            stencil: false,
            depth: true,
            preserveDrawingBuffer: false,
          }}
          onCreated={({ gl, scene, camera }) => {
            console.log("ThreeAvatar: Canvas created successfully");
            try {
              gl.setClearColor(0xf0f0f0, 1);
              gl.outputColorSpace = THREE.SRGBColorSpace;
              gl.toneMapping = THREE.NoToneMapping;
              setCanvasReady(true);
              setCanvasError(null);

              // Add some debugging info
              console.log("ThreeAvatar: GL context:", gl);
              console.log("ThreeAvatar: Scene:", scene);
              console.log("ThreeAvatar: Camera:", camera);
            } catch (error) {
              console.error("ThreeAvatar: Error in onCreated:", error);
              setCanvasError(`onCreated error: ${error}`);
            }
          }}
        >
          <ambientLight intensity={0.8} />
          <directionalLight position={[5, 5, 5]} intensity={0.5} />
          <pointLight position={[-5, 5, 5]} intensity={0.3} />

          {/* Test cube to verify Canvas is working */}
          <mesh position={[0, 0, 0]}>
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial color="#FF6B6B" />
          </mesh>

          {/* Simple rotating cube for testing */}
          <mesh position={[2, 0, 0]}>
            <boxGeometry args={[0.5, 0.5, 0.5]} />
            <meshStandardMaterial color="#4A90E2" />
          </mesh>

          {/* Try loading the avatar model */}
          <Suspense fallback={<ThreeLoadingFallback />}>
            {avatarUrl && (
              <AvatarModel
                animation={currentAnimation}
                avatarUrl={avatarUrl}
                onLoad={handleModelLoad}
                onError={handleModelError}
              />
            )}
          </Suspense>
        </Canvas>
      </ErrorBoundary>

      {showAnimationButton && (
        <TouchableOpacity
          style={[
            styles.animationButton,
            isAnimating && styles.animationButtonDisabled,
          ]}
          onPress={triggerExpression}
          disabled={isAnimating}
        >
          <Text style={styles.animationButtonText}>
            {isAnimating ? "🎭 Animating..." : "🎭 Play Expression"}
          </Text>
        </TouchableOpacity>
      )}

      {/* Debug info in development */}
      {__DEV__ && (
        <View style={styles.debugContainer}>
          <Text style={styles.debugText}>
            Canvas Ready: {canvasReady ? "Yes" : "No"}
          </Text>
          <Text style={styles.debugText}>
            Model Loaded: {modelLoaded ? "Yes" : "No"}
          </Text>
          <Text style={styles.debugText}>URL: {avatarUrl}</Text>
          <Text style={styles.debugText}>
            Test: You should see a red cube and blue cube
          </Text>
          {canvasError && (
            <Text style={styles.debugText}>Canvas Error: {canvasError}</Text>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 200,
    height: 300,
    backgroundColor: "#f0f0f0",
    borderRadius: 16,
    overflow: "hidden",
  },
  canvas: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f0f0f0",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: "#4A5568",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f0f0f0",
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: "#E53E3E",
    fontWeight: "600",
    marginBottom: 8,
  },
  errorDetails: {
    fontSize: 12,
    color: "#E53E3E",
    textAlign: "center",
    marginBottom: 4,
  },
  animationButton: {
    position: "absolute",
    bottom: 10,
    left: 10,
    right: 10,
    backgroundColor: "#3182CE",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  animationButtonDisabled: {
    backgroundColor: "#A0AEC0",
  },
  animationButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  debugContainer: {
    position: "absolute",
    top: 10,
    left: 10,
    right: 10,
    backgroundColor: "rgba(0,0,0,0.7)",
    padding: 8,
    borderRadius: 4,
  },
  debugText: {
    color: "#FFFFFF",
    fontSize: 10,
    marginBottom: 2,
  },
});

export default ThreeAvatar;
