import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  SafeAreaView,
} from "react-native";
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

  // Entrance animations
  const [fadeAnim] = useState(new Animated.Value(0));
  const [scaleAnim] = useState(new Animated.Value(0.8));

  // Progress & text
  const [progressAnim] = useState(new Animated.Value(0)); // 0 -> 1 over 1.5s
  const [loadingText, setLoadingText] = useState("Initializing...");

  // Coordination flags
  const [initDone, setInitDone] = useState(false);
  const [progressDone, setProgressDone] = useState(false);
  const [hasUser, setHasUser] = useState<boolean>(false);

  // Start entrance & progress animations once
  useEffect(() => {
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

    Animated.timing(progressAnim, {
      toValue: 1,
      duration: 1500,
      easing: Easing.linear,
      useNativeDriver: false, // width animation requires layout
    }).start(() => setProgressDone(true));
  }, []);

  // Derive loading text from progress value
  useEffect(() => {
    const id = progressAnim.addListener(({ value }) => {
      if (value < 0.4) {
        setLoadingText("Initializing services...");
      } else if (value < 0.8) {
        setLoadingText("Checking user data...");
      } else {
        setLoadingText("Ready!");
      }
    });
    return () => {
      progressAnim.removeListener(id);
    };
  }, [progressAnim]);

  // Do real initialization work in parallel
  useEffect(() => {
    const initializeApp = async () => {
      try {
        const localStorage = new LocalStorageService();
        await AnimationCacheService.initialize();

        const userProfile = await localStorage.getUserProfile();
        const avatarUrl = await localStorage.getAvatarUrl();

        setHasUser(Boolean(userProfile && avatarUrl));
        setInitDone(true);
      } catch (error) {
        console.error("❌ Error during app initialization:", error);
        setLoadingText("Error occurred");
        setHasUser(false);
        setInitDone(true);
      }
    };

    initializeApp();
  }, []);

  // Navigate when BOTH progress + init are done
  useEffect(() => {
    if (progressDone && initDone) {
      const t = setTimeout(() => {
        navigation.replace(hasUser ? "Dashboard" : "Welcome");
      }, 250); // slight pause to let users see 100%
      return () => clearTimeout(t);
    }
  }, [progressDone, initDone, hasUser, navigation]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Animated.View
          style={[
            styles.centerContent,
            { opacity: fadeAnim, transform: [{ scale: scaleAnim }] },
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
                    width: progressAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ["0%", "100%"],
                    }),
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
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.xl,
  },
  centerContent: {
    alignItems: "center",
    width: "100%",
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: spacing.xxl,
  },
  logo: {
    width: 120,
    height: 120,
    borderRadius: borderRadius.full,
    backgroundColor: colors.neutral[800],
    borderWidth: 2,
    borderColor: colors.neutral[700],
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.lg,
    ...shadows.medium,
  },
  title: {
    fontSize: fontSize.xxxl + 4,
    fontWeight: "700",
    color: colors.white,
    textAlign: "center",
    marginBottom: spacing.md,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: fontSize.base,
    color: colors.neutral[400],
    textAlign: "center",
    fontWeight: "500",
  },
  loadingContainer: {
    width: "100%",
    alignItems: "center",
  },
  progressBar: {
    width: "100%",
    height: 3,
    backgroundColor: colors.neutral[800],
    borderRadius: borderRadius.full,
    overflow: "hidden",
    marginBottom: spacing.md,
  },
  progressFill: {
    height: "100%",
    backgroundColor: colors.white,
    borderRadius: borderRadius.full,
  },
  loadingText: {
    fontSize: fontSize.sm,
    color: colors.neutral[500],
    textAlign: "center",
    fontWeight: "500",
  },
});
