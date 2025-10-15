import React, { useState } from 'react';
import {
  Alert,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StackNavigationProp } from '@react-navigation/stack';
import { Button } from '../components/ui';
import { borderRadius, colors, fontSize, spacing } from '../theme';
import { useHealthData } from '../hooks/useHealthData';
import type { RootStackParamList } from '../navigation/types';

type HealthPermissionScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'HealthPermission'
>;

interface HealthPermissionScreenProps {
  navigation: HealthPermissionScreenNavigationProp;
  route: {
    params?: {
      location?: {
        latitude: number;
        longitude: number;
        city?: string;
        state?: string;
      } | null;
    };
  };
}

const HealthPermissionScreen: React.FC<HealthPermissionScreenProps> = ({
  navigation,
  route,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const { requestPermissions, refresh } = useHealthData({ autoSync: false });

  const handleAllowHealth = async () => {
    setIsLoading(true);
    try {
      const granted = await requestPermissions();
      if (!granted) {
        Alert.alert(
          'Permission Denied',
          'Health access lets us personalize your avatar with steps and sleep. You can proceed without it and enable later in Settings.',
          [{ text: 'OK', onPress: () => goNext() }]
        );
        return;
      }
      await refresh();
      goNext();
    } catch (error) {
      console.error('Health permission error:', error);
      Alert.alert(
        'Health Error',
        'Could not access health data. You can enable later in Settings.',
        [{ text: 'OK', onPress: () => goNext() }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  const goNext = () => {
    navigation.navigate('Questionnaire', {
      location: route.params?.location ?? null,
    });
  };

  const handleSkip = () => goNext();
  const handleClose = () => navigation.goBack();

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
                name="fitness-outline"
                size={48}
                color={colors.neutral[600]}
              />
            </View>
          </View>

          <Text style={styles.title}>Connect your health data</Text>
          <View style={styles.benefitsList}>
            <View style={styles.benefitItem}>
              <Ionicons
                name="walk-outline"
                size={20}
                color={colors.neutral[600]}
                style={styles.benefitIcon}
              />
              <View style={styles.benefitTextContainer}>
                <Text style={styles.benefitTitle}>Steps insight</Text>
                <Text style={styles.benefitDescription}>
                  See your daily steps reflected in your avatar
                </Text>
              </View>
            </View>
            <View style={styles.benefitItem}>
              <Ionicons
                name="moon-outline"
                size={20}
                color={colors.neutral[600]}
                style={styles.benefitIcon}
              />
              <View style={styles.benefitTextContainer}>
                <Text style={styles.benefitTitle}>Sleep-aware visuals</Text>
                <Text style={styles.benefitDescription}>
                  Sleep impacts energy and subtle avatar effects
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
                <Text style={styles.benefitTitle}>Private by design</Text>
                <Text style={styles.benefitDescription}>
                  Health data stays on device, encrypted at rest
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
            onPress={handleAllowHealth}
          >
            {isLoading ? 'Connecting…' : 'Allow Health Access'}
          </Button>
          <Button
            fullWidth
            variant="outline"
            size="lg"
            onPress={handleSkip}
            style={styles.manualButton}
          >
            Not now
          </Button>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.white },
  container: { flex: 1, padding: spacing.lg },
  closeButton: { alignSelf: 'flex-end', padding: spacing.sm },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
  },
  iconContainer: { marginBottom: spacing.xl },
  iconWrapper: {
    width: 120,
    height: 120,
    borderRadius: borderRadius.full,
    backgroundColor: colors.neutral[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: spacing.xl,
    color: colors.black,
    lineHeight: 28,
  },
  benefitsList: { width: '100%', gap: spacing.lg },
  benefitItem: { flexDirection: 'row', alignItems: 'flex-start' },
  benefitIcon: { marginTop: 2, marginRight: spacing.md },
  benefitTextContainer: { flex: 1 },
  benefitTitle: {
    fontSize: fontSize.base,
    fontWeight: '500',
    color: colors.black,
    marginBottom: spacing.xs,
  },
  benefitDescription: {
    fontSize: fontSize.sm,
    color: colors.neutral[600],
    lineHeight: 20,
  },
  buttonContainer: { gap: spacing.md, paddingBottom: spacing.lg },
  manualButton: { marginTop: spacing.sm },
});

export default HealthPermissionScreen;
