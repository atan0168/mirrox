import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, Animated } from 'react-native';
import { Loader2, CheckCircle, Clock } from 'lucide-react-native';
import { colors, spacing, fontSize, borderRadius } from '../theme';

interface GeneratingTwinScreenProps {
  navigation: any;
}

const GeneratingTwinScreen: React.FC<GeneratingTwinScreenProps> = ({ navigation }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [fadeAnim] = useState(new Animated.Value(0));

  const steps = [
    { text: 'Processing your location', delay: 1000 },
    { text: 'Fetching environmental data', delay: 1500 },
    { text: 'Generating your avatar', delay: 2000 },
  ];

  useEffect(() => {
    // Fade in animation
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();

    // Step progression
    steps.forEach((_, index) => {
      setTimeout(() => {
        setCurrentStep(index + 1);
      }, steps[index].delay);
    });

    // Navigate after all steps
    const timer = setTimeout(() => {
      navigation.replace('AvatarCreation');
    }, 4000);

    return () => clearTimeout(timer);
  }, [navigation]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
          {/* Loading Icon */}
          <View style={styles.iconContainer}>
            <View style={styles.spinnerWrapper}>
              <Loader2 size={48} color={colors.neutral[600]} />
            </View>
          </View>

          {/* Title */}
          <Text style={styles.title}>Creating Your Digital Twin</Text>
          <Text style={styles.subtitle}>
            Analyzing your environment and personalizing your experience...
          </Text>

          {/* Steps */}
          <View style={styles.stepContainer}>
            {steps.map((step, index) => (
              <View key={index} style={styles.stepRow}>
                <View style={styles.stepIcon}>
                  {currentStep > index ? (
                    <CheckCircle size={20} color={colors.neutral[700]} fill={colors.neutral[200]} />
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
                  {step.text}
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
