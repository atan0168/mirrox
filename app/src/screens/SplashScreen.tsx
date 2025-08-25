import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, Animated, Easing, SafeAreaView } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { Heart } from "lucide-react-native";
import { RootStackParamList } from "../../App";
import { LocalStorageService } from "../services/LocalStorageService";
import AnimationCacheService from "../services/AnimationCacheService";
import { colors, spacing, fontSize, borderRadius, shadows } from "../theme";

type SplashScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  "Splash"
>;

export default function SplashScreen() {
  const navigation = useNavigation<SplashScreenNavigationProp>();
  const [fadeAnim] = useState(new Animated.Value(0));
  const [scaleAnim] = useState(new Animated.Value(0.8));
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingText, setLoadingText] = useState("Initializing...");

  useEffect(() => {
    // Start entrance animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 1000,
        easing: Easing.out(Easing.back(1.5)),
        useNativeDriver: true,
      }),
    ]).start();

    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      // Step 1: Initialize services
      setLoadingText("Initializing services...");
      setLoadingProgress(0.1);

      const localStorage = new LocalStorageService();
      await AnimationCacheService.initialize();

      // Step 2: Check for existing user data
      setLoadingText("Checking user data...");
      setLoadingProgress(0.7);

      const userProfile = await localStorage.getUserProfile();
      const avatarUrl = await localStorage.getAvatarUrl();

      // Step 3: Navigation decision
      setLoadingText("Ready!");
      setLoadingProgress(1.0);

      // Small delay to show completion
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Navigate based on user data
      if (userProfile && avatarUrl) {
        console.log("✅ Found existing user data, navigating to Dashboard");
        navigation.replace("Dashboard");
      } else {
        console.log("📝 No existing user data, navigating to Welcome");
        navigation.replace("Welcome");
      }
    } catch (error) {
      console.error("❌ Error during app initialization:", error);
      setLoadingText("Error occurred");
      // Navigate to welcome as fallback
      setTimeout(() => navigation.replace("Welcome"), 1000);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Animated.View
          style={[
            styles.centerContent,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <View style={styles.logoContainer}>
            <View style={styles.logo}>
              <Heart size={48} color={colors.white} fill={colors.white} />
            </View>
            <Text style={styles.title}>Digital Twin</Text>
            <Text style={styles.subtitle}>Health & Wellness Monitoring</Text>
          </View>

          <View style={styles.loadingContainer}>
            <View style={styles.progressBar}>
              <Animated.View
                style={[
                  styles.progressFill,
                  {
                    width: `${loadingProgress * 100}%`,
                  },
                ]}
              />
            </View>
            <Text style={styles.loadingText}>{loadingText}</Text>
          </View>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.black,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  centerContent: {
    alignItems: 'center',
    width: '100%',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: spacing.xxxl + spacing.lg,
  },
  logo: {
    width: 120,
    height: 120,
    borderRadius: borderRadius.full,
    backgroundColor: colors.neutral[800],
    borderWidth: 2,
    borderColor: colors.neutral[700],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
    ...shadows.medium,
  },
  title: {
    fontSize: fontSize.xxxl + 4,
    fontWeight: '700',
    color: colors.white,
    textAlign: 'center',
    marginBottom: spacing.xs,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: fontSize.base,
    color: colors.neutral[400],
    textAlign: 'center',
    fontWeight: '500',
  },
  loadingContainer: {
    width: '100%',
    alignItems: 'center',
  },
  progressBar: {
    width: '100%',
    height: 3,
    backgroundColor: colors.neutral[800],
    borderRadius: borderRadius.full,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.white,
    borderRadius: borderRadius.full,
  },
  loadingText: {
    fontSize: fontSize.sm,
    color: colors.neutral[500],
    textAlign: 'center',
    fontWeight: '500',
  },
});
