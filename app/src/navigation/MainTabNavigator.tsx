import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import {
  Home,
  BarChart,
  Settings,
  Utensils,
  Circle,
} from 'lucide-react-native';

// Import screens
import DashboardScreen from '../screens/DashboardScreen';
import StatsScreen from '../screens/StatsScreen';
import SettingsScreen from '../screens/SettingsScreen';
import FoodDiaryScreen from '../screens/FoodDiaryScreen';

// Import custom tab bar
import CustomTabBar from '../components/CustomTabBar';
import NotificationBell from '../components/NotificationBell';
import { useAlertsCount } from '../hooks/useAlertsCount';
import { colors } from '../theme';

export type MainTabParamList = {
  Home: undefined;
  Stats: undefined;
  FoodDiary: undefined;
  Settings: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

const MainTabNavigator: React.FC = () => {
  const alertCount = useAlertsCount();

  return (
    <Tab.Navigator
      detachInactiveScreens
      backBehavior="initialRoute"
      tabBar={props => <CustomTabBar {...props} />}
      screenOptions={({ navigation, route }) => ({
        lazy: true,
        headerShown: true,
        headerTitle: 'Digital Twin',
        headerShadowVisible: false,
        headerStyle: {
          backgroundColor: colors.white,
          borderBottomWidth: 1,
          borderBottomColor: colors.divider,
        },
        headerTintColor: '#000000',
        headerRight: () => (
          <NotificationBell
            badgeCount={alertCount}
            onPress={() => {
              const parent = navigation.getParent();
              parent?.navigate('Alerts');
            }}
          />
        ),
        tabBarIcon: ({ color, size }) => {
          switch (route.name) {
            case 'Home':
              return <Home size={size} color={color} />;
            case 'Stats':
              return <BarChart size={size} color={color} />;
            case 'FoodDiary':
              return <Utensils size={size} color={color} />;
            case 'Settings':
              return <Settings size={size} color={color} />;
            default:
              return <Circle size={size} color={color} />;
          }
        },
      })}
    >
      <Tab.Screen
        name="Home"
        component={DashboardScreen}
        options={{ tabBarLabel: 'Home' }}
      />
      <Tab.Screen
        name="Stats"
        component={StatsScreen}
        options={{ tabBarLabel: 'Stats' }}
      />
      {/* ✅ Move FoodDiary before Settings */}
      <Tab.Screen
        name="FoodDiary"
        component={FoodDiaryScreen}
        options={{ tabBarLabel: 'Food Diary' }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ tabBarLabel: 'Settings' }}
      />
    </Tab.Navigator>
  );
};

export default MainTabNavigator;
