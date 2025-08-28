import * as Location from "expo-location";
import React, { useState } from "react";
import {
  Alert,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Button, Card } from "../components/ui";
import { borderRadius, colors, fontSize, spacing } from "../theme";

interface PermissionScreenProps {
  navigation: any;
}

const PermissionScreen: React.FC<PermissionScreenProps> = ({ navigation }) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleAllowLocation = async () => {
    setIsLoading(true);

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== "granted") {
        Alert.alert(
          "Permission Denied",
          "Location access is needed to personalize your experience. You can manually select your city instead.",
          [
            {
              text: "OK",
              onPress: () => navigation.navigate("CitySelection"),
            },
          ],
        );
        return;
      }

      // Get current location
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const { latitude, longitude } = location.coords;
      navigation.navigate("Questionnaire", {
        location: { latitude, longitude },
      });
    } catch (error) {
      console.error("Location error:", error);
      Alert.alert(
        "Location Error",
        "Could not fetch location. You can manually select your city instead.",
        [
          {
            text: "OK",
            onPress: () => navigation.navigate("CitySelection"),
          },
        ],
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleChooseManually = () => {
    navigation.navigate("CitySelection");
  };

  const handleClose = () => {
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
          <Ionicons name="close" size={24} color={colors.neutral[600]} />
        </TouchableOpacity>

        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <View style={styles.iconWrapper}>
              <Ionicons
                name="location-outline"
                size={48}
                color={colors.neutral[600]}
              />
            </View>
          </View>

          <Text style={styles.title}>
            Location helps personalize your experience
          </Text>

          <View style={styles.benefitsList}>
            <View style={styles.benefitItem}>
              <Ionicons
                name="partly-sunny-outline"
                size={20}
                color={colors.neutral[600]}
                style={styles.benefitIcon}
              />
              <View style={styles.benefitTextContainer}>
                <Text style={styles.benefitTitle}>
                  Weather-aware suggestions
                </Text>
                <Text style={styles.benefitDescription}>
                  Adjust recommendations based on local conditions
                </Text>
              </View>
            </View>

            <View style={styles.benefitItem}>
              <Ionicons
                name="time-outline"
                size={20}
                color={colors.neutral[600]}
                style={styles.benefitIcon}
              />
              <View style={styles.benefitTextContainer}>
                <Text style={styles.benefitTitle}>Time zone accuracy</Text>
                <Text style={styles.benefitDescription}>
                  Sync your wellness routine with local time
                </Text>
              </View>
            </View>

            <View style={styles.benefitItem}>
              <Ionicons
                name="shield-checkmark-outline"
                size={20}
                color={colors.neutral[600]}
                style={styles.benefitIcon}
              />
              <View style={styles.benefitTextContainer}>
                <Text style={styles.benefitTitle}>Private by Design</Text>
                <Text style={styles.benefitDescription}>
                  Location helps unlock local air quality, weather, and traffic
                  insights—never tied to who you are.
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.buttonContainer}>
          <Button
            fullWidth
            variant="secondary"
            size="lg"
            disabled={isLoading}
            onPress={handleAllowLocation}
          >
            {isLoading ? "Getting Location..." : "Allow Location Access"}
          </Button>

          <Button
            fullWidth
            variant="outline"
            size="lg"
            onPress={handleChooseManually}
            style={styles.manualButton}
          >
            Choose City Manually
          </Button>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.white,
  },
  container: {
    flex: 1,
    padding: spacing.lg,
  },
  closeButton: {
    alignSelf: "flex-end",
    padding: spacing.sm,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing.md,
  },
  iconContainer: {
    marginBottom: spacing.xl,
  },
  iconWrapper: {
    width: 120,
    height: 120,
    borderRadius: borderRadius.full,
    backgroundColor: colors.neutral[100],
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: spacing.xl,
    color: colors.black,
    lineHeight: 28,
  },
  benefitsList: {
    width: "100%",
    gap: spacing.lg,
  },
  benefitItem: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  benefitIcon: {
    marginTop: 2,
    marginRight: spacing.md,
  },
  benefitTextContainer: {
    flex: 1,
  },
  benefitTitle: {
    fontSize: fontSize.base,
    fontWeight: "500",
    color: colors.black,
    marginBottom: spacing.xs,
  },
  benefitDescription: {
    fontSize: fontSize.sm,
    color: colors.neutral[600],
    lineHeight: 20,
  },
  buttonContainer: {
    gap: spacing.md,
    paddingBottom: spacing.lg,
  },
  manualButton: {
    marginTop: spacing.sm,
  },
});

export default PermissionScreen;
