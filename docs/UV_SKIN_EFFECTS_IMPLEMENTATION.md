# UV Index Skin Effects Implementation

## Overview

Successfully implemented UV index-based skin effects for the 3D avatar system. The avatar now responds to both air quality (PM2.5 pollution) and UV exposure, creating realistic skin tone changes that simulate sunburn and tanning effects.

## Features Implemented

### 1. UV Skin Effect Calculations

- **UV Index Scale Support**: Handles UV index from 0-11+ with appropriate skin effects
- **Skin Tone Sensitivity**: Different effects based on base skin tone:
  - Light skin: More prone to redness/sunburn
  - Dark skin: More prone to tanning/darkening
- **Exposure Duration**: Configurable exposure hours (default: 2 hours)
- **Realistic Effects**: Gradual progression from minimal effects to severe sunburn/tanning

### 2. Combined Environmental Effects

- **Air Quality + UV**: Combines pollution effects (PM2.5 darkening) with UV effects
- **Smart Prioritization**: Determines primary environmental factor affecting skin
- **Health Recommendations**: Provides actionable advice based on combined conditions

### 3. Backend UV Data Integration

- **AQICN UV Extraction**: Extracts UV index from AQICN forecast data
- **API Enhancement**: Updated all API interfaces to include UV data
- **Data Flow**: UV data flows from backend → API service → dashboard → avatar

### 4. Avatar Visual Effects

- **Dynamic Skin Adjustment**: Real-time skin tone changes based on environmental data
- **Redness Effects**: Simulates sunburn redness for lighter skin tones
- **Tanning Effects**: Simulates darkening/tanning for all skin tones
- **Smooth Transitions**: Gradual color changes based on UV intensity

## Technical Implementation

### Files Modified

1. **`app/src/utils/skinEffectsUtils.ts`**
   - Added `calculateSkinEffectFromUV()` function
   - Added `calculateCombinedEnvironmentalSkinEffects()` function
   - Added UV protection recommendations

2. **`app/src/models/AirQuality.ts`**
   - Added `uvIndex` and `uvForecast` fields to AirQualityData interface

3. **`app/src/services/BackendApiService.ts`**
   - Added UV fields to API response interface

4. **`app/src/services/ApiService.ts`**
   - Updated data transformation to include UV data

5. **`app/src/screens/DashboardScreen.tsx`**
   - Switched to combined environmental skin effects
   - Added UV data extraction from air quality response

6. **`backend/src/services/AQICNService.ts`**
   - Added UV data extraction from AQICN forecast
   - Updated `convertToUnifiedFormat()` method

## UV Effect Algorithm

### UV Index Thresholds

- **0-2 (Low)**: Minimal skin effects
- **3-5 (Moderate)**: Slight tanning possible
- **6-7 (High)**: Noticeable tanning/mild sunburn
- **8-10 (Very High)**: Significant effects
- **11+ (Extreme)**: Severe sunburn risk

### Skin Sensitivity Calculation

```typescript
const skinSensitivity = Math.max(0.3, 1 + baseSkinTone * 0.7);
// Range: 0.3 (dark skin) to 1.7 (light skin)
```

### Effect Application

- **Light Skin**: `redness * 0.7 - darkening * 0.3` (emphasizes sunburn)
- **Dark Skin**: `darkening * 0.8 + redness * 0.2` (emphasizes tanning)

## Health Recommendations

The system now provides contextual health advice:

- **UV Protection**: Sunscreen, protective clothing, shade recommendations
- **Pollution Protection**: Face masks, antioxidant skincare
- **Combined Advice**: Tailored recommendations for high UV + pollution days

## Usage Example

```typescript
const skinEffects = calculateCombinedEnvironmentalSkinEffects(
  {
    pm25: 45, // Moderate pollution
    aqi: 85,
  },
  {
    uvIndex: 8, // Very high UV
    exposureHours: 3,
  },
  0.2 // Light-medium skin tone
);

// Result:
// {
//   totalAdjustment: 0.15,     // Slight redness from UV
//   pollutionEffect: -0.12,    // Darkening from pollution
//   uvEffect: 0.27,            // Redness from UV exposure
//   redness: 0.35,             // Sunburn effect
//   primaryFactor: 'UV exposure',
//   recommendations: [
//     'Very High UV - avoid sun exposure, use SPF 30+',
//     'Consider wearing a face mask outdoors'
//   ]
// }
```
