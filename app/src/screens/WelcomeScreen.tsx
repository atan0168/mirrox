import { LinearGradient } from "expo-linear-gradient";
import * as Location from "expo-location";
import React, { useState } from "react";
import {
  Alert,
  Image,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Button, Card } from "../components/ui";
import { borderRadius, colors, fontSize, spacing } from "../theme";

interface WelcomeScreenProps {
  navigation: any; // You can type this more strictly with NavigationProp
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ navigation }) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleGetStarted = async () => {
    setIsLoading(true);

    try {
      // Request permission to access location
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== "granted") {
        Alert.alert(
          "Permission Denied",
          "Location access is needed to personalize your digital twin's environment. You can manually select your city in the next step.",
          [
            {
              text: "OK",
              onPress: () =>
                navigation.navigate("Questionnaire", { location: null }),
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
        "Could not fetch location. You can manually select your city in the next step.",
        [
          {
            text: "OK",
            onPress: () =>
              navigation.navigate("Questionnaire", { location: null }),
          },
        ],
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.content}>
          <Card style={styles.welcomeCard} shadow="lg">
            <View style={styles.iconContainer}>
              <LinearGradient
                colors={["#6EE7B7", "#3B82F6"]} // your gradient colors
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.iconWrapper}
              >
                <Image
                  source={require("../../assets/avatar2d.png")}
                  style={styles.iconImage}
                  resizeMode="contain"
                />
              </LinearGradient>
            </View>

            <Text style={styles.title}>Welcome to Your Digital Twin</Text>
            <Text style={styles.subtitle}>
              Create a magical representation of yourself that promotes wellness
              and self-awareness
            </Text>
          </Card>

          <Button
            fullWidth
            variant="secondary"
            size="lg"
            disabled={isLoading}
            onPress={handleGetStarted}
          >
            {isLoading ? "Getting Location..." : "Get Started"}
          </Button>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.neutral[50],
  },
  container: {
    flex: 1,
    justifyContent: "center",
    padding: spacing.lg,
  },
  content: {
    gap: spacing.xl,
  },
  welcomeCard: {
    padding: spacing.xxxl,
    alignItems: "center",
  },
  iconContainer: {
    marginBottom: spacing.lg,
  },
  iconWrapper: {
    width: 250,
    height: 250,
    borderRadius: borderRadius.full,
    // backgroundColor: colors.neutral[100],
    borderWidth: 1,
    borderColor: colors.neutral[200],
    alignItems: "center",
    justifyContent: "center",
  },
  iconImage: {
    transform: [{ translateX: 5 }],
    width: "100%",
    height: "100%",
  },
  title: {
    fontSize: fontSize.xxxl,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: spacing.md,
    color: colors.black,
  },
  subtitle: {
    fontSize: fontSize.base,
    textAlign: "center",
    color: colors.neutral[600],
    lineHeight: 24,
  },
});

export default WelcomeScreen;
