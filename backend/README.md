# Digital Twin Backend API

A Node.js/Express.js backend service for the Digital Twin Air Quality application. This service provides air quality data from OpenAQ API with caching, rate limiting, and proper error handling.

## Features

- 🌬️ **Air Quality Data**: Fetch real-time air quality data from OpenAQ API
- 🚗 **Traffic Congestion**: Get real-time traffic congestion factors using TomTom API
- 📊 **AQI Calculation**: Calculate US EPA Air Quality Index from PM2.5 data
- 🚀 **Performance**: In-memory caching to reduce API calls
- ⚡ **Rate Limiting**: Smart rate limiting to respect API limits
- 🔒 **Security**: CORS, Helmet, and other security middleware
- 📝 **Logging**: Comprehensive request and error logging
- 🏥 **Health Checks**: Service health and status endpoints

## Prerequisites

- Node.js 18+
- npm or yarn
- OpenAQ API key
- TomTom API key

## Installation

1. Clone the repository and navigate to the backend directory:

```bash
cd backend
```

2. Install dependencies:

```bash
npm install
```

3. Copy the environment template and configure:

```bash
cp .env.example .env
```

4. Edit `.env` with your configuration:

```env
PORT=3000
NODE_ENV=development
OPENAQ_API_KEY=your_openaq_api_key_here
TOMTOM_API_KEY=your_tomtom_api_key_here
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:8081
```

## Development

Start the development server:

```bash
npm run dev
```

The server will start on `http://localhost:3000` with hot reloading enabled.

## Production

1. Build the project:

```bash
npm run build
```

2. Start the production server:

```bash
npm start
```

## API Endpoints

### Traffic Congestion

#### GET `/api/traffic/congestion`

Get traffic congestion factor for given coordinates using TomTom Traffic Flow API.

**Query Parameters:**

- `lat` (required): Latitude coordinate (-90 to 90)
- `lng` (required): Longitude coordinate (-180 to 180)

**Example:**

```bash
curl "http://localhost:3000/api/traffic/congestion?lat=3.1390&lng=101.6869"
```

**Response:**

```json
{
  "success": true,
  "data": {
    "latitude": 3.1390,
    "longitude": 101.6869,
    "congestionFactor": 1.45,
    "currentSpeed": 35,
    "freeFlowSpeed": 50,
    "currentTravelTime": 120,
    "freeFlowTravelTime": 83,
    "stressLevel": "mild",
    "confidence": 0.95,
    "roadClosure": false,
    "timestamp": "2024-01-15T10:30:00.000Z",
    "cached": false
  },
  "thresholds": {
    "none": { "max": 1.3 },
    "mild": { "min": 1.3, "max": 2.0 },
    "moderate": { "min": 2.0, "max": 3.0 },
    "high": { "min": 3.0 }
  },
  "meta": {
    "requestedCoordinates": { "latitude": 3.1390, "longitude": 101.6869 },
    "cacheAge": null,
    "timestamp": "2024-01-15T10:30:00.000Z"
  }
}
```

**Congestion Factor Interpretation:**
- `1.0` - No congestion (free flow)
- `1.3` - Light congestion (30% longer travel time)
- `2.0` - Moderate congestion (twice as long)
- `3.0+` - Heavy congestion (3x or more travel time)

**Stress Levels:**
- `none`: Factor ≤ 1.3 (up to 30% longer)
- `mild`: Factor 1.3-2.0 (30%-100% longer)
- `moderate`: Factor 2.0-3.0 (2x-3x longer)
- `high`: Factor > 3.0 (more than 3x longer)

#### GET `/api/traffic/status`

Get traffic service status and configuration.

#### POST `/api/traffic/cache/clear`

Clear the traffic cache (development only).

### Air Quality

#### GET `/api/air-quality`

Fetch air quality data for given coordinates.

**Query Parameters:**

- `latitude` (required): Latitude coordinate (-90 to 90)
- `longitude` (required): Longitude coordinate (-180 to 180)

