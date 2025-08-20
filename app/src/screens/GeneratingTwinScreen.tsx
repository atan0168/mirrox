import React, { useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';

interface GeneratingTwinScreenProps {
  navigation: any;
}

const GeneratingTwinScreen: React.FC<GeneratingTwinScreenProps> = ({ navigation }) => {
  useEffect(() => {
    // Simulate some processing time, then navigate to dashboard
    const timer = setTimeout(() => {
      navigation.replace('Dashboard');
    }, 3000);

    return () => clearTimeout(timer);
  }, [navigation]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#3182CE" style={styles.spinner} />
      <Text style={styles.title}>Creating Your Digital Twin</Text>
      <Text style={styles.subtitle}>
        Analyzing your environment and personalizing your experience...
      </Text>
      
      <View style={styles.stepContainer}>
        <Text style={styles.step}>✓ Processing your location</Text>
        <Text style={styles.step}>✓ Fetching environmental data</Text>
        <Text style={styles.step}>⏳ Generating your avatar</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  spinner: {
    marginBottom: 30,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
    color: '#2D3748',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 40,
    color: '#4A5568',
    lineHeight: 24,
  },
  stepContainer: {
    alignItems: 'flex-start',
  },
  step: {
    fontSize: 16,
    marginBottom: 8,
    color: '#4A5568',
  },
});

export default GeneratingTwinScreen;
