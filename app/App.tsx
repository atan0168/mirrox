import 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Import screens
import SplashScreen from './src/screens/SplashScreen';
import WelcomeScreen from './src/screens/WelcomeScreen';
import PermissionScreen from './src/screens/PermissionScreen';
import CitySelectionScreen from './src/screens/CitySelectionScreen';
import QuestionnaireScreen from './src/screens/QuestionnaireScreen';
import GeneratingTwinScreen from './src/screens/GeneratingTwinScreen';
import PrivacyScreen from './src/screens/PrivacyScreen';

// Import tab navigator
import MainTabNavigator from './src/navigation/MainTabNavigator';
import AlertsScreen from './src/screens/AlertsScreen';

export type RootStackParamList = {
  Splash: undefined;
  Welcome: undefined;
  Privacy: undefined;
  Permission: undefined;
  CitySelection: undefined;
  Questionnaire: {
    location: {
      latitude: number;
      longitude: number;
      city?: string;
      state?: string;
    } | null;
  };
  GeneratingTwin: undefined;
  MainTabs: undefined;
  Alerts: undefined;
};

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
  return (
    <QueryClientProvider client={queryClient}>
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
              // headerLeft: () => null, // Prevent going back
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
        </Stack.Navigator>
      </NavigationContainer>
    </QueryClientProvider>
  );
}
