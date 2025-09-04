import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Switch,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import { Shield, Lock, Smartphone, Eye, Code } from 'lucide-react-native';
import { localStorageService } from '../services/LocalStorageService';
import { useStressVisualsPreference } from '../hooks/useStressVisualsPreference';
import { useDeveloperControlsPreference } from '../hooks/useDeveloperControlsPreference';
import { colors, spacing, fontSize, borderRadius } from '../theme';

export default function SettingsScreen() {
  const [requireAuth, setRequireAuth] = useState(false);
  const [authMethod, setAuthMethod] = useState<'pin' | 'biometric' | 'both'>(
    'biometric'
  );
  const [loading, setLoading] = useState(true);

  // Use the stress visuals preference hook
  const {
    stressVisualsEnabled: enableStressVisuals,
    updateStressVisualsPreference,
  } = useStressVisualsPreference();

  // Use the developer controls preference hook
  const {
    developerControlsEnabled: enableDeveloperControls,
    updateDeveloperControlsPreference,
  } = useDeveloperControlsPreference();

  useEffect(() => {
    loadSecuritySettings();
  }, []);

  const loadSecuritySettings = async () => {
    try {
      const localStorage = localStorageService;
      const profile = await localStorage.getUserProfile();

      if (profile?.security) {
        setRequireAuth(profile.security.requireAuthentication);
        setAuthMethod(profile.security.authMethod || 'biometric');
      }

      // Note: Stress visuals preference is now handled by the hook
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateSecuritySettings = async (
    newRequireAuth: boolean,
    newAuthMethod?: 'pin' | 'biometric' | 'both'
  ) => {
    try {
      setLoading(true);
      const localStorage = localStorageService;

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
          'Security Enabled',
          'Authentication will be required the next time you open the app.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Failed to update security settings:', error);
      Alert.alert(
        'Error',
        'Failed to update security settings. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
    }
  };

  const handleAuthToggle = async (value: boolean) => {
    if (value) {
      Alert.alert(
        'Enable Authentication',
        'This will require biometric authentication or device passcode to access your digital twin data.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Enable',
            onPress: () => updateSecuritySettings(true),
          },
        ]
      );
    } else {
      Alert.alert(
        'Disable Authentication',
        'Are you sure you want to disable authentication? Your data will be accessible without verification.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Disable',
            style: 'destructive',
            onPress: () => updateSecuritySettings(false),
          },
        ]
      );
    }
  };

  const handleStressVisualsToggle = async (value: boolean) => {
    try {
      setLoading(true);

      const success = await updateStressVisualsPreference(value);

      if (success) {
        const message = value
          ? 'Stress visuals have been enabled. Your digital twin will now show stress animations and breathing effects when traffic or air quality conditions are detected.'
          : 'Stress visuals have been disabled. Your digital twin will remain in a calm state with only idle animations, regardless of traffic or air quality conditions.';

        Alert.alert('Stress Visuals Updated', message, [{ text: 'OK' }]);
      } else {
        Alert.alert(
          'Error',
          'Failed to update stress visuals setting. Please try again.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Failed to update stress visuals setting:', error);
      Alert.alert(
        'Error',
        'Failed to update stress visuals setting. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDeveloperControlsToggle = async (value: boolean) => {
    try {
      setLoading(true);

      const success = await updateDeveloperControlsPreference(value);

      if (success) {
        const message = value
          ? 'Developer controls have been enabled. You will now see skin tone controls in the dashboard and UI overlays in the avatar view.'
          : 'Developer controls have been disabled. All developer controls and UI overlays will be hidden.';

        Alert.alert('Developer Controls Updated', message, [{ text: 'OK' }]);
      } else {
        Alert.alert(
          'Error',
          'Failed to update developer controls setting. Please try again.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Failed to update developer controls setting:', error);
      Alert.alert(
        'Error',
        'Failed to update developer controls setting. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
    }
  };

  const AuthMethodOption = ({
    method,
    title,
    description,
    icon,
  }: {
    method: 'pin' | 'biometric' | 'both';
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
            <Eye size={24} color={colors.neutral[700]} />
            <Text style={styles.sectionTitle}>Display Preferences</Text>
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Stress Visuals</Text>
              <Text style={styles.settingDescription}>
                Show stress animations, breathing effects, and visual indicators
                when traffic or air quality conditions affect your digital twin
              </Text>
            </View>
            <Switch
              value={enableStressVisuals}
              onValueChange={handleStressVisualsToggle}
              disabled={loading}
              trackColor={{
                false: colors.neutral[300],
                true: colors.black,
              }}
              thumbColor={colors.white}
            />
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Code size={24} color={colors.neutral[700]} />
            <Text style={styles.sectionTitle}>Developer Options</Text>
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Developer Controls</Text>
              <Text style={styles.settingDescription}>
                Show developer controls like skin tone adjustments and UI
                overlays for testing and customization
              </Text>
            </View>
            <Switch
              value={enableDeveloperControls}
              onValueChange={handleDeveloperControlsToggle}
              disabled={loading}
              trackColor={{
                false: colors.neutral[300],
                true: colors.black,
              }}
              thumbColor={colors.white}
            />
          </View>
        </View>

        {/* <View style={styles.section}> */}
        {/*   <View style={styles.sectionHeader}> */}
        {/*     <Shield size={24} color={colors.neutral[700]} /> */}
        {/*     <Text style={styles.sectionTitle}>Security & Privacy</Text> */}
        {/*   </View> */}
        {/**/}
        {/*   <View style={styles.settingRow}> */}
        {/*     <View style={styles.settingInfo}> */}
        {/*       <Text style={styles.settingTitle}>Require Authentication</Text> */}
        {/*       <Text style={styles.settingDescription}> */}
        {/*         Protect your digital twin data with biometric authentication or */}
        {/*         device passcode */}
        {/*       </Text> */}
        {/*     </View> */}
        {/*     <Switch */}
        {/*       value={requireAuth} */}
        {/*       onValueChange={handleAuthToggle} */}
        {/*       disabled={loading} */}
        {/*       trackColor={{ */}
        {/*         false: colors.neutral[300], */}
        {/*         true: colors.black, */}
        {/*       }} */}
        {/*       thumbColor={colors.white} */}
        {/*     /> */}
        {/*   </View> */}
        {/**/}
        {/*   {requireAuth && ( */}
        {/*     <View style={styles.authMethodSection}> */}
        {/*       <Text style={styles.authMethodSectionTitle}> */}
        {/*         Authentication Method */}
        {/*       </Text> */}
        {/**/}
        {/*       <AuthMethodOption */}
        {/*         method="biometric" */}
        {/*         title="Biometric Authentication" */}
        {/*         description="Use Face ID, Touch ID, or fingerprint" */}
        {/*         icon={ */}
        {/*           <Smartphone */}
        {/*             size={20} */}
        {/*             color={ */}
        {/*               authMethod === 'biometric' */}
        {/*                 ? colors.white */}
        {/*                 : colors.neutral[600] */}
        {/*             } */}
        {/*           /> */}
        {/*         } */}
        {/*       /> */}
        {/**/}
        {/*       <AuthMethodOption */}
        {/*         method="pin" */}
        {/*         title="Device Passcode" */}
        {/*         description="Use your device PIN or password" */}
        {/*         icon={ */}
        {/*           <Lock */}
        {/*             size={20} */}
        {/*             color={ */}
        {/*               authMethod === 'pin' ? colors.white : colors.neutral[600] */}
        {/*             } */}
        {/*           /> */}
        {/*         } */}
        {/*       /> */}
        {/**/}
        {/*       <AuthMethodOption */}
        {/*         method="both" */}
        {/*         title="Both Methods" */}
        {/*         description="Allow either biometric or passcode" */}
        {/*         icon={ */}
        {/*           <Shield */}
        {/*             size={20} */}
        {/*             color={ */}
        {/*               authMethod === 'both' ? colors.white : colors.neutral[600] */}
        {/*             } */}
        {/*           /> */}
        {/*         } */}
        {/*       /> */}
        {/*     </View> */}
        {/*   )} */}
        {/* </View> */}

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
    justifyContent: 'center',
    alignItems: 'center',
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
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSize.xl,
    fontWeight: '600',
    color: colors.black,
    marginLeft: spacing.sm,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
    fontWeight: '600',
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
    fontWeight: '600',
    color: colors.black,
    marginBottom: spacing.md,
  },
  authMethodOption: {
    flexDirection: 'row',
    alignItems: 'center',
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
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  authMethodContent: {
    flex: 1,
  },
  authMethodTitle: {
    fontSize: fontSize.base,
    fontWeight: '600',
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
    textAlign: 'center',
  },
});
