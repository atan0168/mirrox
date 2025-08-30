## Project Context & Core Constraints:

The project is a mobile application that creates a "digital twin" of the user to promote wellness and self-awareness. The initial onboarding experience must be magical, frictionless, and provide immediate value.

CRITICAL CONSTRAINT: User privacy is paramount. No personally identifiable information (PII) or user-generated data (location, sleep hours, commute type) is to be stored on our backend server or database. All user data must be persisted exclusively on the user's device. The backend will only be used as a proxy for external services when needed.

### **1. High-Level Architecture Diagram**

This diagram illustrates the core principle of our privacy-first architecture: no user-generated data is stored on our servers. The backend acts purely as a trusted proxy for external data.

```
sequenceDiagram
    participant User's Mobile App
    participant Our Node.js Backend
    participant External Services (DOE API)

    User's Mobile App->>User's Mobile App: 1. Request Location & Get Questionnaire Answers
    User's Mobile App->>User's Mobile App: 2. Store UserProfile Locally (MMKV)

    Note right of User's Mobile App: Contains {lat, lon, commute, sleep}

    User's Mobile App->>Our Node.js Backend: 3. GET /api/air-quality?lat=...&lon=...

    Note left of Our Node.js Backend: Only coordinates are sent. No PII.

    Our Node.js Backend->>External Services (DOE API): 4. Fetch Air Quality Data for coordinates
    External Services (DOE API)-->>Our Node.js Backend: 5. Return Raw Air Quality Data

    Our Node.js Backend->>Our Node.js Backend: 6. Process and simplify the data

    Our Node.js Backend-->>User's Mobile App: 7. Return Clean JSON {aqi, primaryPollutant}

    User's Mobile App->>User's Mobile App: 8. Combine Local UserProfile + Air Quality Data
    User's Mobile App->>User's Mobile App: 9. Generate "Health Vitals" & Render Avatar
```

### **2. Detailed Implementation Plan**

Here is the breakdown of the development process, from setting up the foundation to delivering the final user experience.

#### **Step 1: Setup Local Storage Service (`LocalStorageService.ts`)**

First, we need a robust and fast local storage solution. MMKV is an excellent choice.

**1. Installation:**

```bash
npm install react-native-mmkv
cd ios && pod install
```

**2. Service Implementation (`src/services/LocalStorageService.ts`):**
Create a singleton service to encapsulate all interactions with MMKV, making it easy to manage and mock for testing.

```typescript
import { MMKV } from 'react-native-mmkv';
import { UserProfile } from '../models/User';

// Initialize the storage instance
const storage = new MMKV({
  id: 'user-profile-storage',
  // Optional: Add encryption key for enhanced security
  // encryptionKey: 'your-super-secret-key'
});

const USER_PROFILE_KEY = 'user_profile';

class LocalStorageService {
  public saveUserProfile(profile: UserProfile): void {
    try {
      storage.set(USER_PROFILE_KEY, JSON.stringify(profile));
    } catch (error) {
      console.error('Failed to save user profile:', error);
      // Handle error appropriately (e.g., show a user-facing message)
    }
  }

  public getUserProfile(): UserProfile | null {
    try {
      const profileJson = storage.getString(USER_PROFILE_KEY);
      if (profileJson) {
        return JSON.parse(profileJson) as UserProfile;
      }
      return null;
    } catch (error) {
      console.error('Failed to retrieve user profile:', error);
      return null;
    }
  }

  public clearData(): void {
    try {
      storage.clearAll();
    } catch (error) {
      console.error('Failed to clear storage:', error);
    }
  }
}

// Export a singleton instance
export const localStorageService = new LocalStorageService();
```

#### **Step 2: Onboarding Flow & UI Components**

The onboarding flow is composed of four main screens.

**Screen Flow:** `WelcomeScreen.tsx` -> `QuestionnaireScreen.tsx` -> `GeneratingTwinScreen.tsx` -> `DashboardScreen.tsx`

**1. `WelcomeScreen.tsx`:**
This screen's primary job is to get location permission and access.

- **Library:** `react-native-geolocation-service`
- **Key Logic:** Request location permission. On success, navigate to the `QuestionnaireScreen` with the location data. Handle permission denial gracefully (see Challenges).

