# UV Index Timezone Implementation

## Overview

Updated the AQICN service to properly extract current UV index data by matching forecast dates against today's date in the correct timezone.

## Changes Made

### 1. Added dayjs Library

- Installed `dayjs` for robust date/time handling
- Added UTC and timezone plugins for proper timezone conversion

### 2. Enhanced UV Data Extraction

- **Timezone Parsing**: Added `parseTimezoneOffset()` method to handle AQICN timezone format (e.g., "+08:00")
- **Date Matching**: Converts current UTC time to station's local timezone
- **Smart Fallback**: Uses first available forecast if today's date not found
- **Detailed Logging**: Comprehensive logging for debugging UV data extraction

### 3. Implementation Details

#### Timezone Parsing

```typescript
private parseTimezoneOffset(timezoneStr: string): number {
  // Handles formats like "+08:00", "-05:00", etc.
  const match = timezoneStr.match(/^([+-])(\d{2}):(\d{2})$/);
  const [, sign, hours, minutes] = match;
  const totalMinutes = parseInt(hours) * 60 + parseInt(minutes);
  return sign === '+' ? totalMinutes : -totalMinutes;
}
```

#### UV Index Extraction Logic

```typescript
// Get today's date in station timezone
const timezoneOffsetMinutes = this.parseTimezoneOffset(stationTimezone);
const todayInStationTz = dayjs()
  .utc()
  .add(timezoneOffsetMinutes, 'minute')
  .format('YYYY-MM-DD');

// Find matching forecast
const todaysForecast = uvForecast.find(
  forecast => forecast.day === todayInStationTz
);
```

### 4. Error Handling & Fallbacks

- **Invalid Timezone**: Defaults to UTC if timezone parsing fails
- **Missing Today's Data**: Uses first available forecast entry
- **No UV Data**: Gracefully handles missing forecast data
- **Comprehensive Logging**: Logs all steps for debugging

### 5. Example Log Output

```
Looking for UV forecast for date: 2024-08-30 in timezone: +08:00 (offset: 480 minutes)
Available UV forecast dates: ['2024-08-30', '2024-08-31', '2024-09-01']
Found UV forecast for today (2024-08-30): UV Index 8 (avg), max: 10, min: 6
```

## Benefits

1. **Accurate UV Data**: Matches forecast to actual local date
2. **Timezone Aware**: Handles global locations correctly
3. **Robust Fallbacks**: Always provides UV data when available
4. **Debug Friendly**: Detailed logging for troubleshooting
5. **Error Resilient**: Graceful handling of edge cases

## Data Flow

1. **AQICN API** → Returns forecast with timezone info
2. **Parse Timezone** → Convert "+08:00" to offset minutes
3. **Calculate Local Date** → Get today's date in station timezone
4. **Match Forecast** → Find UV data for today's date
5. **Extract UV Index** → Use average UV for current day
6. **Fallback** → Use first available if today not found

## Testing Scenarios

The implementation handles:

- ✅ Standard timezones (+08:00, -05:00, etc.)
- ✅ UTC timezone (+00:00)
- ✅ Date boundary conditions (midnight crossover)
- ✅ Missing forecast data
- ✅ Invalid timezone formats
- ✅ Multiple forecast days

