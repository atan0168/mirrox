# Digital Twin Mobile App

A React Native Expo app that creates a "digital twin" of the user to promote wellness and self-awareness.

## 🚀 Quick Start

1. **Install dependencies**:
   ```bash
   cd app
   npm install
   ```

2. **Start the development server**:
   ```bash
   npx expo start
   ```

3. **Run on device**:
   - Install [Expo Go](https://expo.dev/client) on your phone
   - Scan the QR code from the terminal

## 📱 App Flow

1. **Welcome Screen** - Requests location permission
2. **Questionnaire** - Collects sleep hours and commute preferences  
3. **Generating Twin** - Loading screen with progress indicators
4. **Dashboard** - Shows personalized avatar and health insights

## 🏗️ Architecture

### Privacy-First Design
- **No PII stored on backend** - All user data stays on device
- **Local storage only** - Uses MMKV for fast, encrypted local storage
- **Backend as proxy** - Server only proxies external API calls

### Tech Stack
- **React Native + Expo** - Cross-platform mobile development
- **TypeScript** - Type safety and better DX
- **MMKV** - Fast local storage
- **React Navigation** - Screen navigation
- **Expo Location** - Location services
- **React Native SVG** - Avatar graphics (planned)

## 📁 Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── Avatar.tsx      # User's digital twin avatar
│   ├── CommutePicker.tsx
│   └── SleepSlider.tsx
├── screens/            # App screens
│   ├── WelcomeScreen.tsx
│   ├── QuestionnaireScreen.tsx
│   ├── GeneratingTwinScreen.tsx
│   └── DashboardScreen.tsx
├── services/           # Business logic
│   ├── LocalStorageService.ts
│   └── ApiService.ts
└── models/             # TypeScript interfaces
    ├── User.ts
    ├── AirQuality.ts
    └── Avatar.ts
```

## 🔮 Current Features

✅ **Location-based onboarding** with graceful permission handling  
✅ **Local data persistence** using MMKV  
✅ **Dynamic avatar** based on sleep and environment  
✅ **Health insights** from user lifestyle data  
✅ **Mock air quality integration** (ready for real API)  

## 🛠️ Next Steps

1. **Enhanced Avatar System**
   - Implement full SVG-based avatar composition
   - Add more customization options based on user data

2. **Backend Integration**
   - Set up Node.js proxy server
   - Integrate with Malaysia DOE Air Quality API
   - Add error handling and caching

3. **Advanced Features**
   - Push notifications for air quality alerts
   - Weekly/monthly wellness reports
   - Social features (comparing with friends)
   - Gamification elements

4. **Polish & Testing**
   - Add comprehensive error handling
   - Implement data migration strategies
   - Add unit and integration tests
   - Improve accessibility

## 🔐 Privacy Features

- **Device-only storage** - User data never leaves the device
- **Minimal data collection** - Only location coordinates sent to backend
- **Transparent data usage** - Clear explanations of why data is needed
- **Easy data deletion** - Users can clear all data anytime

## 🧪 Development

The app is set up with:
- Hot reloading for fast development
- TypeScript for type safety
- Modular architecture for easy testing
- Clear separation of concerns

## 📋 API Integration Notes

When ready to connect the real backend:

1. Update `API_BASE_URL` in `ApiService.ts`
2. Replace mock data in `DashboardScreen.tsx`
3. Implement proper error handling for API failures
4. Add request caching for better performance

---

*Built with privacy-first principles and user wellness in mind* 🌱
