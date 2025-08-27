import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Switch,
  TouchableOpacity,
  Alert,
  ScrollView,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { Shield, Lock, Smartphone } from "lucide-react-native";
import { LocalStorageService } from "../services/LocalStorageService";
import { colors, spacing, fontSize, borderRadius } from "../theme";

type SettingsScreenNavigationProp = StackNavigationProp<any, "Settings">;

export default function SettingsScreen() {
  const navigation = useNavigation<SettingsScreenNavigationProp>();
  const [requireAuth, setRequireAuth] = useState(false);
  const [authMethod, setAuthMethod] = useState<"pin" | "biometric" | "both">(
    "biometric",
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSecuritySettings();
  }, []);

  const loadSecuritySettings = async () => {
    try {
      const localStorage = new LocalStorageService();
      const profile = await localStorage.getUserProfile();

      if (profile?.security) {
        setRequireAuth(profile.security.requireAuthentication);
        setAuthMethod(profile.security.authMethod || "biometric");
      }
    } catch (error) {
      console.error("Failed to load security settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateSecuritySettings = async (
    newRequireAuth: boolean,
    newAuthMethod?: "pin" | "biometric" | "both",
  ) => {
    try {
      setLoading(true);
      const localStorage = new LocalStorageService();

      await localStorage.updateSecuritySettings({
        requireAuthentication: newRequireAuth,
        authMethod: newAuthMethod || authMethod,
      });

      setRequireAuth(newRequireAuth);
      if (newAuthMethod) {
        setAuthMethod(newAuthMethod);
      }

      if (newRequireAuth) {
        Alert.alert(
          "Security Enabled",
          "Authentication will be required the next time you open the app.",
          [{ text: "OK" }],
        );
      }
    } catch (error) {
      console.error("Failed to update security settings:", error);
      Alert.alert(
        "Error",
        "Failed to update security settings. Please try again.",
        [{ text: "OK" }],
      );
    } finally {
      setLoading(false);
    }
  };

  const handleAuthToggle = async (value: boolean) => {
    if (value) {
      Alert.alert(
        "Enable Authentication",
        "This will require biometric authentication or device passcode to access your digital twin data.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Enable",
            onPress: () => updateSecuritySettings(true),
          },
        ],
      );
    } else {
      Alert.alert(
        "Disable Authentication",
        "Are you sure you want to disable authentication? Your data will be accessible without verification.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Disable",
            style: "destructive",
            onPress: () => updateSecuritySettings(false),
          },
        ],
      );
    }
  };

  const AuthMethodOption = ({
    method,
    title,
    description,
    icon,
  }: {
    method: "pin" | "biometric" | "both";
    title: string;
    description: string;
    icon: React.ReactNode;
  }) => (
    <TouchableOpacity
      style={[
        styles.authMethodOption,
        authMethod === method && styles.authMethodSelected,
      ]}
      onPress={() => updateSecuritySettings(requireAuth, method)}
      disabled={!requireAuth || loading}
    >
      <View style={styles.authMethodIcon}>{icon}</View>
      <View style={styles.authMethodContent}>
        <Text
          style={[
            styles.authMethodTitle,
            authMethod === method && styles.authMethodTitleSelected,
          ]}
        >
          {title}
        </Text>
        <Text
          style={[
            styles.authMethodDescription,
            !requireAuth && styles.authMethodDisabled,
          ]}
        >
          {description}
        </Text>
      </View>
      {authMethod === method && requireAuth && (
        <View style={styles.selectedIndicator} />
      )}
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading settings...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Shield size={24} color={colors.neutral[700]} />
            <Text style={styles.sectionTitle}>Security & Privacy</Text>
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Require Authentication</Text>
              <Text style={styles.settingDescription}>
                Protect your digital twin data with biometric authentication or
                device passcode
              </Text>
            </View>
            <Switch
              value={requireAuth}
              onValueChange={handleAuthToggle}
              disabled={loading}
              trackColor={{
                false: colors.neutral[300],
                true: colors.black,
              }}
              thumbColor={colors.white}
            />
          </View>

          {requireAuth && (
            <View style={styles.authMethodSection}>
              <Text style={styles.authMethodSectionTitle}>
                Authentication Method
              </Text>

              <AuthMethodOption
                method="biometric"
                title="Biometric Authentication"
                description="Use Face ID, Touch ID, or fingerprint"
                icon={
                  <Smartphone
                    size={20}
                    color={
                      authMethod === "biometric"
                        ? colors.white
                        : colors.neutral[600]
                    }
                  />
                }
              />

              <AuthMethodOption
                method="pin"
                title="Device Passcode"
                description="Use your device PIN or password"
                icon={
                  <Lock
                    size={20}
                    color={
                      authMethod === "pin" ? colors.white : colors.neutral[600]
                    }
                  />
                }
              />

              <AuthMethodOption
                method="both"
                title="Both Methods"
                description="Allow either biometric or passcode"
                icon={
                  <Shield
                    size={20}
                    color={
                      authMethod === "both" ? colors.white : colors.neutral[600]
                    }
                  />
                }
              />
            </View>
          )}
        </View>

        <View style={styles.infoSection}>
          <Text style={styles.infoText}>
            Your data is always encrypted and stored securely on your device.
            Authentication adds an extra layer of protection by requiring
            verification before accessing your digital twin.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    fontSize: fontSize.base,
    color: colors.neutral[600],
  },
  content: {
    flex: 1,
    padding: spacing.lg,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSize.xl,
    fontWeight: "600",
    color: colors.black,
    marginLeft: spacing.sm,
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.neutral[50],
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
  },
  settingInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  settingTitle: {
    fontSize: fontSize.lg,
    fontWeight: "600",
    color: colors.black,
    marginBottom: spacing.xs,
  },
  settingDescription: {
    fontSize: fontSize.sm,
    color: colors.neutral[600],
    lineHeight: 20,
  },
  authMethodSection: {
    marginTop: spacing.md,
  },
  authMethodSectionTitle: {
    fontSize: fontSize.base,
    fontWeight: "600",
    color: colors.black,
    marginBottom: spacing.md,
  },
  authMethodOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.lg,
    backgroundColor: colors.neutral[50],
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: colors.neutral[200],
    marginBottom: spacing.sm,
  },
  authMethodSelected: {
    backgroundColor: colors.black,
    borderColor: colors.black,
  },
  authMethodIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    backgroundColor: colors.neutral[200],
    justifyContent: "center",
    alignItems: "center",
    marginRight: spacing.md,
  },
  authMethodContent: {
    flex: 1,
  },
  authMethodTitle: {
    fontSize: fontSize.base,
    fontWeight: "600",
    color: colors.black,
    marginBottom: spacing.xs,
  },
  authMethodTitleSelected: {
    color: colors.white,
  },
  authMethodDescription: {
    fontSize: fontSize.sm,
    color: colors.neutral[600],
  },
  authMethodDisabled: {
    color: colors.neutral[400],
  },
  selectedIndicator: {
    width: 8,
    height: 8,
    borderRadius: borderRadius.full,
    backgroundColor: colors.white,
  },
  infoSection: {
    padding: spacing.lg,
    backgroundColor: colors.neutral[50],
    borderRadius: borderRadius.lg,
    marginTop: spacing.lg,
  },
  infoText: {
    fontSize: fontSize.sm,
    color: colors.neutral[600],
    lineHeight: 20,
    textAlign: "center",
  },
});
