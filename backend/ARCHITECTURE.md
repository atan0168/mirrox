# Digital Twin Backend Architecture

## Overview

This document outlines the backend architecture for the Digital Twin Air Quality application. The backend has been refactored to follow proper architectural patterns, moving away from direct API calls in the React Native app.

## Backend Components

### 1. **Express.js Server** (`src/index.ts`, `src/app.ts`)

- Production-ready server with graceful shutdown
- Security middleware (Helmet, CORS, Rate Limiting)
- Comprehensive logging and error handling

### 2. **Services Layer**

- **ApiService**: Handles OpenAQ API communication
- **CacheService**: In-memory caching with TTL
- **RateLimiterService**: Smart rate limiting based on API headers

### 3. **Controllers Layer**

- **AirQualityController**: Request handling and validation
- Input validation and error handling
- Response formatting

### 4. **Routes Layer**

- RESTful API endpoints
- Route organization and middleware application

### 5. **Models Layer**

- TypeScript interfaces for type safety
- API response standardization

## API Endpoints

### Air Quality Data

```
GET /api/air-quality?latitude={lat}&longitude={lon}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "location": { ... },
    "aqi": 45,
    "primaryPollutant": "PM2.5",
    "pm25": 12.5,
    "pm10": 18.2,
    "no2": 25.1
  },
  "cached": true,
  "cacheAge": 150000
}
```

### Service Health

```
GET /api/health
GET /api/air-quality/health
GET /api/air-quality/status
```

### Cache Management (Development)

```
POST /api/air-quality/clear-cache
```

## React Native Integration

### New Service Architecture

The React Native app now uses `BackendApiService` instead of direct OpenAQ calls:

```typescript
// OLD: Direct OpenAQ API calls
import { apiService } from "./ApiService"; // Complex, rate-limited OpenAQ client

// NEW: Simple backend API calls
import { backendApiService } from "./BackendApiService"; // Clean, simple HTTP client
```

### Updated ApiService

The main `ApiService` now acts as a thin wrapper around the backend:

```typescript
// Simplified interface - complexity moved to backend
const airQualityData = await apiService.fetchAirQuality(lat, lon);
```

## Configuration

### Backend Environment Variables

```env
PORT=3000
NODE_ENV=development
OPENAQ_API_KEY=your_key_here
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:8081
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
CACHE_TTL_AIR_QUALITY=1800000
CACHE_TTL_LOCATION_SEARCH=3600000
```

### React Native Configuration

```typescript
// BackendApiService automatically detects environment
const API_BASE_URL = __DEV__
  ? "http://localhost:3000/api" // Development
  : "https://your-api.com/api"; // Production
```

## Benefits

### 1. **Security**

- API keys never exposed to client
- Server-side validation and sanitization
- CORS and security headers

### 2. **Performance**

- Centralized caching reduces API calls
- Intelligent rate limiting prevents quota exhaustion
- Compression and optimized responses

### 3. **Reliability**

- Graceful error handling
- Fallback to cached data when rate limited
- Health checks and monitoring

### 4. **Maintainability**

- Clear separation of concerns
- TypeScript for type safety
- Standardized error responses
- Comprehensive logging

### 5. **Scalability**

- Stateless design for horizontal scaling
- Configurable rate limits and cache TTLs
- Ready for load balancers and reverse proxies

## Development Workflow

### Starting the Backend

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your OpenAQ API key
npm run dev
```

### React Native Development

```bash
cd app
# Backend runs on localhost:3000
# React Native automatically connects in __DEV__ mode
npm start
```

### Production Deployment

```bash
cd backend
npm run build
npm start
```

## Next Steps

### Immediate

1. ✅ Backend service implemented
2. ✅ React Native client updated
3. ⏳ Test integration
4. ⏳ Deploy backend to cloud platform

## File Structure

```
backend/
├── src/
│   ├── controllers/       # Request handlers
│   │   └── AirQualityController.ts
│   ├── middleware/        # Express middleware
│   │   ├── errorHandler.ts
│   │   └── logger.ts
│   ├── models/           # TypeScript interfaces
│   │   └── AirQuality.ts
│   ├── routes/           # API routes
│   │   ├── index.ts
│   │   └── airQuality.ts
│   ├── services/         # Business logic
│   │   ├── ApiService.ts
│   │   ├── CacheService.ts
│   │   └── RateLimiterService.ts
│   ├── utils/            # Configuration
│   │   └── config.ts
│   ├── app.ts            # Express app setup
│   └── index.ts          # Server entry point
├── package.json
├── tsconfig.json
├── .env.example
└── README.md

app/src/services/
├── ApiService.ts         # Updated to use backend
├── BackendApiService.ts  # New backend client
├── CacheService.ts       # Legacy (can be removed)
└── RateLimiterService.ts # Legacy (can be removed)
```

This architecture provides a solid foundation for the Digital Twin application with proper separation of concerns, security, and scalability.