```typescript
// src/screens/WelcomeScreen.tsx
import React from 'react';
import { View, Button, Alert } from 'react-native';
import Geolocation from 'react-native-geolocation-service';
import { request, PERMISSIONS, RESULTS } from 'react-native-permissions';

const WelcomeScreen = ({ navigation }) => {
  const handleGetStarted = async () => {
    const status = await request(PERMISSIONS.IOS.LOCATION_WHEN_IN_USE); // Or ANDROID

    if (status === RESULTS.GRANTED) {
      Geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          navigation.navigate('Questionnaire', { location: { latitude, longitude } });
        },
        (error) => {
          Alert.alert("Location Error", "Could not fetch location. Please try again.");
          console.error(error);
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
      );
    } else {
      Alert.alert(
        "Permission Denied",
        "Location access is needed to personalize your digital twin's environment."
      );
    }
  };

  return (
    <View>
      {/* Your beautiful welcome UI */}
      <Button title="Get Started" onPress={handleGetStarted} />
    </View>
  );
};

export default WelcomeScreen;
```

**2. `QuestionnaireScreen.tsx`:**
Collect the remaining non-PII data points.

```typescript
// src/screens/QuestionnaireScreen.tsx
import React, { useState } from 'react';
import { View, Button } from 'react-native';
// Assume you have custom components for these inputs
import { CommutePicker } from '../components/CommutePicker';
import { SleepSlider } from '../components/SleepSlider';
import { localStorageService } from '../services/LocalStorageService';
import { UserProfile } from '../models/User';

const QuestionnaireScreen = ({ route, navigation }) => {
  const { location } = route.params;
  const [commuteMode, setCommuteMode] = useState<'car' | 'transit' | 'wfh'>('wfh');
  const [sleepHours, setSleepHours] = useState<number>(7);

  const handleCompleteOnboarding = () => {
    const profile: UserProfile = {
      location,
      commuteMode,
      sleepHours,
      createdAt: new Date().toISOString(),
    };

    localStorageService.saveUserProfile(profile);

    // Navigate to a temporary loading screen while we fetch API data
    navigation.navigate('GeneratingTwin');
  };

  return (
    <View>
      <CommutePicker selectedValue={commuteMode} onValueChange={setCommuteMode} />
      <SleepSlider value={sleepHours} onValueChange={setSleepHours} />
      <Button title="Create My Twin" onPress={handleCompleteOnboarding} />
    </View>
  );
};

export default QuestionnaireScreen;

```

#### **Step 3: Avatar Generation (`Avatar.tsx`)**

This component dynamically assembles an SVG avatar from parts.

**1. SVG Structure:**
Organize your SVGs in a structured directory.

```
/assets/svgs/
  |-- heads/
  |   |-- oval.svg
  |   |-- round.svg
  |-- eyes/
  |   |-- happy.svg
  |   |-- tired.svg
  |-- bodies/
      |-- default.svg
```

**2. Component Implementation (`src/components/Avatar.tsx`):**
Use a library like `react-native-svg` and `react-native-svg-transformer` to render SVGs.

```typescript
// src/components/Avatar.tsx
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SvgProps } from 'react-native-svg';

// Dynamic import for SVGs
// NOTE: This requires Metro bundler configuration to work smoothly.
// A simpler approach for V1 might be explicit imports.
const getSvgComponent = (type: string, name: string): React.FC<SvgProps> => {
  // This is pseudo-code. The actual implementation depends on your setup.
  // For simplicity, we'll use explicit imports here.
  if (type === 'head' && name === 'oval') return require('../../assets/svgs/heads/oval.svg').default;
  if (type === 'eyes' && name === 'happy') return require('../../assets/svgs/eyes/happy.svg').default;
  // ... and so on
  return require('../../assets/svgs/bodies/default.svg').default;
};

import HeadOval from '../../assets/svgs/heads/oval.svg';
import EyesHappy from '../../assets/svgs/eyes/happy.svg';
import EyesTired from '../../assets/svgs/eyes/tired.svg';
import BodyDefault from '../../assets/svgs/bodies/default.svg';
import { AvatarProps } from '../models/Avatar';


const Avatar = ({ head, eyes, body }: AvatarProps) => {
  const HeadComponent = head === 'oval' ? HeadOval : HeadOval; // Default
  const EyesComponent = eyes === 'happy' ? EyesHappy : EyesTired;
  const BodyComponent = body === 'default' ? BodyDefault : BodyDefault;

  return (
    <View style={styles.container}>
      <BodyComponent style={styles.body} width={150} height={200} />
      <HeadComponent style={styles.head} width={100} height={100} />
      <EyesComponent style={styles.eyes} width={50} height={20} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { width: 150, height: 250, alignItems: 'center', position: 'relative' },
  body: { position: 'absolute', bottom: 0 },
  head: { position: 'absolute', top: 0 },
  eyes: { position: 'absolute', top: 40, zIndex: 1 }, // Ensure eyes are on top of the head
});

export default Avatar;
```

