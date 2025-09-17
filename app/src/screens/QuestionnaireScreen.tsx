import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { MapPin } from 'lucide-react-native';
import { CommutePicker } from '../components/CommutePicker';
import { SleepSlider } from '../components/SleepSlider';
import { GenderPicker } from '../components/GenderPicker';
import { SkinTonePicker, SkinTone } from '../components/SkinTonePicker';
import { Button, Card, Input } from '../components/ui';
import { LocationQuestion } from '../components/LocationQuestion';
import { localStorageService } from '../services/LocalStorageService';
import { useQueryClient } from '@tanstack/react-query';
import { UserLocationDetails, UserProfile } from '../models/User';
import { colors, spacing, fontSize, borderRadius } from '../theme';
import { calculateBaselineHydrationGoal } from '../utils/hydrationUtils';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../App';

interface QuestionnaireScreenProps {
  route: {
    params: {
      location: { latitude: number; longitude: number } | null;
    };
  };
  navigation: StackNavigationProp<RootStackParamList, 'Questionnaire'>;
}

const QuestionnaireScreen: React.FC<QuestionnaireScreenProps> = ({
  route,
  navigation,
}) => {
  const { location } = route.params;
  const queryClient = useQueryClient();
  const [commuteMode, setCommuteMode] = useState<
    'car' | 'transit' | 'wfh' | 'bike' | 'walk'
  >('wfh');
  const [sleepTarget, setSleepTarget] = useState<number>(8);
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [skinTone, setSkinTone] = useState<SkinTone>('medium');
  const [homeLocation, setHomeLocation] = useState<UserLocationDetails | null>(
    null
  );
  const [workLocation, setWorkLocation] = useState<UserLocationDetails | null>(
    null
  );
  const [weightKg, setWeightKg] = useState('');
  const [heightCm, setHeightCm] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const defaultCoordinates = useMemo(() => {
    if (!location) return null;
    return { latitude: location.latitude, longitude: location.longitude };
  }, [location]);

  const handleCompleteOnboarding = async () => {
    if (isSubmitting) return;
    setFormError(null);

    const parsedWeight = Number.parseFloat(weightKg);
    const parsedHeight = Number.parseFloat(heightCm);

    if (!homeLocation) {
      setFormError('Please confirm your home location.');
      return;
    }

    if (!Number.isFinite(parsedWeight) || parsedWeight <= 0) {
      setFormError('Enter a valid weight in kilograms.');
      return;
    }

    if (!Number.isFinite(parsedHeight) || parsedHeight <= 0) {
      setFormError('Enter a valid height in centimeters.');
      return;
    }

    setIsSubmitting(true);
    // If no location was provided, use a default location (you could show a city picker here)
    const profileLocation = location || {
      latitude: 3.139, // Kuala Lumpur default
      longitude: 101.6869,
    };

    const fallbackCoordinates = {
      latitude: profileLocation.latitude,
      longitude: profileLocation.longitude,
    };

    const homeCoordinates = homeLocation?.coordinates ?? fallbackCoordinates;
    const normalizedHome: UserLocationDetails = homeLocation ?? {
      coordinates: homeCoordinates,
      label: `${homeCoordinates.latitude.toFixed(3)}, ${homeCoordinates.longitude.toFixed(3)}`,
      address: null,
      city: null,
      state: null,
      country: null,
      countryCode: null,
      postcode: null,
    };

    const normalizedWork = workLocation
      ? {
          ...workLocation,
          coordinates: { ...workLocation.coordinates },
        }
      : null;

    // Calculate baseline hydration goal based on weight
    const baselineHydrationMl = calculateBaselineHydrationGoal(parsedWeight);

    const profile: UserProfile = {
      location: homeCoordinates,
      commuteMode,
      sleepHours: sleepTarget,
      gender,
      skinTone,
      createdAt: new Date().toISOString(),
      schemaVersion: 1,
      homeLocation: normalizedHome,
      workLocation: normalizedWork,
      weightKg: parsedWeight,
      heightCm: parsedHeight,
      idealSleepHours: sleepTarget,
      hydrationBaselineMl: baselineHydrationMl,
      hydrationGoalMl: baselineHydrationMl,
    };

    // Persist the updated profile BEFORE navigating so GeneratingTwin uses fresh data
    try {
      await localStorageService.saveUserProfile(profile);

      // Optimistically update / replace cached query data so next screen has latest immediately
      queryClient.setQueryData(['userProfile'], profile);

      // Invalidate to force a refetch later (keeps data fresh if storage changes elsewhere)
      queryClient.invalidateQueries({
        queryKey: ['userProfile'],
        exact: true,
      });

      // Navigate only after profile is stored & cache updated
      navigation.navigate('GeneratingTwin');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container}>
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>Tell us about yourself</Text>
            <Text style={styles.subtitle}>
              This helps us create your personalized digital twin
            </Text>
          </View>

          {!location && (
            <Card variant="outline" style={styles.locationNotice}>
              <View style={styles.locationNoticeContent}>
                <View style={styles.locationIcon}>
                  <MapPin size={16} color={colors.neutral[600]} />
                </View>
                <Text style={styles.locationNoticeText}>
                  Using Kuala Lumpur as your default location
                </Text>
              </View>
            </Card>
          )}

          <Card style={styles.formCard}>
            <LocationQuestion
              label="Where is your home base?"
              description="We use this to personalize weather, traffic, and local alerts."
              value={homeLocation}
              onChange={setHomeLocation}
              defaultCoordinates={defaultCoordinates}
            />
          </Card>

          <Card style={styles.formCard}>
            <LocationQuestion
              label="Where do you usually work?"
              description="Helps us compare your commute and daytime environment."
              value={workLocation}
              onChange={setWorkLocation}
              allowCopyFrom={homeLocation}
              onCopyRequested={() =>
                setWorkLocation(prev => {
                  if (!homeLocation) return prev;
                  return {
                    ...homeLocation,
                    coordinates: { ...homeLocation.coordinates },
                  };
                })
              }
            />
          </Card>

          <Card style={styles.formCard}>
            <View style={styles.inputStack}>
              <Input
                label="Weight (kg)"
                keyboardType="decimal-pad"
                value={weightKg}
                onChangeText={text => {
                  setWeightKg(text);
                  setFormError(null);
                }}
                placeholder="e.g. 68"
              />
              <View style={styles.smallSeparator} />
              <Input
                label="Height (cm)"
                keyboardType="decimal-pad"
                value={heightCm}
                onChangeText={text => {
                  setHeightCm(text);
                  setFormError(null);
                }}
                placeholder="e.g. 172"
              />
            </View>
          </Card>

          <Card style={styles.formCard}>
            <GenderPicker selectedValue={gender} onValueChange={setGender} />
            <View style={styles.separator} />
            <SkinTonePicker
              selectedValue={skinTone}
              onValueChange={setSkinTone}
            />
            <View style={styles.separator} />
            <CommutePicker
              selectedValue={commuteMode}
              onValueChange={setCommuteMode}
            />
            <View style={styles.separator} />
            <SleepSlider value={sleepTarget} onValueChange={setSleepTarget} />
          </Card>

          {formError ? <Text style={styles.errorText}>{formError}</Text> : null}

          <View style={styles.buttonContainer}>
            <Button
              fullWidth
              variant="secondary"
              size="lg"
              onPress={handleCompleteOnboarding}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <View style={styles.buttonSpinner}>
                  <ActivityIndicator size="small" color={colors.neutral[200]} />
                  <Text style={styles.buttonSpinnerText}>Saving…</Text>
                </View>
              ) : (
                'Create My Twin'
              )}
            </Button>
          </View>
        </View>
      </ScrollView>
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
  },
  content: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: fontSize.xxxl,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: spacing.xs,
    color: colors.black,
  },
  subtitle: {
    fontSize: fontSize.base,
    textAlign: 'center',
    color: colors.neutral[600],
    lineHeight: 24,
  },
  locationNotice: {
    padding: spacing.md,
  },
  locationNoticeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  locationIcon: {
    width: 24,
    height: 24,
    borderRadius: borderRadius.full,
    backgroundColor: colors.neutral[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationNoticeText: {
    color: colors.neutral[700],
    fontSize: fontSize.sm,
    fontWeight: '500',
  },
  formCard: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  separator: {
    height: 1,
    backgroundColor: colors.neutral[200],
    marginVertical: spacing.lg,
  },
  smallSeparator: {
    height: spacing.md,
  },
  inputStack: {
    gap: spacing.lg,
  },
  buttonContainer: {
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
  },
  errorText: {
    color: colors.red[600],
    fontSize: fontSize.sm,
    fontWeight: '500',
    textAlign: 'center',
  },
  buttonSpinner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  buttonSpinnerText: {
    color: colors.neutral[200],
    fontWeight: '600',
    fontSize: fontSize.base,
  },
});

export default QuestionnaireScreen;
