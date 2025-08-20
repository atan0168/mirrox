import React, { useState, useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, ScrollView, Alert } from 'react-native';
import { localStorageService } from '../services/LocalStorageService';
import { apiService } from '../services/ApiService';
import Avatar from '../components/Avatar';
import { UserProfile } from '../models/User';
import { AirQualityData } from '../models/AirQuality';
import { AvatarProps } from '../models/Avatar';

const DashboardScreen: React.FC = () => {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [airQuality, setAirQuality] = useState<AirQualityData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initializeDashboard = async () => {
      try {
        const profile = localStorageService.getUserProfile();
        if (!profile) {
          throw new Error("User profile not found.");
        }
        setUserProfile(profile);

        // For now, we'll mock the air quality data since we don't have a backend yet
        // You can uncomment the next lines when your backend is ready
        /*
        const aqData = await apiService.fetchAirQuality(
          profile.location.latitude,
          profile.location.longitude
        );
        setAirQuality(aqData);
        */

        // Mock air quality data for demo
        const mockAirQuality: AirQualityData = {
          aqi: Math.floor(Math.random() * 150) + 20, // Random AQI between 20-170
          primaryPollutant: 'PM2.5',
          stationName: 'Kuala Lumpur Station',
        };
        setAirQuality(mockAirQuality);

      } catch (err) {
        setError(err instanceof Error ? err.message : "An unexpected error occurred.");
      } finally {
        setIsLoading(false);
      }
    };

    initializeDashboard();
  }, []);

  const generateHealthVitalsMessage = (): string => {
    if (!airQuality) return "Analyzing your environment...";
    
    if (airQuality.aqi > 100) {
      return `Your twin's lungs are starting with a major debuff due to poor air quality (${airQuality.aqi}) in your area. The main pollutant is ${airQuality.primaryPollutant}.`;
    }
    if (airQuality.aqi > 50) {
      return `Your twin's lungs are starting with a slight debuff due to today's air quality (${airQuality.aqi}) in your area.`;
    }
    return `Your twin is breathing clean air today! The air quality in your area is good (${airQuality.aqi}).`;
  };

  const getAvatarProps = (): AvatarProps => {
    // Logic to derive avatar parts from user profile
    const eyes = userProfile && userProfile.sleepHours < 6 ? 'tired' : 'happy';
    return {
      head: 'oval',
      eyes: eyes,
      body: 'default',
    };
  };

  const getSleepMessage = (): string => {
    if (!userProfile) return "";
    
    if (userProfile.sleepHours < 6) {
      return `Your twin looks tired because you only got ${userProfile.sleepHours} hours of sleep. Consider getting more rest!`;
    }
    if (userProfile.sleepHours >= 8) {
      return `Your twin is well-rested with ${userProfile.sleepHours} hours of sleep. Great job!`;
    }
    return `Your twin got ${userProfile.sleepHours} hours of sleep. Not bad, but could be better!`;
  };

  const getCommuteMessage = (): string => {
    if (!userProfile) return "";
    
    const commuteMessages = {
      car: "Your twin drives to work. Consider eco-friendly alternatives!",
      transit: "Your twin uses public transport. Great for the environment!",
      wfh: "Your twin works from home. No commute stress!",
      bike: "Your twin bikes to work. Excellent for health and environment!",
      walk: "Your twin walks to work. Perfect for health and the planet!",
    };
    
    return commuteMessages[userProfile.commuteMode];
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3182CE" />
        <Text style={styles.loadingText}>Loading your digital twin...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Error: {error}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Your Digital Twin</Text>
        
        <View style={styles.avatarContainer}>
          <Avatar {...getAvatarProps()} />
        </View>

        <View style={styles.vitalsContainer}>
          <Text style={styles.sectionTitle}>Health Vitals</Text>
          
          <View style={styles.vitalCard}>
            <Text style={styles.vitalTitle}>🫁 Air Quality Impact</Text>
            <Text style={styles.vitalDescription}>{generateHealthVitalsMessage()}</Text>
          </View>

          <View style={styles.vitalCard}>
            <Text style={styles.vitalTitle}>😴 Sleep Status</Text>
            <Text style={styles.vitalDescription}>{getSleepMessage()}</Text>
          </View>

          <View style={styles.vitalCard}>
            <Text style={styles.vitalTitle}>🚶 Commute Impact</Text>
            <Text style={styles.vitalDescription}>{getCommuteMessage()}</Text>
          </View>
        </View>

        {airQuality && (
          <View style={styles.statsContainer}>
            <Text style={styles.sectionTitle}>Environmental Data</Text>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Air Quality Index:</Text>
              <Text style={[styles.statValue, { color: airQuality.aqi > 100 ? '#E53E3E' : airQuality.aqi > 50 ? '#D69E2E' : '#38A169' }]}>
                {airQuality.aqi}
              </Text>
            </View>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Primary Pollutant:</Text>
              <Text style={styles.statValue}>{airQuality.primaryPollutant}</Text>
            </View>
          </View>
        )}
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
    paddingTop: 60,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#4A5568',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#E53E3E',
    textAlign: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 30,
    color: '#2D3748',
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 30,
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  vitalsContainer: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#2D3748',
  },
  vitalCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  vitalTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#2D3748',
  },
  vitalDescription: {
    fontSize: 14,
    color: '#4A5568',
    lineHeight: 20,
  },
  statsContainer: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 14,
    color: '#4A5568',
  },
  statValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2D3748',
  },
});

export default DashboardScreen;
