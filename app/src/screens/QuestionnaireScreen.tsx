import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { BriefcaseBusiness, MapPin, MapPinHouse } from 'lucide-react-native';
import { Controller, useForm } from 'react-hook-form';
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

interface QuestionnaireFormValues {
  commuteMode: 'car' | 'transit' | 'wfh' | 'bike' | 'walk';
  sleepHours: number;
  gender: 'male' | 'female';
  skinTone: SkinTone;
  homeLocation: UserLocationDetails | null;
  workLocation: UserLocationDetails | null;
  weightKg: string;
  heightCm: string;
}

const QuestionnaireScreen: React.FC<QuestionnaireScreenProps> = ({
  route,
  navigation,
}) => {
  const { location } = route.params;
  const queryClient = useQueryClient();
  const [generalError, setGeneralError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<QuestionnaireFormValues>({
    defaultValues: {
      commuteMode: 'wfh',
      sleepHours: 8,
      gender: 'male',
      skinTone: 'medium',
      homeLocation: null,
      workLocation: null,
      weightKg: '',
      heightCm: '',
    },
  });

  const homeLocation = watch('homeLocation');

  const fallbackCoordinates = useMemo(() => {
    if (location) {
      return { latitude: location.latitude, longitude: location.longitude };
    }
    return { latitude: 3.139, longitude: 101.6869 };
  }, [location]);

  const copyHomeToWork = useCallback(() => {
    const currentHome = getValues('homeLocation');
    if (!currentHome) return;
    setValue(
      'workLocation',
      {
        ...currentHome,
        coordinates: { ...currentHome.coordinates },
      },
      { shouldDirty: true }
    );
  }, [getValues, setValue]);

  const onSubmit = useCallback(
    async (data: QuestionnaireFormValues) => {
      setGeneralError(null);

      const parsedWeight = Number.parseFloat(data.weightKg);
      const parsedHeight = Number.parseFloat(data.heightCm);

      const normalizedHome = data.homeLocation
        ? {
            ...data.homeLocation,
            coordinates: { ...data.homeLocation.coordinates },
          }
        : null;

      const normalizedWork = data.workLocation
        ? {
            ...data.workLocation,
            coordinates: { ...data.workLocation.coordinates },
          }
        : null;

      const primaryCoordinates =
        normalizedHome?.coordinates ?? fallbackCoordinates;

      // Calculate baseline hydration goal based on weight
      const baselineHydrationMl = calculateBaselineHydrationGoal(parsedWeight);

      const profile: UserProfile = {
        location: primaryCoordinates,
        commuteMode: data.commuteMode,
        sleepHours: data.sleepHours,
        gender: data.gender,
        skinTone: data.skinTone,
        createdAt: new Date().toISOString(),
        schemaVersion: 1,
        homeLocation: normalizedHome,
        workLocation: normalizedWork,
        weightKg: parsedWeight,
        heightCm: parsedHeight,
        idealSleepHours: data.sleepHours,
        hydrationBaselineMl: baselineHydrationMl,
        hydrationGoalMl: baselineHydrationMl,
      };

      try {
        await localStorageService.saveUserProfile(profile);

        queryClient.setQueryData(['userProfile'], profile);
        queryClient.invalidateQueries({
          queryKey: ['userProfile'],
          exact: true,
        });

        navigation.navigate('GeneratingTwin');
      } catch (error) {
        console.error('Failed to save onboarding profile', error);
        setGeneralError(
          error instanceof Error
            ? error.message
            : 'Unable to save your profile. Please try again.'
        );
      }
    },
    [fallbackCoordinates, navigation, queryClient]
  );

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
            <Controller
              control={control}
              name="gender"
              render={({ field: { value, onChange } }) => (
                <GenderPicker selectedValue={value} onValueChange={onChange} />
              )}
            />
            <View style={styles.separator} />

            <Text style={styles.label}>Body Measurements</Text>
            <View style={styles.inputStack}>
              <Controller
                control={control}
                name="weightKg"
                rules={{
                  required: 'Enter your weight in kilograms.',
                  validate: value => {
                    const parsed = Number.parseFloat(value);
                    if (!Number.isFinite(parsed) || parsed <= 0) {
                      return 'Enter a valid weight in kilograms.';
                    }
                    return true;
                  },
                }}
                render={({ field: { value, onChange } }) => (
                  <Input
                    label="Weight (kg)"
                    keyboardType="decimal-pad"
                    value={value}
                    onChangeText={text => onChange(text)}
                    placeholder="e.g. 68"
                    error={errors.weightKg?.message}
                  />
                )}
              />

              <View style={styles.smallSeparator} />

              <Controller
                control={control}
                name="heightCm"
                rules={{
                  required: 'Enter your height in centimeters.',
                  validate: value => {
                    const parsed = Number.parseFloat(value);
                    if (!Number.isFinite(parsed) || parsed <= 0) {
                      return 'Enter a valid height in centimeters.';
                    }
                    return true;
                  },
                }}
                render={({ field: { value, onChange } }) => (
                  <Input
                    label="Height (cm)"
                    keyboardType="decimal-pad"
                    value={value}
                    onChangeText={text => onChange(text)}
                    placeholder="e.g. 172"
                    error={errors.heightCm?.message}
                  />
                )}
              />
            </View>
            <View style={styles.separator} />
            <Controller
              control={control}
              name="skinTone"
              render={({ field: { value, onChange } }) => (
                <SkinTonePicker
                  selectedValue={value}
                  onValueChange={onChange}
                />
              )}
            />
            <View style={styles.separator} />
            <Controller
              control={control}
              name="commuteMode"
              render={({ field: { value, onChange } }) => (
                <CommutePicker selectedValue={value} onValueChange={onChange} />
              )}
            />
            <View style={styles.separator} />
            <Controller
              control={control}
              name="sleepHours"
              render={({ field: { value, onChange } }) => (
                <SleepSlider value={value} onValueChange={onChange} />
              )}
            />
          </Card>

          <Card style={styles.formCard}>
            <Text style={styles.label}>Location</Text>
            <Controller
              control={control}
              name="homeLocation"
              render={({ field: { value, onChange } }) => (
                <LocationQuestion
                  label="Home (optional)"
                  description="Used to personalize weather, traffic, and local alerts."
                  icon={MapPinHouse}
                  value={value}
                  onChange={onChange}
                />
              )}
            />

            <View style={styles.separator} />

            <Controller
              control={control}
              name="workLocation"
              render={({ field: { value, onChange } }) => (
                <LocationQuestion
                  label="Work (optional)"
                  description="Helps to compare your commute and daytime environment."
                  icon={BriefcaseBusiness}
                  value={value}
                  onChange={onChange}
                />
              )}
            />

            {homeLocation ? (
              <Button
                size="sm"
                variant="outline"
                onPress={copyHomeToWork}
                style={styles.copyButton}
              >
                Copy home location to work
              </Button>
            ) : null}
          </Card>

          {generalError ? (
            <Text style={styles.errorText}>{generalError}</Text>
          ) : null}

          <View style={styles.buttonContainer}>
            <Button
              fullWidth
              variant="secondary"
              size="lg"
              onPress={handleSubmit(onSubmit)}
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
  label: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.black,
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
  },
  smallSeparator: {
    height: spacing.md,
  },
  inputStack: {
    gap: spacing.xs,
  },
  copyButton: {
    alignSelf: 'flex-start',
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