#### **Step 4: Node.js Backend Service (`api/air-quality`)**

A simple, secure Express.js endpoint to proxy requests.

**1. Setup:**

```bash
npm install express typescript ts-node @types/express @types/node axios cors @types/cors dotenv
```

**2. Route Implementation (`src/routes/airQuality.ts`):**

```typescript
import express, { Request, Response } from 'express';
import axios from 'axios';
import cors from 'cors';

const router = express.Router();

// Configure CORS for your frontend's domain in production
const corsOptions = {
  origin:
    process.env.NODE_ENV === 'production' ? 'https://your-app-domain.com' : '*',
};

router.get(
  '/api/air-quality',
  cors(corsOptions),
  async (req: Request, res: Response) => {
    const { lat, lon } = req.query;

    if (!lat || !lon) {
      return res
        .status(400)
        .json({ error: 'Latitude and longitude are required' });
    }

    // IMPORTANT: Store this in environment variables (.env file)
    const DOE_API_URL =
      process.env.DOE_API_URL || 'https://api.doe.gov.my/air/v1/latest';
    const DOE_API_KEY = process.env.DOE_API_KEY;

    try {
      const response = await axios.get(DOE_API_URL, {
        params: {
          lat: lat,
          lon: lon,
        },
        headers: {
          Authorization: `Bearer ${DOE_API_KEY}`, // Example auth header
          Accept: 'application/json',
        },
      });

      // Assume the DOE API returns a complex object; we extract and simplify it.
      const aqiData = response.data; // This will vary based on the actual API response
      const transformedData = {
        aqi: aqiData.overall_aqi || aqiData.stations[0]?.aqi,
        primaryPollutant: aqiData.primary_pollutant || 'PM2.5',
        stationName: aqiData.stations[0]?.name || 'Unknown',
      };

      return res.status(200).json(transformedData);
    } catch (error) {
      console.error('Error fetching from DOE API:', error);
      // Return a generic error to the client
      return res
        .status(502)
        .json({ error: 'Could not retrieve air quality data' });
    }
  }
);

export default router;
```

#### **Step 5: API Service on Mobile (`ApiService.ts`)**

A dedicated service in the React Native app for all backend communication.

```typescript
// src/services/ApiService.ts
import axios from 'axios';
import { AirQualityData } from '../models/AirQuality';

// Store base URL in a config file
const API_BASE_URL = 'https://your-backend-proxy.com'; // Replace with your actual backend URL

class ApiService {
  public async fetchAirQuality(
    latitude: number,
    longitude: number
  ): Promise<AirQualityData> {
    try {
      const response = await axios.get<AirQualityData>(
        `${API_BASE_URL}/api/air-quality`,
        {
          params: {
            lat: latitude,
            lon: longitude,
          },
        }
      );
      return response.data;
    } catch (error) {
      console.error('Failed to fetch air quality:', error);
      // Re-throw a custom error to be handled by the UI
      throw new Error('Unable to connect to environmental services.');
    }
  }
}

export const apiService = new ApiService();
```

#### **Step 6: Tying It All Together (`DashboardScreen.tsx`)**

This is the reveal screen where the user sees their twin for the first time.

```typescript
// src/screens/DashboardScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { localStorageService } from '../services/LocalStorageService';
import { apiService } from '../services/ApiService';
import Avatar from '../components/Avatar';
import { UserProfile } from '../models/User';
import { AirQualityData } from '../models/AirQuality';
import { AvatarProps } from '../models/Avatar';

const DashboardScreen = () => {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [airQuality, setAirQuality] = useState<AirQualityData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initializeDashboard = async () => {
      try {
        const profile = localStorageService.getUserProfile();
        if (!profile) {
          throw new Error("User profile not found.");
        }
        setUserProfile(profile);

        const aqData = await apiService.fetchAirQuality(
          profile.location.latitude,
          profile.location.longitude
        );
        setAirQuality(aqData);

      } catch (err) {
        setError(err.message || "An unexpected error occurred.");
      } finally {
        setIsLoading(false);
      }
    };

    initializeDashboard();
  }, []);

  const generateHealthVitalsMessage = (): string => {
    if (!airQuality) return "Analyzing your environment...";
    if (airQuality.aqi > 100) {
      return `Your twin's lungs are starting with a major debuff due to poor air quality (${airQuality.aqi}) in your area. The main pollutant is ${airQuality.primaryPollutant}.`;
    }
    if (airQuality.aqi > 50) {
      return `Your twin's lungs are starting with a slight debuff due to today's air quality (${airQuality.aqi}) in your area.`;
    }
    return `Your twin is breathing clean air today! The air quality in your area is good (${airQuality.aqi}).`;
  };

  const getAvatarProps = (): AvatarProps => {
    // Logic to derive avatar parts from user profile
    const eyes = userProfile && userProfile.sleepHours < 6 ? 'tired' : 'happy';
    return {
      head: 'oval',
      eyes: eyes,
      body: 'default',
    };
  };

  if (isLoading) {
    return <ActivityIndicator size="large" />;
  }

  if (error) {
    return <Text>Error: {error}</Text>;
  }

  return (
    <View>
      <Text>{generateHealthVitalsMessage()}</Text>
      <Avatar {...getAvatarProps()} />
      {/* ... other dashboard components */}
    </View>
  );
};

