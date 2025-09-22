export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface UserLocationDetails {
  coordinates: Coordinates;
  label: string;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  countryCode?: string | null;
  postcode?: string | null;
}

export interface UserProfile {
  location: Coordinates;
  commuteMode: 'car' | 'transit' | 'wfh' | 'bike' | 'walk';
  sleepHours: number;
  gender: 'male' | 'female';
  skinTone: 'light' | 'medium' | 'dark';
  createdAt: string; // ISO 8601 date string
  schemaVersion?: number; // For future data migrations
  // Optional fields for future avatar customization
  ageRange?: 'young' | 'adult' | 'senior';
  preferredStyle?: 'casual' | 'professional' | 'sporty';
  // Security settings
  security?: {
    requireAuthentication: boolean; // Whether PIN/biometric is required
    authMethod?: 'pin' | 'biometric' | 'both'; // Authentication method preference
    lastAuthenticatedAt?: string; // ISO 8601 date string
  };
  // Display preferences
  preferences?: {
    enableStressVisuals: boolean; // Whether to show stress animations and effects
    enableDeveloperControls: boolean; // Whether to show developer controls and UI overlays
    enableEnergyNotifications?: boolean; // Whether to send energy low notifications
    enableSleepHealthNotifications?: boolean; // Whether to send sleep & health insights
  };
  homeLocation?: UserLocationDetails | null;
  workLocation?: UserLocationDetails | null;
  weightKg?: number | null;
  heightCm?: number | null;
  idealSleepHours?: number | null;
  // Hydration settings
  hydrationGoalMl?: number | null; // Daily hydration goal in mL
  hydrationBaselineMl?: number | null; // Baseline calculated from weight
}
