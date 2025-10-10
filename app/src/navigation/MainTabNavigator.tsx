import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

// Import screens
import DashboardScreen from '../screens/DashboardScreen';
import StatsScreen from '../screens/StatsScreen';
import SettingsScreen from '../screens/SettingsScreen';
import FoodDiaryScreen from '../screens/FoodDiaryScreen';

// Import custom tab bar and helpers
import CustomTabBar from '../components/CustomTabBar';
import NotificationBell from '../components/NotificationBell';
import { useAlertsCount } from '../hooks/useAlertsCount';
import { colors } from '../theme';

// Define navigation parameter list
export type MainTabParamList = {
  Home: undefined;
  Stats: undefined;
  FoodDiary: undefined; // FoodDiary comes before Settings
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
      screenOptions={({ navigation }) => ({
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
