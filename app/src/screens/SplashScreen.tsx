import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../App';
import { LocalStorageService } from '../services/LocalStorageService';
import AnimationCacheService from '../services/AnimationCacheService';
import AnimationPreloaderService from '../services/AnimationPreloaderService';

type SplashScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Splash'>;

export default function SplashScreen() {
  const navigation = useNavigation<SplashScreenNavigationProp>();
  const [fadeAnim] = useState(new Animated.Value(0));
  const [scaleAnim] = useState(new Animated.Value(0.8));
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingText, setLoadingText] = useState('Initializing...');

  useEffect(() => {
    // Start entrance animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 1000,
        easing: Easing.out(Easing.back(1.5)),
        useNativeDriver: true,
      }),
    ]).start();

    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      // Step 1: Initialize services
      setLoadingText('Initializing services...');
      setLoadingProgress(0.1);
      
      const localStorage = new LocalStorageService();
      await AnimationCacheService.initialize();
      
      // Step 2: Preload animations
      setLoadingText('Preloading animations...');
      setLoadingProgress(0.3);
      
      await preloadAnimations();
      
      // Step 3: Check for existing user data
      setLoadingText('Checking user data...');
      setLoadingProgress(0.7);
      
      const userProfile = await localStorage.getUserProfile();
      const avatarUrl = await localStorage.getAvatarUrl();
      
      // Step 4: Navigation decision
      setLoadingText('Ready!');
      setLoadingProgress(1.0);
      
      // Small delay to show completion
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Navigate based on user data
      if (userProfile && avatarUrl) {
        console.log('✅ Found existing user data, navigating to Dashboard');
        navigation.replace('Dashboard');
      } else {
        console.log('📝 No existing user data, navigating to Welcome');
        navigation.replace('Welcome');
      }
      
    } catch (error) {
      console.error('❌ Error during app initialization:', error);
      setLoadingText('Error occurred');
      // Navigate to welcome as fallback
      setTimeout(() => navigation.replace('Welcome'), 1000);
    }
  };

  const preloadAnimations = async () => {
    try {
      // Preload only critical (high priority) animations for faster startup
      await AnimationPreloaderService.preloadCriticalAnimations((current, total, currentName) => {
        const progress = 0.3 + (current / total) * 0.4;
        setLoadingProgress(progress);
        setLoadingText(`Loading ${currentName}...`);
      });

      console.log('🎬 Critical animations preloaded');
      
      // Continue preloading remaining animations in background after navigation
      setTimeout(() => {
        AnimationPreloaderService.preloadRemainingAnimations().catch(error => {
          console.warn('⚠️ Background preloading failed:', error);
        });
      }, 1000);

    } catch (error) {
      console.error('❌ Error preloading animations:', error);
    }
  };

  return (
    <View style={styles.container}>
      <Animated.View 
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }]
          }
        ]}
      >
        <View style={styles.logoContainer}>
          <View style={styles.logo}>
            <Text style={styles.logoText}>🫁</Text>
          </View>
          <Text style={styles.title}>Digital Twin</Text>
          <Text style={styles.subtitle}>Health Monitoring</Text>
        </View>
        
        <View style={styles.loadingContainer}>
          <View style={styles.progressBar}>
            <Animated.View 
              style={[
                styles.progressFill,
                {
                  width: `${loadingProgress * 100}%`
                }
              ]}
            />
          </View>
          <Text style={styles.loadingText}>{loadingText}</Text>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a202c',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    width: '80%',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 60,
  },
  logo: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#3182CE',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#3182CE',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  logoText: {
    fontSize: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#a0aec0',
    textAlign: 'center',
  },
  loadingContainer: {
    width: '100%',
    alignItems: 'center',
  },
  progressBar: {
    width: '100%',
    height: 4,
    backgroundColor: '#2d3748',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 16,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#3182CE',
    borderRadius: 2,
  },
  loadingText: {
    fontSize: 14,
    color: '#a0aec0',
    textAlign: 'center',
  },
});