export default DashboardScreen;
```

### **3. Data Models (TypeScript Interfaces)**

Defining clear data structures is crucial for a stable application.

**`UserProfile` (`src/models/User.ts`)**

```typescript
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
```

**`AirQualityData` (`src/models/AirQuality.ts`)**

```typescript
export interface AirQualityData {
  aqi: number;
  primaryPollutant: string;
  stationName?: string; // Optional context
}
```

**`AvatarProps` (`src/models/Avatar.ts`)**

```typescript
export interface AvatarProps {
  head: 'oval' | 'round';
  eyes: 'happy' | 'tired' | 'neutral';
  body: 'default' | 'athletic';
  // Add other customizable parts as needed
}
```

### **4. Potential Challenges & Solutions**

1.  **Challenge: Handling Location Permission Denial**
    - **Problem:** The core experience relies on location. If a user denies permission, the app flow breaks.
    - **Solution:** Implement a graceful fallback.
      - **Primary Action:** On denial, show a modal explaining _why_ location is needed (for environmental data, not tracking) and provide a button to open the app settings.
      - **Secondary Fallback:** If the user still refuses, allow them to manually select their city from a predefined list (e.g., "Kuala Lumpur," "Petaling Jaya," "Shah Alam"). We can then use a geocoding service on the backend to get approximate coordinates for that city center to fetch the relevant air quality data. This respects user choice while still providing the core feature.

2.  **Challenge: External API Unavailability**
    - **Problem:** The OpenAQ or AQICN APIs might be down, have rate limits, or return an error. This would block the user from seeing their "Health Vitals."
    - **Solution:** Build resilience in both the backend and frontend.
      - **Backend Caching:** Our Node.js proxy can implement a short-term cache (e.g., using Redis or a simple in-memory cache). If we get multiple requests for the same approximate coordinates within a 15-minute window, we can serve the cached data instead of hitting the air quality APIs every time.
      - **Frontend Graceful Degradation:** If the `ApiService.fetchAirQuality` call fails, the `DashboardScreen.tsx` should catch the error and display a user-friendly message like, "We couldn't connect to environmental services right now. We'll try again later." The rest of the twin (avatar based on sleep/commute) should still render, ensuring the app doesn't feel broken.

3.  **Challenge: Data Synchronization/Migration**
    - **Problem:** All user data is local. If we release a new version of the app that changes the `UserProfile` interface (e.g., adding a new question like `dietaryPreference`), existing users' locally stored data will be outdated, potentially causing crashes.
    - **Solution:** Implement a simple versioning and migration strategy within the `LocalStorageService`.
      - **Versioning:** Add a `schemaVersion` number to the `UserProfile` interface. The first version is `1`.
      - **Migration Logic:** When `getUserProfile` is called, it checks the `schemaVersion`. If the version is missing or lower than the current app version, it runs a migration function.

    **Example Migrator (`LocalStorageService.ts`):**

    ```typescript
    // In LocalStorageService.ts
    const CURRENT_SCHEMA_VERSION = 2;

    private migrateProfile(profile: any): UserProfile {
        const version = profile.schemaVersion || 1;

        if (version < 2) {
            // Migration from v1 to v2: Add a new 'dietaryPreference' field
            profile.dietaryPreference = 'unspecified';
        }

        // Add more 'if (version < 3)' blocks for future migrations

        profile.schemaVersion = CURRENT_SCHEMA_VERSION;
        return profile as UserProfile;
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
            console.error("Failed to get/migrate user profile:", error);
            return null;
        }
    }
    ```
