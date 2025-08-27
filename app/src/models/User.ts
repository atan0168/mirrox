export interface UserProfile {
  location: {
    latitude: number;
    longitude: number;
  };
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
}
