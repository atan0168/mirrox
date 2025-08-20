import { MMKV } from "react-native-mmkv";
import { UserProfile } from "../models/User";

// Initialize the storage instance
const storage = new MMKV();
// const storage = new MMKV({
//   id: 'user-profile-storage',
// Optional: Add encryption key for enhanced security
// encryptionKey: 'your-super-secret-key'
// });

const USER_PROFILE_KEY = "user_profile";
const CURRENT_SCHEMA_VERSION = 1;

class LocalStorageService {
  public saveUserProfile(profile: UserProfile): void {
    try {
      storage.set(USER_PROFILE_KEY, JSON.stringify(profile));
    } catch (error) {
      console.error("Failed to save user profile:", error);
      // Handle error appropriately (e.g., show a user-facing message)
    }
  }

  public getUserProfile(): UserProfile | null {
    try {
      const profileJson = storage.getString(USER_PROFILE_KEY);
      if (profileJson) {
        let profile = JSON.parse(profileJson);
        // Run migration if necessary
        if ((profile.schemaVersion || 1) < CURRENT_SCHEMA_VERSION) {
          profile = this.migrateProfile(profile);
          this.saveUserProfile(profile); // Save the updated profile back to storage
        }
        return profile as UserProfile;
      }
      return null;
    } catch (error) {
      console.error("Failed to retrieve user profile:", error);
      return null;
    }
  }

  public clearData(): void {
    try {
      storage.clearAll();
    } catch (error) {
      console.error("Failed to clear storage:", error);
    }
  }

  private migrateProfile(profile: any): UserProfile {
    const version = profile.schemaVersion || 1;

    // Add migration logic here as schema evolves
    // Example:
    // if (version < 2) {
    //   profile.dietaryPreference = 'unspecified';
    // }

    profile.schemaVersion = CURRENT_SCHEMA_VERSION;
    return profile as UserProfile;
  }
}

// Export a singleton instance
export const localStorageService = new LocalStorageService();
