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
import { colors } from '../theme';


export type MainTabParamList = {
  Home: undefined;
  Stats: undefined;
  Settings: undefined;
  FoodDiary: undefined; // 
};


const Tab = createBottomTabNavigator<MainTabParamList>();

const MainTabNavigator: React.FC = () => {
  return (
    <Tab.Navigator
      detachInactiveScreens={false}
      backBehavior="initialRoute"
      tabBar={props => <CustomTabBar {...props} />}
      screenOptions={({ navigation, route }) => ({
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
              parent?.navigate('Alerts' as never);
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
