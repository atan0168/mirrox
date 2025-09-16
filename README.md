# Digital Twin - Privacy-First Wellness Platform

A React Native mobile application with Node.js backend that creates personalized digital avatars based on environmental air quality data and personal health metrics. The app promotes wellness and self-awareness through visual representation of how environmental factors affect the user's health.

## 🌟 Key Features

- **Privacy-First Design**: All personal data stays on the user's device - no PII stored on backend servers
- **Environmental Awareness**: Real-time air quality data visualization through personalized 3D avatars
- **Health Insights**: Combines sleep patterns, commute habits, and environmental data for wellness recommendations
- **3D Avatar System**: Dynamic avatar that changes based on air quality and personal health metrics
- **Multi-API Integration**: OpenAQ, AQICN, and Malaysian MyEQMS for comprehensive air quality data
- **HRV Stress Awareness**: Stress cues are computed locally from heart rate variability and recovery signals; insights are informational and not medical advice

## 🏗️ Architecture

This is a monorepo containing:

```
/
├── app/                    # React Native mobile application
├── backend/               # Node.js backend services
├── docs/                  # Project documentation
└── README.md              # This file
```

### Privacy-First Design

- **No PII stored on backend** - All user data stays on device using encrypted storage (SQLCipher for health history; MMKV for key‑value data)
- **Backend as proxy** - Server only proxies external API calls and provides air quality data
- **Local-first architecture** - User profiles, health data, and preferences stored exclusively on device

### Tech Stack

#### Mobile Application

- **React Native 0.79.5** with **Expo SDK ~53.0.20**
- **TypeScript** with strict mode enabled
- **React Navigation v7** for screen navigation
- **React Query (TanStack Query) v5** for server state management
- **MMKV** for encrypted, high-performance local storage
- **Three.js with React Three Fiber** for 3D avatar rendering

#### Backend Services

- **Node.js** with **Express.js** framework
- **TypeScript** with strict compilation
- **Multiple API integrations**: OpenAQ, AQICN, TomTom Traffic
- **In-memory caching** with TTL support
- **Rate limiting** and security middleware

## � Geotting Started

### Prerequisites