**Example:**

```bash
curl "http://localhost:3000/api/air-quality?latitude=-37.8136&longitude=144.9631"
```

**Response:**

```json
{
  "success": true,
  "data": {
    "location": {
      "id": 123,
      "name": "Melbourne",
      "coordinates": {
        "latitude": -37.8136,
        "longitude": 144.9631
      }
    },
    "measurements": [...],
    "aqi": 45,
    "primaryPollutant": "PM2.5",
    "pm25": 12.5
  },
  "cached": false,
  "cacheAge": null
}
```

#### GET `/api/air-quality/status`

Get service status and cache statistics.

#### POST `/api/air-quality/clear-cache`

Clear the air quality cache (development only).

#### GET `/api/air-quality/health`

Health check endpoint.

### General

#### GET `/api/health`

General API health check.

#### GET `/`

API information and available endpoints.

## Environment Variables

| Variable                    | Description             | Default                                       | Required |
| --------------------------- | ----------------------- | --------------------------------------------- | -------- |
| `PORT`                      | Server port             | `3000`                                        | No       |
| `NODE_ENV`                  | Environment             | `development`                                 | No       |
| `OPENAQ_API_KEY`            | OpenAQ API key          | -                                             | Yes      |
| `TOMTOM_API_KEY`            | TomTom API key          | -                                             | Yes      |
| `ALLOWED_ORIGINS`           | CORS allowed origins    | `http://localhost:3000,http://localhost:8081` | No       |
| `RATE_LIMIT_WINDOW_MS`      | Rate limit window       | `900000` (15 min)                             | No       |
| `RATE_LIMIT_MAX_REQUESTS`   | Max requests per window | `100`                                         | No       |
| `CACHE_TTL_AIR_QUALITY`     | Air quality cache TTL   | `1800000` (30 min)                            | No       |
| `CACHE_TTL_LOCATION_SEARCH` | Location cache TTL      | `3600000` (1 hour)                            | No       |
| `CACHE_TTL_TRAFFIC`         | Traffic cache TTL       | `300000` (5 min)                              | No       |

## Project Structure

```
backend/
├── src/
│   ├── controllers/       # Request handlers
│   ├── middleware/        # Express middleware
│   ├── models/           # TypeScript interfaces
│   ├── routes/           # API routes
│   ├── services/         # Business logic
│   ├── utils/            # Utilities and config
│   ├── app.ts            # Express app configuration
│   └── index.ts          # Server entry point
├── package.json
├── tsconfig.json
└── .env.example
```

## Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm test` - Run tests (when implemented)
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint issues

## Error Handling

The API returns consistent error responses:

```json
{
  "success": false,
  "error": "Error message here"
}
```

Common HTTP status codes:

- `200` - Success
- `400` - Bad Request (invalid parameters)
- `429` - Too Many Requests (rate limited)
- `500` - Internal Server Error

## Caching Strategy

- **Air Quality Data**: Cached for 30 minutes to balance freshness with API usage
- **Location Data**: Cached for 1 hour since monitoring stations rarely change
- **Traffic Data**: Cached for 5 minutes due to rapidly changing traffic conditions
- **Cache Keys**: Generated from coordinates rounded to 3 decimal places for efficient grouping

## Rate Limiting

The service implements intelligent rate limiting:

- Tracks OpenAQ API rate limit headers
- Implements request queuing when approaching limits
- Falls back to cached data when rate limited
- Conservative request pacing to stay within limits

## Security

- **CORS**: Configurable allowed origins
- **Helmet**: Security headers
- **Rate Limiting**: API endpoint rate limiting
- **Input Validation**: Parameter validation and sanitization
- **Error Handling**: No sensitive information in error responses

## Contributing

1. Follow TypeScript and ESLint configurations
2. Add tests for new features
3. Update documentation for API changes
4. Use conventional commit messages

## License

MIT License
