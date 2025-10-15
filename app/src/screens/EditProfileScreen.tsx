import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { BriefcaseBusiness, MapPinHouse, UserRound } from 'lucide-react-native';
import { Button, Input } from '../components/ui';
import { CommutePicker } from '../components/CommutePicker';
import { LocationQuestion } from '../components/LocationQuestion';
import { colors, spacing, fontSize, borderRadius } from '../theme';
import { localStorageService } from '../services/LocalStorageService';
import type { RootStackParamList } from '../navigation/types';
import type { UserProfile, UserLocationDetails } from '../models/User';

const DEFAULT_COMMUTE_MODE: UserProfile['commuteMode'] = 'wfh';

type EditableProfileFields = {
  weightKg: number | null;
  heightCm: number | null;
  homeLocation: UserLocationDetails | null;
  workLocation: UserLocationDetails | null;
  commuteMode: UserProfile['commuteMode'];
};

type NumericInputParseResult = {
  value: number | null;
  isValid: boolean;
};

const cloneLocationDetails = (
  location?: UserLocationDetails | null
): UserLocationDetails | null => {
  if (!location) {
    return null;
  }

  return {
    ...location,
    coordinates: {
      latitude: location.coordinates.latitude,
      longitude: location.coordinates.longitude,
    },
  };
};

const locationDetailsEqual = (
  a?: UserLocationDetails | null,
  b?: UserLocationDetails | null
): boolean => {
  if (!a && !b) {
    return true;
  }
  if (!a || !b) {
    return false;
  }

  if (
    a.coordinates.latitude !== b.coordinates.latitude ||
    a.coordinates.longitude !== b.coordinates.longitude
  ) {
    return false;
  }

  const fields: Array<keyof Omit<UserLocationDetails, 'coordinates'>> = [
    'label',
    'address',
    'city',
    'state',
    'country',
    'countryCode',
    'postcode',
  ];

  for (const field of fields) {
    if ((a[field] ?? null) !== (b[field] ?? null)) {
      return false;
    }
  }

  return true;
};

const parsePositiveNumberInput = (value: string): NumericInputParseResult => {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return { value: null, isValid: true };
  }

  const numeric = Number.parseFloat(trimmed);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return { value: null, isValid: false };
  }

  return { value: numeric, isValid: true };
};

const toDisplayString = (value: number | null): string =>
  value != null ? `${value}` : '';

const useUpdateProfileMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      weightKg: number | null;
      heightCm: number | null;
      homeLocation: UserLocationDetails | null;
      workLocation: UserLocationDetails | null;
      commuteMode: UserProfile['commuteMode'];
    }) => {
      const updated = await localStorageService.updateProfileDetails(payload);
      return updated;
    },
    onSuccess: updatedProfile => {
      if (updatedProfile) {
        queryClient.setQueryData(['userProfile'], updatedProfile);
      }
      queryClient.invalidateQueries({ queryKey: ['userProfile'] });
    },
  });
};

