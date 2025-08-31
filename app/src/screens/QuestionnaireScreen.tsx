import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView } from 'react-native';
import { MapPin } from 'lucide-react-native';
import { CommutePicker } from '../components/CommutePicker';
import { SleepSlider } from '../components/SleepSlider';
import { GenderPicker } from '../components/GenderPicker';
import { SkinTonePicker, SkinTone } from '../components/SkinTonePicker';
import { Button, Card } from '../components/ui';
import { localStorageService } from '../services/LocalStorageService';
import { useQueryClient } from '@tanstack/react-query';
import { UserProfile } from '../models/User';
import { colors, spacing, fontSize, borderRadius } from '../theme';

interface QuestionnaireScreenProps {
  route: {
    params: {
      location: { latitude: number; longitude: number } | null;
    };
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  navigation: any;
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
  const [sleepHours, setSleepHours] = useState<number>(7);
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [skinTone, setSkinTone] = useState<SkinTone>('medium');

  const handleCompleteOnboarding = async () => {
    // If no location was provided, use a default location (you could show a city picker here)
    const profileLocation = location || {
      latitude: 3.139, // Kuala Lumpur default
      longitude: 101.6869,
    };

    const profile: UserProfile = {
      location: profileLocation,
      commuteMode,
      sleepHours,
      gender,
      skinTone,
      createdAt: new Date().toISOString(),
      schemaVersion: 1,
    };

  // Persist the updated profile BEFORE navigating so GeneratingTwin uses fresh data
  await localStorageService.saveUserProfile(profile);

  // Optimistically update / replace cached query data so next screen has latest immediately
  queryClient.setQueryData(['userProfile'], profile);

  // Invalidate to force a refetch later (keeps data fresh if storage changes elsewhere)
  queryClient.invalidateQueries({ queryKey: ['userProfile'], exact: true });

  // Navigate only after profile is stored & cache updated
  navigation.navigate('GeneratingTwin');
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
            <SleepSlider value={sleepHours} onValueChange={setSleepHours} />
          </Card>

          <View style={styles.buttonContainer}>
            <Button
              fullWidth
              variant="secondary"
              size="lg"
              onPress={handleCompleteOnboarding}
            >
              Create My Twin
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
  },
  separator: {
    height: 1,
    backgroundColor: colors.neutral[200],
    marginVertical: spacing.lg,
  },
  buttonContainer: {
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
  },
});

export default QuestionnaireScreen;
