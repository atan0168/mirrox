import 'react-native-gesture-handler';
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

// Import screens
import SplashScreen from './src/screens/SplashScreen';
import WelcomeScreen from './src/screens/WelcomeScreen';
import QuestionnaireScreen from './src/screens/QuestionnaireScreen';
import GeneratingTwinScreen from './src/screens/GeneratingTwinScreen';
import AvatarCreationScreen from './src/screens/AvatarCreationScreen';
import DashboardScreen from './src/screens/DashboardScreen';

export type RootStackParamList = {
  Splash: undefined;
  Welcome: undefined;
  Questionnaire: { location: { latitude: number; longitude: number } | null };
  GeneratingTwin: undefined;
  AvatarCreation: undefined;
  Dashboard: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <NavigationContainer>
      <StatusBar style="dark" />
      <Stack.Navigator
        initialRouteName="Splash"
        screenOptions={{
          headerStyle: {
            backgroundColor: '#FFFFFF',
            borderBottomWidth: 1,
            borderBottomColor: '#E5E5E5',
            elevation: 0,
            shadowOpacity: 0,
          },
          headerTintColor: '#000000',
          headerTitleStyle: {
            fontWeight: '600',
            color: '#000000',
          },
        }}
      >
        <Stack.Screen 
          name="Splash" 
          component={SplashScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="Welcome" 
          component={WelcomeScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="Questionnaire" 
          component={QuestionnaireScreen}
          options={{ title: 'About You' }}
        />
        <Stack.Screen 
          name="GeneratingTwin" 
          component={GeneratingTwinScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="AvatarCreation" 
          component={AvatarCreationScreen}
          options={{ 
            title: 'Create Avatar',
            headerLeft: () => null, // Prevent going back
          }}
        />
        <Stack.Screen 
          name="Dashboard" 
          component={DashboardScreen}
          options={{ 
            title: 'Your Digital Twin',
            headerLeft: () => null, // Prevent going back
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