export default function EditProfileScreen() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [weightInput, setWeightInput] = useState('');
  const [heightInput, setHeightInput] = useState('');
  const [homeLocation, setHomeLocation] = useState<UserLocationDetails | null>(
    null
  );
  const [workLocation, setWorkLocation] = useState<UserLocationDetails | null>(
    null
  );
  const [commuteMode, setCommuteMode] =
    useState<UserProfile['commuteMode']>(DEFAULT_COMMUTE_MODE);
  const [originalProfileFields, setOriginalProfileFields] =
    useState<EditableProfileFields | null>(null);

  const loadProfile = useCallback(async () => {
    try {
      setLoading(true);
      const profile = await localStorageService.getUserProfile();

      if (profile) {
        const initialHome = cloneLocationDetails(profile.homeLocation);
        const initialWork = cloneLocationDetails(profile.workLocation);
        const initialFields: EditableProfileFields = {
          weightKg: profile.weightKg ?? null,
          heightCm: profile.heightCm ?? null,
          homeLocation: initialHome,
          workLocation: initialWork,
          commuteMode: profile.commuteMode ?? DEFAULT_COMMUTE_MODE,
        };

        setOriginalProfileFields(initialFields);
        setWeightInput(toDisplayString(initialFields.weightKg));
        setHeightInput(toDisplayString(initialFields.heightCm));
        setHomeLocation(initialHome);
        setWorkLocation(initialWork);
        setCommuteMode(initialFields.commuteMode);
      } else {
        setOriginalProfileFields({
          weightKg: null,
          heightCm: null,
          homeLocation: null,
          workLocation: null,
          commuteMode: DEFAULT_COMMUTE_MODE,
        });
        setWeightInput('');
        setHeightInput('');
        setHomeLocation(null);
        setWorkLocation(null);
        setCommuteMode(DEFAULT_COMMUTE_MODE);
      }
    } catch (error) {
      console.error('Failed to load profile:', error);
      Alert.alert('Error', 'Unable to load your profile. Please try again.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } finally {
      setLoading(false);
    }
  }, [navigation]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const updateProfileMutation = useUpdateProfileMutation();

  const weightParse = useMemo(
    () => parsePositiveNumberInput(weightInput),
    [weightInput]
  );
  const heightParse = useMemo(
    () => parsePositiveNumberInput(heightInput),
    [heightInput]
  );
  const hasValidationErrors = !weightParse.isValid || !heightParse.isValid;

  const hasProfileChanges = useMemo(() => {
    if (!originalProfileFields) {
      return false;
    }

    if (weightParse.value !== originalProfileFields.weightKg) {
      return true;
    }

    if (heightParse.value !== originalProfileFields.heightCm) {
      return true;
    }

    if (
      !locationDetailsEqual(homeLocation, originalProfileFields.homeLocation)
    ) {
      return true;
    }

    if (
      !locationDetailsEqual(workLocation, originalProfileFields.workLocation)
    ) {
      return true;
    }

    if (commuteMode !== originalProfileFields.commuteMode) {
      return true;
    }

    return false;
  }, [
    originalProfileFields,
    weightParse.value,
    heightParse.value,
    homeLocation,
    workLocation,
    commuteMode,
  ]);

  const handleSaveProfileDetails = async () => {
    if (loading || saving || !originalProfileFields) {
      return;
    }

    if (hasValidationErrors) {
      Alert.alert(
        'Invalid Details',
        'Please correct the highlighted fields before saving.'
      );
      return;
    }

    if (!hasProfileChanges) {
      navigation.goBack();
      return;
    }

    try {
      setSaving(true);
      const payloadHome = cloneLocationDetails(homeLocation);
      const payloadWork = cloneLocationDetails(workLocation);
      const updatedProfile = await updateProfileMutation.mutateAsync({
        weightKg: weightParse.value,
        heightCm: heightParse.value,
        homeLocation: payloadHome,
        workLocation: payloadWork,
        commuteMode,
      });

      if (updatedProfile) {
        const nextHome = cloneLocationDetails(updatedProfile.homeLocation);
        const nextWork = cloneLocationDetails(updatedProfile.workLocation);
        const nextFields: EditableProfileFields = {
          weightKg: updatedProfile.weightKg ?? null,
          heightCm: updatedProfile.heightCm ?? null,
          homeLocation: nextHome,
          workLocation: nextWork,
          commuteMode: updatedProfile.commuteMode ?? DEFAULT_COMMUTE_MODE,
        };

        setOriginalProfileFields(nextFields);
        setWeightInput(toDisplayString(nextFields.weightKg));
        setHeightInput(toDisplayString(nextFields.heightCm));
        setHomeLocation(nextHome);
        setWorkLocation(nextWork);
        setCommuteMode(nextFields.commuteMode);

        Alert.alert(
          'Profile Updated',
          'Your profile details have been saved.',
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack(),
            },
          ]
        );
      } else {
        Alert.alert(
          'Profile Updated',
          'Your profile details have been saved.',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      }
    } catch (error) {
      console.error('Failed to update profile details:', error);
      Alert.alert(
        'Error',
        'Failed to update your profile details. Please try again.'
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentInsetAdjustmentBehavior="automatic">
        <View style={styles.header}>
          <UserRound size={28} color={colors.neutral[700]} />
          <View style={styles.headerText}>
            <Text style={styles.title}>Edit Profile</Text>
            <Text style={styles.subtitle}>
              Update your measurements, locations, and commute preferences.
            </Text>
          </View>
        </View>

        <View style={styles.profileCard}>
          <View style={styles.profileGroup}>
            <Text style={styles.profileGroupLabel}>Body Measurements</Text>
            <Input
              label="Weight (kg)"
              placeholder="e.g. 70"
              keyboardType="decimal-pad"
              value={weightInput}
              onChangeText={setWeightInput}
              autoCapitalize="none"
              error={
                weightParse.isValid ? undefined : 'Enter a positive number'
              }
            />
            <Input
              label="Height (cm)"
              placeholder="e.g. 172"
              keyboardType="decimal-pad"
              value={heightInput}
              onChangeText={setHeightInput}
              autoCapitalize="none"
              error={
                heightParse.isValid ? undefined : 'Enter a positive number'
              }
            />
          </View>

          <View style={styles.profileDivider} />

          <View style={styles.profileGroup}>
            <LocationQuestion
              label="Home (optional)"
              description="Used to personalize weather, traffic, and local alerts."
              icon={MapPinHouse}
              value={homeLocation}
              onChange={value => setHomeLocation(cloneLocationDetails(value))}
            />
          </View>

          <View style={styles.profileGroup}>
            <LocationQuestion
              label="Work (optional)"
              description="Helps to compare your commute and daytime environment."
              icon={BriefcaseBusiness}
              value={workLocation}
              onChange={value => setWorkLocation(cloneLocationDetails(value))}
            />
          </View>

          <View style={styles.profileDivider} />

          <View style={styles.profileGroup}>
            <CommutePicker
              selectedValue={commuteMode}
              onValueChange={setCommuteMode}
            />
          </View>

          <Button
            fullWidth
            variant="secondary"
            onPress={handleSaveProfileDetails}
            disabled={saving || hasValidationErrors || !hasProfileChanges}
            style={styles.profileSaveButton}
          >
            {saving ? 'Saving…' : 'Save Profile'}
          </Button>
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
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    gap: spacing.md,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.black,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: fontSize.sm,
    color: colors.neutral[600],
    lineHeight: 20,
  },
  profileCard: {
    padding: spacing.lg,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.xxl,
    backgroundColor: colors.neutral[50],
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    gap: spacing.lg,
  },
  profileGroup: {
    gap: spacing.md,
  },
  profileGroupLabel: {
    fontSize: fontSize.base,
    fontWeight: '600',
    color: colors.black,
  },
  profileDivider: {
    height: 1,
    backgroundColor: colors.neutral[200],
    alignSelf: 'stretch',
  },
  profileSaveButton: {
    marginTop: spacing.sm,
  },
});
