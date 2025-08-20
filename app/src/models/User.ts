export interface UserProfile {
  location: {
    latitude: number;
    longitude: number;
  };
  commuteMode: 'car' | 'transit' | 'wfh' | 'bike' | 'walk';
  sleepHours: number;
  createdAt: string; // ISO 8601 date string
  schemaVersion?: number; // For future data migrations
}
