import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import 'react-native-gesture-handler';

// Import screens
import WelcomeScreen from './src/screens/WelcomeScreen';
import QuestionnaireScreen from './src/screens/QuestionnaireScreen';
import GeneratingTwinScreen from './src/screens/GeneratingTwinScreen';
import AvatarCreationScreen from './src/screens/AvatarCreationScreen';
import DashboardScreen from './src/screens/DashboardScreen';

export type RootStackParamList = {
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
      <StatusBar style="auto" />
      <Stack.Navigator
        initialRouteName="Welcome"
        screenOptions={{
          headerStyle: {
            backgroundColor: '#3182CE',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      >
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
