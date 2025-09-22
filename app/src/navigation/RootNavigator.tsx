import React from 'react';

import { createNativeStackNavigator } from '@react-navigation/native-stack';

import MainTabNavigator from './MainTabNavigator';
import NutritionDetailScreen from '../screens/NutritionDetailScreen';

export type RootStackParamList = {
  Tabs: undefined;
  NutritionDetail: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Tabs" component={MainTabNavigator} />
      <Stack.Screen
        name="NutritionDetail"
        component={NutritionDetailScreen}
        options={{ headerShown: true, title: 'Nutrition Detail' }}
      />
    </Stack.Navigator>
  );
}
