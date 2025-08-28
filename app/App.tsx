import "react-native-gesture-handler";
import { TouchableOpacity } from "react-native";
import { StatusBar } from "expo-status-bar";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { Settings } from "lucide-react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Import screens
import SplashScreen from "./src/screens/SplashScreen";
import WelcomeScreen from "./src/screens/WelcomeScreen";
import PermissionScreen from "./src/screens/PermissionScreen";
import CitySelectionScreen from "./src/screens/CitySelectionScreen";
import QuestionnaireScreen from "./src/screens/QuestionnaireScreen";
import GeneratingTwinScreen from "./src/screens/GeneratingTwinScreen";
import AvatarCreationScreen from "./src/screens/AvatarCreationScreen";
import DashboardScreen from "./src/screens/DashboardScreen";
import SettingsScreen from "./src/screens/SettingsScreen";
import PrivacyScreen from "./src/screens/PrivacyScreen";

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
  AvatarCreation: undefined;
  Dashboard: undefined;
  Settings: undefined;
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
              backgroundColor: "#FFFFFF",
              borderBottomWidth: 1,
              borderBottomColor: "#E5E5E5",
              elevation: 0,
              shadowOpacity: 0,
            },
            headerTintColor: "#000000",
            headerTitleStyle: {
              fontWeight: "600",
              color: "#000000",
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
            options={{ title: "About You" }}
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
              title: "Create Avatar",
              // headerLeft: () => null, // Prevent going back
            }}
          />
          <Stack.Screen
            name="Dashboard"
            component={DashboardScreen}
            options={({ navigation }) => ({
              title: "Your Digital Twin",
              headerRight: () => (
                <TouchableOpacity
                  onPress={() => navigation.navigate("Settings")}
                  style={{ marginRight: 16 }}
                >
                  <Settings size={24} color="#000000" />
                </TouchableOpacity>
              ),
              // headerLeft: () => null, // Prevent going back
            })}
          />
          <Stack.Screen
            name="Settings"
            component={SettingsScreen}
            options={{
              title: "Settings",
            }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </QueryClientProvider>
  );
}