- **Node.js 18+**
- **npm or yarn**
- **Physical iOS/Android device** (required for 3D avatar rendering - simulators won't work properly)
- **API Keys**: OpenAQ, AQICN, TomTom (see backend setup)

For mobile development:

- **Xcode** (for iOS development)
- **Android Studio** (for Android development)

### Backend Setup

1. Navigate to the backend directory:

```bash
cd backend
```

2. Install dependencies:

```bash
npm install
```

3. Copy and configure environment variables:

```bash
cp .env.example .env
```

4. Edit `.env` with your API keys:

```env
OPENAQ_API_KEY=your_openaq_api_key_here
AQICN_API_KEY=your_aqicn_api_key_here
TOMTOM_API_KEY=your_tomtom_api_key_here
```

5. Start the development server:

```bash
npm run dev
```

The backend will be available at `http://localhost:3000`.

### Mobile App Setup

**Important**: The mobile app requires a physical device for proper 3D avatar rendering. Simulators/emulators will not render the 3D graphics correctly.

#### iOS Setup

1. Navigate to the app directory:

```bash
cd app
```

2. Install dependencies:

```bash
npm install
```

3. **Apple Developer Account Setup** (required):
   - Visit [Apple Developer](https://developer.apple.com/)
   - Sign up for a free Apple ID developer account
   - Follow [Apple's guide for device setup](https://developer.apple.com/documentation/xcode/running-your-app-in-simulator-or-on-a-device)

4. **Set up your iPhone for development**:
   - Enable Developer Mode in Settings > Privacy & Security > Developer Mode
   - Trust your development certificate in Settings > General > VPN & Device Management
   - Connect your iPhone via USB and trust the computer

5. **Run on iOS device**:

```bash
npx expo run:ios --device
```

#### Android Setup

1. **Set up Android development environment**:
   - Install Android Studio
   - Set up Android SDK
   - Enable Developer Options and USB Debugging on your Android device

2. **Run on Android device**:

```bash
npx expo run:android --device
```

### Full Development Setup

To run both backend and mobile app:

1. **Terminal 1** - Start backend:

```bash
cd backend
npm run dev
```

2. **Terminal 2** - Start mobile app:

```bash
cd app
npx expo run:ios --device  # or npx expo run:android --device
```

## 📱 App Flow

1. **Splash Screen** - App initialization
2. **Welcome Screen** - Introduction and location permission request
3. **Privacy Screen** - Privacy policy and data usage explanation
4. **Permission Screen** - Location permission handling
5. **City Selection** - Choose or confirm location
6. **Questionnaire** - Collect sleep hours, commute preferences, and demographics
7. **Generating Twin** - Loading screen with progress indicators
8. **Avatar Creation** - 3D avatar customization
9. **Dashboard** - Personalized avatar and health insights
10. **Settings** - App preferences and data management

## 🔐 Privacy Principles

- **Zero PII Storage**: Backend only receives coordinates for air quality lookup
- **Local-First Architecture**: User profiles, health data, and preferences stored exclusively on device
- **Transparent Data Usage**: Clear explanations of why data is needed and how it's used
- **User Control**: Easy data export and complete deletion capabilities
- **Encrypted Storage**: Health history encrypted with SQLCipher (expo-sqlite); other key‑value data encrypted with MMKV

## 📊 API Endpoints

The backend provides the following endpoints:

- `GET /api/air-quality` - Fetch air quality data for coordinates
- `GET /api/traffic/congestion` - Get traffic congestion factors
- `GET /api/health` - Service health check

See [backend/README.md](backend/README.md) for detailed API documentation.

## 🛠️ Development Commands

### Backend

```bash
cd backend
npm run dev          # Start development server
npm run build        # Build for production
npm start           # Start production server
npm run lint        # Run ESLint
npm run format      # Format with Prettier
```

### Health Metrics Collection

The app collects the following metrics via Apple HealthKit (iOS) and Health Connect (Android):
- Steps (daily)
- Sleep (last night minutes)
- Heart Rate Variability (ms, daily average)
- Resting Heart Rate (bpm, daily average)
- Active Energy Burned (kcal, daily total)
- Mindful Sessions (minutes, daily total) — iOS only for now
- Respiratory Rate (breaths/min, daily average)
- Workouts (daily count)

These are persisted in the local encrypted SQLite database (`health_snapshots` table). On Android, ensure the following health permissions are granted; the app requests them at runtime via Health Connect: `READ_STEPS`, `READ_SLEEP`, `READ_HEART_RATE_VARIABILITY`, `READ_RESTING_HEART_RATE`, `READ_ACTIVE_CALORIES_BURNED`, `READ_RESPIRATORY_RATE`, `READ_EXERCISE`. Mindfulness is currently omitted on Android due to API level requirements.

If upgrading from an older schema, the app will attempt to add missing columns on startup.

### Mobile App

```bash
cd app
npm start                    # Start Expo development server
npx expo run:ios --device    # Run on iOS device
npx expo run:android --device # Run on Android device
npm run lint                 # Run ESLint
npm run format              # Format with Prettier
```

### Database Debugging (dev builds)

- Dev builds skip SQLCipher keying so the SQLite DB remains readable for inspection tools.
- In the app: Settings → Developer Options → Database Debug
  - Shows the on-device DB path
  - Share the `.db` via AirDrop/Files to open on your Mac
- Optional override: set `extra.DB_ENCRYPTION` in `app/app.json` to `"on"` or `"off"`.
  - Default is `off` in dev, `on` in production

## 📁 Project Structure

### Mobile App (`app/`)

```
app/
├── src/
│   ├── components/        # Reusable UI components
│   ├── screens/          # Screen components
│   ├── services/         # Business logic and API clients
│   ├── models/           # TypeScript interfaces
│   ├── hooks/            # Custom React hooks
│   ├── utils/            # Utility functions
│   └── theme/            # Design system
├── assets/               # Static assets
└── App.tsx               # Main application entry point
```

#### Notifications

- Bottom tab bar shows a red badge on the `Home` tab when there are active health alerts generated by the health metrics engine. The badge displays the count of undismissed alerts (capped at `9+`).

### Backend (`backend/`)

```
backend/
├── src/
│   ├── controllers/      # Request handlers
│   ├── services/         # Business logic
│   ├── routes/           # Express routes
│   ├── middleware/       # Custom middleware
│   └── models/           # TypeScript interfaces
└── package.json
```

## 🧪 Testing

Currently the project focuses on development. Testing infrastructure will be added in future iterations.

## 🤝 Contributing

1. Follow TypeScript and ESLint configurations
2. Maintain privacy-first principles
3. Add documentation for new features
4. Use conventional commit messages
5. Test on physical devices for 3D avatar functionality

## 📄 License

MIT License

---

_Built with privacy-first principles and user wellness in mind_ 🌱
