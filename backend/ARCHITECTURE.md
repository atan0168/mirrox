# Digital Twin Backend Architecture

## Overview

The backend aggregates multiple data sources to power the Digital Twin experience across air quality, mobility, disease surveillance, location search, and nutrition insights. It is a TypeScript/Express service that centralises third-party integrations, enforces consistent validation and security controls, and exposes a unified REST API for the React Native client and future consumers.

## Core Layers

### Express Server (`src/app.ts`, `src/index.ts`)

- Bootstraps the HTTP server, wires middleware, and exposes `/api` routes with graceful shutdown logic.
- Provides a root index response describing available feature areas for quick smoke testing.

### Cross-cutting Middleware

- Security and transport: Helmet, CORS, compression, JSON/urlencoded body parsing, and global rate limiting (`express-rate-limit`).
- Observability: Morgan HTTP logger (prod vs dev formats) and a custom request logger for per-request diagnostics.
- Error handling: Not-found and structured error middleware to guarantee consistent JSON error responses.

### Routing & Controllers (`src/routes`, `src/controllers`)

- `src/routes/index.ts` mounts feature routers under `/api`.
- Each router delegates to a controller responsible for validation, error translation, and response shaping.

### Services (`src/services`)

- Encapsulate domain-specific integrations (AQICN, OpenAQ, TomTom Traffic, Malaysian dengue GIS, LocationIQ, DeepSeek, SQLite-backed nutrition catalogue, Python prediction microservice).
- Coordinate caching (`CacheService`), rate limiting (`RateLimiterService`, `AQICNRateLimiterService`), and downstream error handling.

### Data & Utilities

- `src/models` defines TypeScript interfaces and the `better-sqlite3` connection wrapper (`db.ts`).
- `src/utils` centralises configuration loading, binary/OCR helpers, name formatting, and error helpers.
- `src/settings` stores JSON configuration for nutrition portion units and thresholds.

## Domain Modules

### Air Quality Intelligence

- `AirQualityController` orchestrates AQICN as the primary source with OpenAQ fallback, guaranteeing data even when a provider is degraded.
- `AQICNService` and `ApiService` share a unified response format, enforce rate limits via dedicated services, and cache by geohash-like keys with configurable TTLs.
- `/api/air-quality/status` reports cache utilisation, rate limit state, and uptime for monitoring.

### Traffic Congestion

- `TrafficController` + `TrafficService` query TomTom Traffic Flow APIs for a coordinate pair, derive congestion factors, and cache results for five minutes to respect quotas.
- Status and cache management endpoints assist in diagnostics during testing.

### Dengue Surveillance

- `DengueController` fronts ArcGIS services hosted by Malaysia's MYSA through a proxy, providing state summaries, hotspot points, and outbreak polygons.
- `PredictionService` forwards `/api/dengue/predict` requests to the Python forecasting microservice (`PY_PREDICT_BASE_URL`) so the backend owns input validation and error translation.
- Shared caching prevents repeated heavy GIS queries.

### Location Search

- `LocationController` uses `LocationService` to call LocationIQ autocomplete, normalises address metadata, and enforces defensive behaviours (input length, rate-limit messaging).

### Food Recognition & Nutrition

- `FoodController` coordinates AI extraction (`DeepseekService`), OCR (`utils/ocrWorker` with bundled `eng.traineddata`), and nutrition lookups (`NutritionService`).
- `NutritionService` enriches extracted items with canonical entries from the bundled read-only SQLite nutrition catalogue (`nutrition.db`) and applies modifier logic (e.g., sugar reductions).
- Supporting assets in `src/settings` provide portion defaults and multiplier logic.

### AI Utilities

- `POST /api/ai/extract` exposes DeepSeek text+vision extraction as a standalone capability that other services, such as food analysis, can reuse.
- Optional Cloudinary uploads provide hosted image URLs when credentials are supplied.

## API Surface

### General

- `GET /api/health` – backend health check.

### Air Quality

- `GET /api/air-quality` – AQI, pollutants, and metadata for a coordinate pair (AQICN primary, OpenAQ fallback).
- `GET /api/air-quality/status` – cache and rate limit telemetry.
- `POST /api/air-quality/clear-cache` – clear cached air quality entries.
- `GET /api/air-quality/health` – service heartbeat.
- `GET /api/air-quality/aqicn` – AQICN data by coordinates.
- `GET /api/air-quality/aqicn/station/:stationId` – AQICN data by station id.
- `GET /api/air-quality/aqicn/search` – nearby AQICN stations.
- `POST /api/air-quality/aqicn/clear-cache` – clear AQICN-specific cache.

### Traffic

- `GET /api/traffic/congestion` – congestion factor and speed metrics.
- `GET /api/traffic/status` – service configuration and cache info.
- `POST /api/traffic/cache/clear` – clear cached traffic entries.

### Dengue

- `GET /api/dengue/states` – daily and cumulative state-level metrics.
- `GET /api/dengue/hotspots` – hotspot points around a coordinate + radius.
- `GET /api/dengue/outbreaks` – active outbreak polygons around a coordinate + radius.
- `GET /api/dengue/predict` – forwards prediction requests to the Python model service.

