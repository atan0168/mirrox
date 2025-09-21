import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Ionicons from '@expo/vector-icons/Ionicons';

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
  Settings: undefined;
  FoodDiary: undefined; //
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
          let iconName: keyof typeof Ionicons.glyphMap;

          switch (route.name) {
            case 'Home':
              iconName = 'home-outline';
              break;
            case 'Stats':
              iconName = 'stats-chart-outline';
              break;
            case 'Settings':
              iconName = 'settings-outline';
              break;
            case 'FoodDiary':
              iconName = 'restaurant-outline'; //
              break;
            default:
              iconName = 'ellipse-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
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
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ tabBarLabel: 'Settings' }}
      />

      <Tab.Screen
        name="FoodDiary"
        component={FoodDiaryScreen}
        options={{ tabBarLabel: 'Food Diary' }}
      />
    </Tab.Navigator>
  );
};

export default MainTabNavigator;
