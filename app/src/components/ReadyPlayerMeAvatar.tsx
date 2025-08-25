import React, { useState, useEffect, useRef } from "react";
import {
  View,
  StyleSheet,
  Alert,
  Text,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { WebView } from "react-native-webview";
import { localStorageService } from "../services/LocalStorageService";
import { UserProfile } from "../models/User";

// Replace 'demo' with your actual subdomain from Ready Player Me
const RPM_SUBDOMAIN = "mirrox";

interface ReadyPlayerMeAvatarProps {
  onCreateAvatar?: () => void;
  showCreateButton?: boolean;
  showAnimationButton?: boolean;
}

const ReadyPlayerMeAvatar: React.FC<ReadyPlayerMeAvatarProps> = ({
  onCreateAvatar,
  showCreateButton = false,
  showAnimationButton = false,
}) => {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const webViewRef = useRef<WebView>(null);

  useEffect(() => {
    // Get user profile and avatar URL (async)
    let mounted = true;
    (async () => {
      const profile = await localStorageService.getUserProfile();
      const savedAvatarUrl = await localStorageService.getAvatarUrl();
      if (!mounted) return;
      if (profile) setUserProfile(profile);
      if (savedAvatarUrl) setAvatarUrl(savedAvatarUrl);
      setIsLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const handleCreateAvatar = () => {
    if (onCreateAvatar) {
      onCreateAvatar();
    }
  };

  const triggerCustomAnimation = () => {
    setIsAnimating(true);

    // Send message to WebView to trigger the custom animation
    const animationMessage = JSON.stringify({
      type: "TRIGGER_ANIMATION",
      animationFile: "./assets/animations/M_Standing_Expressions_007.fbx",
    });

    if (webViewRef.current) {
      webViewRef.current.postMessage(animationMessage);
    }

    // Reset animation state after 3 seconds (adjust based on your animation duration)
    setTimeout(() => {
      setIsAnimating(false);
    }, 3000);
  };

  const renderAvatar = () => {
    // If we have an avatar URL, display the 3D avatar
    if (avatarUrl) {
      return (
        <View style={styles.avatarContainer}>
          <WebView
            ref={webViewRef}
            source={require("../../assets/avatar-viewer.html")}
            style={styles.avatarImage}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            allowsInlineMediaPlayback={true}
            mediaPlaybackRequiresUserAction={false}
            mixedContentMode="compatibility"
            onError={(syntheticEvent) => {
              const { nativeEvent } = syntheticEvent;
              console.warn(
                "3D Avatar WebView error: ",
                nativeEvent.description,
              );
            }}
            onMessage={(event) => {
              console.log("Model viewer message:", event.nativeEvent.data);
            }}
          />
          {showAnimationButton && (
            <TouchableOpacity
              style={[
                styles.animationButton,
                isAnimating && styles.animationButtonDisabled,
              ]}
              onPress={triggerCustomAnimation}
              disabled={isAnimating}
            >
              <Text style={styles.animationButtonText}>
                {isAnimating ? "🎭 Animating..." : "🎭 Play Expression"}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      );
    }

    // If no avatar exists, show placeholder
    return (
      <View style={styles.placeholderContainer}>
        <Text style={styles.placeholderText}>No avatar found</Text>
        <Text style={styles.placeholderSubtext}>
          Your avatar should have been created during onboarding
        </Text>
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3182CE" />
        <Text style={styles.loadingText}>Loading avatar...</Text>
      </View>
    );
  }

  return <View style={styles.container}>{renderAvatar()}</View>;
};

const styles = StyleSheet.create({
  container: {
    width: 200,
    height: 300,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingContainer: {
    width: 200,
    height: 300,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#4A5568",
  },
  avatarContainer: {
    width: "100%",
    height: "100%",
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#f0f0f0",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
  },
  placeholderContainer: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f0f0f0",
    borderRadius: 16,
    padding: 20,
  },
  placeholderText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#4A5568",
    textAlign: "center",
    marginBottom: 4,
  },
  placeholderSubtext: {
    fontSize: 14,
    color: "#718096",
    textAlign: "center",
    marginBottom: 16,
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
});

export default ReadyPlayerMeAvatar;