### Location

- `GET /api/location/autocomplete` – LocationIQ-backed autocomplete with normalised address payload.

### Food & AI

- `POST /api/food/analyze` – end-to-end extraction and nutrition analysis from text/image inputs.
- `GET /api/food/search` – FTS-backed search across the nutrition catalogue.
- `GET /api/food/:id` – canonical nutrition detail lookup.
- `POST /api/ai/extract` – raw DeepSeek extraction helper for text + imagery.

## React Native Integration

- The mobile app communicates through `app/src/services/BackendApiService.ts`, consolidating previous OpenAQ/TomTom/LocationIQ client logic into backend calls.
- The backend enforces authentication, rate limiting, and caching so the client maintains a lightweight surface and consistent response formats.

## Configuration

Environment variables are loaded via `src/utils/config.ts` and validated during startup. Missing required keys cause the process to exit, preventing partially configured deployments.

```env
PORT=3000
NODE_ENV=development

OPENAQ_API_KEY=...
AQICN_API_KEY=...
AQICN_RATE_LIMIT_PER_MINUTE=50
AQICN_RATE_LIMIT_WINDOW_MS=60000

ALLOWED_ORIGINS=http://localhost:3000,http://localhost:8081
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

CACHE_TTL_AIR_QUALITY=1800000
CACHE_TTL_LOCATION_SEARCH=3600000
CACHE_TTL_TRAFFIC=300000
CACHE_TTL_DENGUE=3600000

TOMTOM_API_KEY=...
LOCATIONIQ_API_KEY=...
LOCATIONIQ_BASE_URL=https://us1.locationiq.com/v1

PY_PREDICT_BASE_URL=http://localhost:8090
PY_PREDICT_TIMEOUT_MS=15000

DEEPSEEK_BASE_URL=https://api.deepseek.com/v1
DEEPSEEK_API_KEY=...
DEEPSEEK_TEXT_MODEL=deepseek-chat

CLOUDINARY_CLOUD_NAME=   # optional, enables hosted debug uploads
CLOUDINARY_UNSIGNED_PRESET=
```

## Data & Assets

- `nutrition.db` (read-only SQLite) and companion scripts under `scripts/` provide the nutrition catalogue consumed by `NutritionService`. Regenerate via `npm run seed:nutrition` when the dataset changes.
- `eng.traineddata` ships Tesseract language data locally, avoiding runtime downloads when performing OCR.
- Cached data remains in-memory only; persistence beyond process lifetime is not performed.

## Development Workflow

```bash
cd backend
npm install
cp .env.example .env   # populate keys
npm run dev            # ts-node-dev watcher
```

Run linting, formatting, and tests as needed:

```bash
npm run lint
npm run format:check
npm test
```

## Deployment

```bash
cd backend
npm run build
npm start
```

The build emits JavaScript into `dist/`. Provide production environment variables before starting the server (e.g., via a managed secret store or container runtime).

## Next Steps

1. Add automated tests across new controllers/services (traffic, dengue, food) to guard core integrations.
2. Instrument metrics/log aggregation for external API error rates and cache hit ratios.
3. Document the Python prediction microservice contract alongside versioning expectations.

## File Structure

```text
backend/
├── src/
│   ├── app.ts
│   ├── index.ts
│   ├── controllers/
│   │   ├── AirQualityController.ts
│   │   ├── DengueController.ts
│   │   ├── FoodController.ts
│   │   ├── LocationController.ts
│   │   └── TrafficController.ts
│   ├── middleware/
│   │   ├── errorHandler.ts
│   │   └── logger.ts
│   ├── models/
│   │   ├── AirQuality.ts
│   │   ├── Location.ts
│   │   ├── Traffic.ts
│   │   └── db.ts
│   ├── routes/
│   │   ├── ai.ts
│   │   ├── airQuality.ts
│   │   ├── dengue.ts
│   │   ├── food.ts
│   │   ├── index.ts
│   │   ├── location.ts
│   │   └── traffic.ts
│   ├── services/
│   │   ├── AQICNRateLimiterService.ts
│   │   ├── AQICNService.ts
│   │   ├── ApiService.ts
│   │   ├── CacheService.ts
│   │   ├── DeepseekService.ts
│   │   ├── DengueService.ts
│   │   ├── FoodService.ts
│   │   ├── LocationService.ts
│   │   ├── NutritionService.ts
│   │   ├── PredictionService.ts
│   │   ├── RateLimiterService.ts
│   │   └── TrafficService.ts
│   ├── settings/
│   │   ├── nutrition.thresholds.json
│   │   └── portion.units.json
│   └── utils/
│       ├── binary.ts
│       ├── config.ts
│       ├── displayName.ts
│       ├── error.ts
│       └── ocrWorker.ts
├── scripts/
│   ├── data/
│   ├── schema.sql
│   └── seed_nutrition.ts
├── nutrition.db
├── eng.traineddata
├── Dockerfile
├── package.json
└── README.md
```
