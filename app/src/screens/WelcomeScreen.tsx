import React, { useState } from 'react';
import { View, Text, Button, Alert, StyleSheet } from 'react-native';
import * as Location from 'expo-location';

interface WelcomeScreenProps {
  navigation: any; // You can type this more strictly with NavigationProp
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ navigation }) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleGetStarted = async () => {
    setIsLoading(true);
    
    try {
      // Request permission to access location
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(
          'Permission Denied',
          'Location access is needed to personalize your digital twin\'s environment. You can manually select your city in the next step.',
          [
            { text: 'OK', onPress: () => navigation.navigate('Questionnaire', { location: null }) }
          ]
        );
        return;
      }

      // Get current location
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const { latitude, longitude } = location.coords;
      navigation.navigate('Questionnaire', { 
        location: { latitude, longitude } 
      });

    } catch (error) {
      console.error('Location error:', error);
      Alert.alert(
        'Location Error',
        'Could not fetch location. You can manually select your city in the next step.',
        [
          { text: 'OK', onPress: () => navigation.navigate('Questionnaire', { location: null }) }
        ]
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome to Your Digital Twin</Text>
      <Text style={styles.subtitle}>
        Create a magical representation of yourself that promotes wellness and self-awareness
      </Text>
      
      <Button 
        title={isLoading ? "Getting Location..." : "Get Started"} 
        onPress={handleGetStarted}
        disabled={isLoading}
      />
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
  title: {
    fontSize: 28,
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
});

export default WelcomeScreen;
