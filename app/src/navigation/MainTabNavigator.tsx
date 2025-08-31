import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

// Import screens
import DashboardScreen from '../screens/DashboardScreen';
import StatsScreen from '../screens/StatsScreen';
import SettingsScreen from '../screens/SettingsScreen';

// Import custom tab bar
import CustomTabBar from '../components/CustomTabBar';
import NotificationBell from '../components/NotificationBell';
import { colors } from '../theme';

export type MainTabParamList = {
  Home: undefined;
  Stats: undefined;
  Settings: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

const MainTabNavigator: React.FC = () => {
  return (
    <Tab.Navigator
      tabBar={props => <CustomTabBar {...props} />}
      screenOptions={({ navigation }) => ({
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
            onPress={() => {
              const parent = navigation.getParent();
              // Navigate on the root stack so back returns to the last tab
              // Type cast to appease TS without deep typing here
              parent?.navigate('Alerts' as never);
            }}
          />
        ),
      })}
    >
      <Tab.Screen
        name="Home"
        component={DashboardScreen}
        options={{
          tabBarLabel: 'Home',
        }}
      />
      <Tab.Screen
        name="Stats"
        component={StatsScreen}
        options={{
          tabBarLabel: 'Stats',
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarLabel: 'Settings',
        }}
      />
    </Tab.Navigator>
  );
};

export default MainTabNavigator;
