import React, { useState } from 'react';
import { View, Text, Button, StyleSheet, ScrollView } from 'react-native';
import { CommutePicker } from '../components/CommutePicker';
import { SleepSlider } from '../components/SleepSlider';
import { localStorageService } from '../services/LocalStorageService';
import { UserProfile } from '../models/User';

interface QuestionnaireScreenProps {
  route: {
    params: {
      location: { latitude: number; longitude: number } | null;
    };
  };
  navigation: any;
}

const QuestionnaireScreen: React.FC<QuestionnaireScreenProps> = ({ route, navigation }) => {
  const { location } = route.params;
  const [commuteMode, setCommuteMode] = useState<'car' | 'transit' | 'wfh' | 'bike' | 'walk'>('wfh');
  const [sleepHours, setSleepHours] = useState<number>(7);

  const handleCompleteOnboarding = () => {
    // If no location was provided, use a default location (you could show a city picker here)
    const profileLocation = location || {
      latitude: 3.1390, // Kuala Lumpur default
      longitude: 101.6869,
    };

    const profile: UserProfile = {
      location: profileLocation,
      commuteMode,
      sleepHours,
      createdAt: new Date().toISOString(),
      schemaVersion: 1,
    };

    (async () => {
      await localStorageService.saveUserProfile(profile);
    })();

    // Navigate to a temporary loading screen while we fetch API data
    navigation.navigate('GeneratingTwin');
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Tell us about yourself</Text>
        <Text style={styles.subtitle}>
          This helps us create your personalized digital twin
        </Text>

        {!location && (
          <View style={styles.locationNotice}>
            <Text style={styles.locationNoticeText}>
              📍 Using Kuala Lumpur as your default location
            </Text>
          </View>
        )}

        <CommutePicker selectedValue={commuteMode} onValueChange={setCommuteMode} />
        <SleepSlider value={sleepHours} onValueChange={setSleepHours} />

        <View style={styles.buttonContainer}>
          <Button title="Create My Twin" onPress={handleCompleteOnboarding} />
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 20,
    paddingTop: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
    color: '#2D3748',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
    color: '#4A5568',
    lineHeight: 24,
  },
  locationNotice: {
    backgroundColor: '#FFF3CD',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#FFEAA7',
  },
  locationNoticeText: {
    textAlign: 'center',
    color: '#856404',
    fontSize: 14,
  },
  buttonContainer: {
    marginTop: 40,
    marginBottom: 20,
  },
});

export default QuestionnaireScreen;
