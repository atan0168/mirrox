import type { NavigatorScreenParams } from '@react-navigation/native';
import type { MainTabParamList } from './MainTabNavigator';
import type { UserLocationDetails } from '../models/User';

export type RootStackParamList = {
  Splash: undefined;
  Welcome: undefined;
  Privacy: undefined;
  Permission: undefined;
  HealthPermission:
    | {
        location: {
          latitude: number;
          longitude: number;
          city?: string;
          state?: string;
        } | null;
      }
    | undefined;
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
  MainTabs: NavigatorScreenParams<MainTabParamList>;
  EditProfile: undefined;
  Alerts: { alertId?: string } | undefined;
  DebugDB: undefined;
  NutritionDetail: undefined;
  FoodDiaryHistory: undefined;
  FoodDiaryHistoryDetail: {
    mealId: number;
    dateLabel: string;
    totalEnergyKcal?: number | null;
  };
  LocationPicker: {
    initialLocation: UserLocationDetails | null;
    onSelect?: (selection: UserLocationDetails | null) => void;
    allowCurrentLocation?: boolean;
  };
  QuestHistory: undefined;
  Achievements: undefined;
};
