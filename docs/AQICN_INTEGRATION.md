# AQICN Integration Documentation

## Overview

The backend now supports the AQICN (Air Quality Index China Network) API as the primary source for air quality data. AQICN provides real-time air quality data from monitoring stations worldwide and is refreshed every hour.

## API Key Configuration

Add your AQICN API key to the `.env` file:

```bash
AQICN_API_KEY=your_production_key_here
```

## New Endpoints

### 1. Primary Air Quality Endpoint (Updated)

**GET** `/api/air-quality`

Now uses AQICN as the primary source with OpenAQ as fallback.

**Query Parameters:**

- `latitude` (required): Latitude coordinate
- `longitude` (required): Longitude coordinate
- `source` (optional): Specify 'openaq' to force OpenAQ source

**Example:**

```bash
curl "http://localhost:3000/api/air-quality?latitude=-37.8136&longitude=144.9631"
```

### 2. AQICN-Specific Endpoints

#### Get Air Quality by Coordinates

**GET** `/api/air-quality/aqicn`

**Query Parameters:**

- `latitude` (required): Latitude coordinate
- `longitude` (required): Longitude coordinate

**Example:**

```bash
curl "http://localhost:3000/api/air-quality/aqicn?latitude=-37.8136&longitude=144.9631"
```

#### Get Air Quality by Station ID

**GET** `/api/air-quality/aqicn/station/:stationId`

**Parameters:**

- `stationId`: AQICN station ID

**Example:**

```bash
curl "http://localhost:3000/api/air-quality/aqicn/station/9572"
```

#### Search Stations

**GET** `/api/air-quality/aqicn/search`

**Query Parameters:**

- `latitude` (required): Latitude coordinate
- `longitude` (required): Longitude coordinate
- `radius` (optional): Search radius in km (default: 50)

**Example:**

```bash
curl "http://localhost:3000/api/air-quality/aqicn/search?latitude=-37.8136&longitude=144.9631&radius=25"
```

#### Clear AQICN Cache

**POST** `/api/air-quality/aqicn/clear-cache`

**Example:**

```bash
curl -X POST "http://localhost:3000/api/air-quality/aqicn/clear-cache"
```

## Response Format

AQICN responses include additional fields:

```json
{
  "success": true,
  "data": {
    "location": {
      "id": 9572,
      "name": "Melbourne CBD, Victoria, Australia",
      "coordinates": {
        "latitude": -37.8136,
        "longitude": 144.9631
      }
    },
    "aqi": 42,
    "primaryPollutant": "pm25",
    "pm25": 15.2,
    "pm10": 18.5,
    "no2": 25.3,
    "o3": 35.7,
    "classification": "Good",
    "colorCode": "#00E400",
    "healthAdvice": "Air quality is considered satisfactory, and air pollution poses little or no risk.",
    "source": "aqicn",
    "timestamp": "2025-08-28T09:00:00Z",
    "stationUrl": "https://aqicn.org/city/melbourne",
    "attributions": [
      {
        "name": "EPA Victoria",
        "url": "https://www.epa.vic.gov.au/"
      }
    ]
  },
  "cached": false,
  "cacheAge": null
}
```

## Caching

- **Cache Duration**: 30 minutes (same as other sources)
- **Cache Refresh**: AQICN data is refreshed every hour at the source
- **Cache Keys**: Prefixed with `aqicn_` for easy identification
- **Fallback**: If AQICN fails, the system automatically falls back to OpenAQ

## Error Handling

The integration includes comprehensive error handling:

- **401**: Invalid API key
- **404**: No monitoring stations found in the area
- **429**: Rate limit exceeded
- **500+**: Service temporarily unavailable

## Benefits of AQICN Integration

1. **Global Coverage**: Extensive network of monitoring stations worldwide
2. **Real-time Data**: Hourly updates from official sources
3. **Standardized AQI**: Uses internationally recognized AQI scale
4. **Rich Metadata**: Includes health advice, color codes, and source attributions
5. **Reliable Service**: High uptime and consistent data quality

## Migration Notes

- Existing OpenAQ and MyEQMS endpoints remain unchanged
- Main air quality endpoint now defaults to AQICN
- Cache keys are separate, so no cache conflicts
- All existing client code continues to work without changes

## Testing

Test the integration with sample coordinates:

```bash
# Melbourne, Australia
curl "http://localhost:3000/api/air-quality/aqicn?latitude=-37.8136&longitude=144.9631"

# London, UK
curl "http://localhost:3000/api/air-quality/aqicn?latitude=51.5074&longitude=-0.1278"

# Beijing, China
curl "http://localhost:3000/api/air-quality/aqicn?latitude=39.9042&longitude=116.4074"
```
