import React, { useState, useEffect, useMemo } from 'react';
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
import {
  Shield,
  Lock,
  Smartphone,
  Eye,
  Code,
  RefreshCw,
  Database,
  Bell,
} from 'lucide-react-native';
import { localStorageService } from '../services/LocalStorageService';
import { useStressVisualsPreference } from '../hooks/useStressVisualsPreference';
import { useDeveloperControlsPreference } from '../hooks/useDeveloperControlsPreference';
import { useSandboxPreference } from '../hooks/useSandboxPreference';
import { colors, spacing, fontSize, borderRadius } from '../theme';
import { useHealthData } from '../hooks/useHealthData';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { RootStackParamList } from '../navigation/types';
import { useEnergyNotificationsPreference } from '../hooks/useEnergyNotificationsPreference';
import { useSleepHealthNotificationsPreference } from '../hooks/useSleepHealthNotificationsPreference';
import {
  cancelAllNotifications,
  requestNotificationPermissions,
} from '../services/notifications';
import { SleepHealthNotifier } from '../services/SleepHealthNotifier';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { differenceInMinutes } from 'date-fns';
import { getDeviceTimeZone, yyyymmddInTimeZone } from '../utils/datetimeUtils';
import type { HealthSnapshot } from '../models/Health';

export default function SettingsScreen() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const queryClient = useQueryClient();
  const [requireAuth, setRequireAuth] = useState(false);
  const [authMethod, setAuthMethod] = useState<'pin' | 'biometric' | 'both'>(
    'biometric'
  );
  const [loading, setLoading] = useState(true);
  const {
    requestPermissions,
    refresh,
    data: health,
    loading: healthLoading,
  } = useHealthData({ autoSync: false });

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

  const {
    sandboxEnabled: enableSandboxMode,
    loading: sandboxPreferenceLoading,
    updateSandboxPreference,
  } = useSandboxPreference();

  // Use the energy notifications preference hook
  const {
    energyNotificationsEnabled: enableEnergyNotifications,
    updateEnergyNotificationsPreference,
  } = useEnergyNotificationsPreference();

  // Use the sleep & health notifications preference hook
  const {
    sleepHealthNotificationsEnabled: enableSleepHealthNotifications,
    updateSleepHealthNotificationsPreference,
  } = useSleepHealthNotificationsPreference();

  const timeZone = useMemo(() => getDeviceTimeZone(), []);
  const todayStr = useMemo(
    () => yyyymmddInTimeZone(new Date(), timeZone),
    [timeZone]
  );

  const deriveSleepMinutes = (snapshot?: HealthSnapshot | null) => {
    if (!snapshot) return 0;
    const minutes = snapshot.sleepMinutes ?? 0;
    if (minutes > 0) return minutes;
    if (snapshot.sleepStart && snapshot.sleepEnd) {
      const start = new Date(snapshot.sleepStart);
      const end = new Date(snapshot.sleepEnd);
      const diff = differenceInMinutes(end, start);
      return diff > 0 ? diff : 0;
    }
    return 0;
  };

  const latestStepsValue = useMemo(() => {
    if (!health) return null;
    if (health.date !== todayStr) return null;
    if (typeof health.steps !== 'number') return 0;
    return health.steps;
  }, [health, todayStr]);

  const latestSleepMinutes = useMemo(() => {
    if (!health) return null;
    if (health.date !== todayStr) return null;
    return deriveSleepMinutes(health);
  }, [health, todayStr]);

  const latestStepsText =
    latestStepsValue == null ? 'No steps data' : `${latestStepsValue} steps`;

  const latestSleepText =
    latestSleepMinutes != null && latestSleepMinutes > 0
      ? `${(latestSleepMinutes / 60).toFixed(1)}h sleep`
      : 'No sleep data';

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

  const handleResetProfile = () => {
    Alert.alert(
      'Reset Profile',
      'This will erase your profile and avatar from this device and restart onboarding. This action cannot be undone. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              // First clear avatar cache files on disk
              try {
                await localStorageService.clearAvatarCache();
              } catch (e) {
                console.warn('Failed to clear avatar cache during reset:', e);
              }

              // Perform a complete local reset (encrypted storage + keys)
              await localStorageService.completeReset();

              // Navigate back to onboarding (Welcome)
              const parent = navigation.getParent();
              // Reset the root stack to avoid back navigation into tabs
              // Casts are used to appease TS without deep typing here
              parent?.reset?.({
                index: 0,
                routes: [{ name: 'Welcome' }],
              });
              if (!parent) {
                // Fallback: navigate if reset isn't available
                navigation.navigate('Welcome' as never);
              }
            } catch (error) {
              console.error('Failed to reset profile:', error);
              Alert.alert(
                'Error',
                'Failed to reset profile. Please try again.'
              );
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleEnergyNotificationsToggle = async (value: boolean) => {
    if (loading) return;
    setLoading(true);
    try {
      const success = await updateEnergyNotificationsPreference(value);
      if (success) {
        if (value) {
          const granted = await requestNotificationPermissions();
          if (!granted) {
            Alert.alert(
              'Permission Needed',
              'Please allow notifications in system settings to receive alerts.'
            );
          }
          Alert.alert(
            'Notifications Enabled',
            'You will receive an alert when your energy is predicted to drop below 30%.'
          );
        } else {
          try {
            await cancelAllNotifications();
          } catch {}
          Alert.alert(
            'Notifications Disabled',
            'Energy alerts have been turned off.'
          );
        }
      } else {
        Alert.alert(
          'Error',
          'Failed to update notifications setting. Please try again.'
        );
      }
    } catch (e) {
      console.error('Failed to toggle energy notifications:', e);
      Alert.alert(
        'Error',
        'Failed to update notifications setting. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSleepHealthNotificationsToggle = async (value: boolean) => {
    if (loading) return;
    setLoading(true);
    try {
      const success = await updateSleepHealthNotificationsPreference(value);
      if (success) {
        if (value) {
          const granted = await requestNotificationPermissions();
          if (!granted) {
            Alert.alert(
              'Permission Needed',
              'Please allow notifications in system settings to receive sleep insights.'
            );
          }
          Alert.alert(
            'Sleep Insights Enabled',
            'You may receive up to one sleep & health insight per day based on recent patterns.'
          );
        } else {
          Alert.alert(
            'Sleep Insights Disabled',
            'Sleep & health notifications have been turned off.'
          );
        }
      } else {
        Alert.alert('Error', 'Failed to update setting. Please try again.');
      }
    } catch (e) {
      console.error('Failed to toggle sleep & health notifications:', e);
      Alert.alert('Error', 'Failed to update setting. Please try again.');
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
      await updateSecurityMutation.mutateAsync({
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

  // React Query mutation for updating security settings, keeps userProfile fresh
  const updateSecurityMutation = useMutation({
    mutationFn: async (settings: {
      requireAuthentication: boolean;
      authMethod?: 'pin' | 'biometric' | 'both';
    }) => {
      await localStorageService.updateSecuritySettings(settings);
      return settings;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userProfile'] });
    },
  });

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

  const handleSandboxToggle = async (value: boolean) => {
    try {
      setLoading(true);
      const success = await updateSandboxPreference(value);
      if (success) {
        const message = value
          ? 'Sandbox mode is now active. The app will use developer demo data sources until you disable it.'
          : 'Sandbox mode has been disabled. Live data sources are re-enabled.';
        Alert.alert('Sandbox Mode Updated', message, [{ text: 'OK' }]);
      } else {
        Alert.alert(
          'Error',
          'Failed to update sandbox mode. Please try again.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Failed to update sandbox mode preference:', error);
      Alert.alert('Error', 'Failed to update sandbox mode. Please try again.', [
        { text: 'OK' },
      ]);
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
            <Bell size={24} color={colors.neutral[700]} />
            <Text style={styles.sectionTitle}>Notifications</Text>
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Energy Alerts</Text>
              <Text style={styles.settingDescription}>
                Notify when your energy is predicted to drop below 30%
              </Text>
            </View>
            <Switch
              value={!!enableEnergyNotifications}
              onValueChange={handleEnergyNotificationsToggle}
              disabled={loading}
              trackColor={{ false: colors.neutral[300], true: colors.black }}
              thumbColor={colors.white}
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Sleep & Health Insights</Text>
              <Text style={styles.settingDescription}>
                Receive one supportive, sourced insight per day based on your
                recent sleep and health data
              </Text>
            </View>
            <Switch
              value={!!enableSleepHealthNotifications}
              onValueChange={handleSleepHealthNotificationsToggle}
              disabled={loading}
              trackColor={{ false: colors.neutral[300], true: colors.black }}
              thumbColor={colors.white}
            />
          </View>
        </View>
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
            <Smartphone size={24} color={colors.neutral[700]} />
            <Text style={styles.sectionTitle}>Health Data</Text>
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Connect Health Sources</Text>
              <Text style={styles.settingDescription}>
                Read steps and sleep from your device to personalize your avatar
              </Text>
              {!!health && (
                <Text style={[styles.settingDescription, { marginTop: 6 }]}>
                  Latest: {latestStepsText}, {latestSleepText}
                </Text>
              )}
            </View>
            <TouchableOpacity
              disabled={loading || healthLoading}
              onPress={async () => {
                const granted = await requestPermissions();
                if (granted) {
                  await refresh();
                  Alert.alert('Sync Success', 'Health data has been synced.');
                } else {
                  Alert.alert(
                    'Permission Needed',
                    'Please allow access to read steps and sleep.'
                  );
                }
              }}
              style={{
                paddingHorizontal: spacing.md,
                paddingVertical: spacing.sm,
              }}
            >
              <Text style={{ color: colors.black, fontWeight: '600' }}>
                {healthLoading ? 'Syncing...' : 'Sync'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* DEV only controls */}
        {__DEV__ && (
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

            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>Sandbox Mode</Text>
                <Text style={styles.settingDescription}>
                  Feed the app with scripted demo data for air quality, dengue,
                  stress, and sleep so you can trigger full experiences on
                  demand
                </Text>
              </View>
              <Switch
                value={enableSandboxMode}
                onValueChange={handleSandboxToggle}
                disabled={loading || sandboxPreferenceLoading}
                trackColor={{
                  false: colors.neutral[300],
                  true: colors.black,
                }}
                thumbColor={colors.white}
              />
            </View>

            <TouchableOpacity
              style={styles.settingRow}
              onPress={() => {
                const parent = navigation.getParent();
                parent
                  ? parent.navigate('DebugDB')
                  : navigation.navigate('DebugDB');
              }}
            >
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>Database Debug</Text>
                <Text style={styles.settingDescription}>
                  Inspect or export the local SQLite database (dev only)
                </Text>
              </View>
              <Database size={20} color={colors.neutral[700]} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.settingRow}
              onPress={async () => {
                try {
                  await SleepHealthNotifier.sendSampleNow();
                  Alert.alert(
                    'Sent',
                    'Sample sleep insight sent to notification tray.'
                  );
                } catch {
                  Alert.alert('Error', 'Failed to send sample notification.');
                }
              }}
            >
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>
                  Send Sample Sleep Insight (Debug)
                </Text>
                <Text style={styles.settingDescription}>
                  Triggers a preview notification without affecting frequency
                  caps
                </Text>
              </View>
              <Bell size={20} color={colors.neutral[700]} />
            </TouchableOpacity>
          </View>
        )}

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
                      authMethod === 'biometric'
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
                      authMethod === 'pin' ? colors.white : colors.neutral[600]
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
                      authMethod === 'both' ? colors.white : colors.neutral[600]
                    }
                  />
                }
              />
            </View>
          )}
        </View>

        <View style={styles.sectionHeader}>
          <RefreshCw size={24} color={colors.neutral[700]} />
          <Text style={styles.sectionTitle}>Reset</Text>
        </View>

        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingTitle}>
              Reset Profile & Restart Onboarding
            </Text>
            <Text style={styles.settingDescription}>
              Clears your local profile and avatar, then returns to the Welcome
              screen.
            </Text>
          </View>
          <TouchableOpacity
            onPress={handleResetProfile}
            disabled={loading}
            style={{
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.sm,
            }}
          >
            <Text style={{ color: '#DC2626', fontWeight: '700' }}>Reset</Text>
          </TouchableOpacity>
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
    marginBottom: spacing.lg,
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
    marginVertical: spacing.lg,
  },
  infoText: {
    fontSize: fontSize.sm,
    color: colors.neutral[600],
    lineHeight: 20,
    textAlign: 'center',
  },
});
