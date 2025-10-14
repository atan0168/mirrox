import 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import { navigationRef } from './src/navigation/navigationRef';
import { createStackNavigator } from '@react-navigation/stack';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useTimeOfDayScheduler } from './src/hooks/useTimeOfDayScheduler';
import { enableScreens } from 'react-native-screens';
import { SystemBars } from 'react-native-edge-to-edge';

// Import screens
import SplashScreen from './src/screens/SplashScreen';
import WelcomeScreen from './src/screens/WelcomeScreen';
import PermissionScreen from './src/screens/PermissionScreen';
import CitySelectionScreen from './src/screens/CitySelectionScreen';
import QuestionnaireScreen from './src/screens/QuestionnaireScreen';
import GeneratingTwinScreen from './src/screens/GeneratingTwinScreen';
import PrivacyScreen from './src/screens/PrivacyScreen';
import QuestHistoryScreen from './src/screens/QuestHistoryScreen';
import AchievementScreen from './src/screens/AchievementScreen';

// Import tab navigator
import MainTabNavigator from './src/navigation/MainTabNavigator';
import AlertsScreen from './src/screens/AlertsScreen';
import HealthPermissionScreen from './src/screens/HealthPermissionScreen';
import DebugDatabaseScreen from './src/screens/DebugDatabaseScreen';
import React, { useEffect } from 'react';
import { initNotifications } from './src/services/notifications';
import RootServices from './src/components/RootServices';
import LocationPickerScreen from './src/screens/LocationPickerScreen';
import NutritionDetailScreen from './src/screens/NutritionDetailScreen';
import FoodDiaryHistoryScreen from './src/screens/FoodDiaryHistoryScreen';
import FoodDiaryHistoryDetailScreen from './src/screens/FoodDiaryHistoryDetailScreen';
import type { RootStackParamList } from './src/navigation/types';

const Stack = createStackNavigator<RootStackParamList>();

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

export default function App() {
  // Optimize navigation performance/memory
  enableScreens(true);
  // Mount global time-of-day scheduler once
  useTimeOfDayScheduler();

  // Initialize notifications and request permissions once
  useEffect(() => {
    (async () => {
      await initNotifications();
    })();
  }, []);
  return (
    <QueryClientProvider client={queryClient}>
      <NavigationContainer ref={navigationRef}>
        <SystemBars style="auto" />
        {/* Always-mounted background services */}
        <RootServices />
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
            name="Privacy"
            component={PrivacyScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="Permission"
            component={PermissionScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="HealthPermission"
            component={HealthPermissionScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="CitySelection"
            component={CitySelectionScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="Questionnaire"
            component={QuestionnaireScreen}
            options={{
              title: 'About You',
              headerLeft: () => null, // Prevent going back
            }}
          />
          <Stack.Screen
            name="GeneratingTwin"
            component={GeneratingTwinScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="MainTabs"
            component={MainTabNavigator}
            options={{
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="Alerts"
            component={AlertsScreen}
            options={{
              title: 'Alerts',
              headerBackTitle: 'Back',
            }}
          />
          <Stack.Screen
            name="DebugDB"
            component={DebugDatabaseScreen}
            options={{
              title: 'Debug Database',
              headerBackTitle: 'Back',
            }}
          />
          <Stack.Screen
            name="LocationPicker"
            component={LocationPickerScreen}
            options={{
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="NutritionDetail"
            component={NutritionDetailScreen}
            options={{ title: 'Nutrition Detail' }}
          />
          <Stack.Screen
            name="FoodDiaryHistory"
            component={FoodDiaryHistoryScreen}
            options={{ title: 'Meal History', headerBackTitle: 'Back' }}
          />
          <Stack.Screen
            name="FoodDiaryHistoryDetail"
            component={FoodDiaryHistoryDetailScreen}
            options={{ title: 'Meal Details', headerBackTitle: 'Back' }}
          />
          <Stack.Screen
            name="QuestHistory"
            component={QuestHistoryScreen}
            options={{
              title: 'Quest History',
              headerBackTitle: 'Back',
            }}
          />
          <Stack.Screen
            name="Achievements"
            component={AchievementScreen}
            options={{
              title: 'Achievements',
              headerBackTitle: 'Back',
            }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </QueryClientProvider>
  );
}
