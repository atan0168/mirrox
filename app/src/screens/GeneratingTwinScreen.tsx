import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Animated,
  Alert,
} from 'react-native';
import { CheckCircle, Clock } from 'lucide-react-native';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, fontSize, borderRadius } from '../theme';
import Loader from '../components/ui/Loader';
import { useUserProfile } from '../hooks/useUserProfile';
import { readyPlayerMeApiService } from '../services/ReadyPlayerMeApiService';
import { localStorageService } from '../services/LocalStorageService';

interface GeneratingTwinScreenProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  navigation: any;
}

const GeneratingTwinScreen: React.FC<GeneratingTwinScreenProps> = ({
  navigation,
}) => {
  const { data: userProfile } = useUserProfile();
  const [currentStep, setCurrentStep] = useState(0);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [isCreatingAvatar, setIsCreatingAvatar] = useState(false);
  const isCreatingRef = useRef(false); // Prevent multiple concurrent avatar creations

  const steps = [
    { text: 'Processing your location', delay: 1000 },
    { text: 'Fetching environmental data', delay: 1500 },
    { text: 'Generating your avatar', delay: 2000 },
    { text: 'Finalizing your digital twin', delay: 500 },
  ];

  const createAvatarAutomatically = async () => {
    if (!userProfile) {
      Alert.alert(
        'Error',
        'User profile not found. Please complete the setup first.'
      );
      navigation.goBack();
      return;
    }

    // Prevent multiple concurrent avatar creations
    if (isCreatingRef.current) {
      console.log('Avatar creation already in progress, skipping...');
      return;
    }

    isCreatingRef.current = true;
    setIsCreatingAvatar(true);

    try {
      console.log('Creating new avatar for updated user profile:', userProfile);

      // Always create a new avatar (don't check for existing one)
      // This ensures avatar reflects current profile choices
      const avatarUrl =
        await readyPlayerMeApiService.createAvatarForUser(userProfile);

      // Save the new avatar URL (will overwrite any existing one)
      await localStorageService.saveAvatarUrl(avatarUrl);

      console.log('New avatar created successfully:', avatarUrl);

      // Navigate to main tabs
      navigation.replace('MainTabs');
    } catch (error) {
      console.error('Error creating avatar:', error);
      Alert.alert(
        'Avatar Creation Failed',
        'We encountered an issue creating your avatar. You can try again later from the settings.',
        [
          {
            text: 'Continue Anyway',
            onPress: () => navigation.replace('MainTabs'),
          },
          {
            text: 'Retry',
            onPress: createAvatarAutomatically,
          },
        ]
      );
    } finally {
      setIsCreatingAvatar(false);
      isCreatingRef.current = false;
    }
  };

  // Use navigation focus lifecycle so we can reset BEFORE leaving, preventing stale completed state flash
  useFocusEffect(
    useCallback(() => {
      // When screen gains focus, start fresh animations & timers
      setCurrentStep(0);
      fadeAnim.setValue(0);

      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }).start();

      const stepTimers: NodeJS.Timeout[] = [];

      const initialTimer = setTimeout(() => {
        steps.forEach((_, index) => {
          const timer = setTimeout(() => {
            // currentStep represents count of completed steps
            setCurrentStep(index + 1);
          }, steps[index].delay);
          stepTimers.push(timer);
        });
      }, 100);

      const avatarCreationTimer = setTimeout(() => {
        createAvatarAutomatically();
      }, 4200);

      return () => {
        // Runs on blur: clear timers & reset so no flash of completed steps on next focus
        clearTimeout(initialTimer);
        clearTimeout(avatarCreationTimer);
        stepTimers.forEach(clearTimeout);
        isCreatingRef.current = false;
        setIsCreatingAvatar(false);
        setCurrentStep(0); // Pre-reset before next focus to avoid flash
      };
    }, [userProfile])
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
          {/* Loading Icon */}
          <View style={styles.iconContainer}>
            <View style={styles.spinnerWrapper}>
              <Loader />
            </View>
          </View>

          {/* Title */}
          <Text style={styles.title}>Creating Your Digital Twin</Text>
          <Text style={styles.subtitle}>
            {isCreatingAvatar
              ? 'Customizing your avatar based on your preferences...'
              : 'Analyzing your environment and personalizing your experience...'}
          </Text>

          {/* Steps */}
          <View style={styles.stepContainer}>
            {steps.map((step, index) => (
              <View key={index} style={styles.stepRow}>
                <View style={styles.stepIcon}>
                  {currentStep > index ? (
                    <CheckCircle
                      size={20}
                      color={colors.neutral[700]}
                      fill={colors.neutral[200]}
                    />
                  ) : currentStep === index ? (
                    <Clock size={20} color={colors.neutral[500]} />
                  ) : (
                    <View style={styles.pendingIcon} />
                  )}
                </View>
                <Text
                  style={[
                    styles.stepText,
                    currentStep > index && styles.completedStepText,
                    currentStep === index && styles.activeStepText,
                  ]}
                >
                  {isCreatingAvatar && index === 2
                    ? 'Creating your personalized avatar...'
                    : step.text}
                </Text>
              </View>
            ))}
          </View>
        </Animated.View>
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
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  content: {
    alignItems: 'center',
    width: '100%',
  },
  iconContainer: {
    marginBottom: spacing.xxxl,
  },
  spinnerWrapper: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.full,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: fontSize.xxxl,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: spacing.md,
    color: colors.black,
  },
  subtitle: {
    fontSize: fontSize.base,
    textAlign: 'center',
    marginBottom: spacing.xxxl,
    color: colors.neutral[600],
    lineHeight: 24,
    paddingHorizontal: spacing.md,
  },
  stepContainer: {
    alignItems: 'flex-start',
    width: '100%',
    maxWidth: 280,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  stepIcon: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  pendingIcon: {
    width: 20,
    height: 20,
    borderRadius: borderRadius.full,
    backgroundColor: colors.neutral[200],
    borderWidth: 2,
    borderColor: colors.neutral[300],
  },
  stepText: {
    fontSize: fontSize.base,
    color: colors.neutral[500],
    flex: 1,
    fontWeight: '500',
  },
  completedStepText: {
    color: colors.neutral[700],
    fontWeight: '600',
  },
  activeStepText: {
    color: colors.black,
    fontWeight: '600',
  },
});

export default GeneratingTwinScreen;
