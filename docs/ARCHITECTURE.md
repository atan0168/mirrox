# Digital Twin Application Architecture

## Overview

The Digital Twin application is a privacy-first mobile wellness platform that creates personalized digital avatars based on air quality and personal health data. The architecture follows a hybrid approach with a Node.js backend for air quality data and local device storage for all personal information.

## Core Principles

### Privacy-First Design

- **Zero PII Storage**: No personally identifiable information is stored on backend servers
- **Local-First**: All user-generated data remains on the user's device
- **Minimal Data Transfer**: Only coordinates are sent to backend for air quality data

### Data Segregation

- **Public Data**: Air quality data from OpenAQ and MyEQMS APIs (backend)
- **Personal Data**: User profiles, avatar preferences, health metrics (local device storage)

## System Architecture

```mermaid
graph TB
    subgraph "Mobile App (React Native)"
        A[User Interface] --> B[Local Storage Service]
        A --> C[API Service]
        B --> D[MMKV Storage]
        C --> E[Backend API Client]

        subgraph "Local Data"
            D --> F[User Profile]
            D --> G[Health Metrics]
            D --> H[Avatar Preferences]
            D --> I[App Settings]
        end
    end

    subgraph "Backend Services (Node.js)"
        E --> J[Express API Gateway]
        J --> K[Air Quality Controller]

        K --> N[In-Memory Cache Service]

        N --> O[Memory Cache]
    end

    subgraph "External APIs"
        K --> T[OpenAQ API]
        K --> U[MyEQMS API]
    end

    subgraph "Infrastructure"
        J --> W[Rate Limiter]
        J --> X[Security Middleware]
        J --> Y[Logging Service]
    end
```

## Data Flow Architecture

```mermaid
sequenceDiagram
    participant User as Mobile App
    participant Local as Local Storage (MMKV)
    participant Backend as Node.js API
    participant Cache as In-Memory Cache
    participant External as External APIs

    Note over User,External: Initial Setup & Data Collection
    User->>Local: Store user profile (sleep, commute, gender, skin tone)
    User->>Backend: Request air quality data (lat, lon only)

    Backend->>Cache: Check cache for location
    alt Cache Hit
        Cache-->>Backend: Return cached data
    else Cache Miss
        Backend->>External: Fetch fresh air quality data (OpenAQ/MyEQMS)
        External-->>Backend: Return air quality data
        Backend->>Cache: Cache processed data
    end

    Backend-->>User: Return air quality data
    User->>Local: Combine with personal data
    User->>User: Generate avatar & display health status

    Note over User,External: Ongoing Usage
    User->>Backend: Periodic air quality updates
    Backend->>Cache: Update cache as needed
```

## Component Architecture

### Mobile Application (React Native)

#### Core Services

```mermaid
graph LR
    A[App Entry Point] --> B[Navigation Service]
    B --> C[Screen Components]

    C --> D[Local Storage Service]
    C --> E[API Service]
    C --> F[Avatar Service]
    C --> G[Health Analytics Service]

    D --> H[MMKV Storage]
    E --> I[Backend API Client]
    F --> J[Avatar Renderer]
    G --> K[Health Calculator]

    subgraph "Local Data Models"
        L[User Profile]
        M[Health Metrics]
        N[Avatar Config]
        O[App Preferences]
    end

    H --> L
    H --> M
    H --> N
    H --> O
```

#### Screen Flow

```mermaid
graph TD
    A[Splash Screen] --> B[Welcome Screen]
    B --> C[Questionnaire Screen]
    C --> D[Generating Twin Screen]
    D --> E[Avatar Creation Screen]
    E --> F[Dashboard Screen]

    F --> G[Settings Screen]
```

### Backend Services (Node.js)

#### Service Layer Architecture

```mermaid
graph TB
    subgraph "API Gateway Layer"
        A[Express Router] --> B[Authentication Middleware]
        B --> C[Rate Limiting]
        C --> D[Request Validation]
    end

    subgraph "Controller Layer"
        D --> E[Air Quality Controller]
    end

    subgraph "Service Layer"
        E --> I[OpenAQ API Service]
        E --> J[MyEQMS Service]
        E --> K[Rate Limiter Service]

        I --> M[Cache Service]
        J --> M
    end

    subgraph "Data Layer"
        M --> N[In-Memory Cache]
    end

    subgraph "External Integration"
        I --> P[OpenAQ API]
        J --> Q[MyEQMS API]
    end
```

## Data Storage

### In-Memory Cache Structure

The backend uses a simple in-memory cache for air quality data with TTL (Time To Live) support:

```typescript
interface CacheItem<T> {
  data: T;
  expiresAt: number;
  createdAt: number;
}

// Cache keys are generated based on coordinates
// Example: "air_quality_3.139_101.687"
```

### Local Storage Schema (MMKV)

```typescript
interface UserProfile {
  location: {
    latitude: number;
    longitude: number;
  };
  commuteMode: 'car' | 'transit' | 'wfh' | 'bike' | 'walk';
  sleepHours: number;
  gender: 'male' | 'female';
  skinTone: 'light' | 'medium' | 'dark';
  createdAt: string; // ISO 8601 date string
  schemaVersion?: number; // For future data migrations
  // Optional fields for future avatar customization
  ageRange?: 'young' | 'adult' | 'senior';
  preferredStyle?: 'casual' | 'professional' | 'sporty';
  // Security settings
  security?: {
    requireAuthentication: boolean;
    authMethod?: 'pin' | 'biometric' | 'both';
    lastAuthenticatedAt?: string;
  };
}
```

## API Design

### RESTful Endpoints

```yaml
# Air Quality
GET /api/air-quality?latitude={lat}&longitude={lon}
GET /api/air-quality/status
POST /api/air-quality/clear-cache
GET /api/air-quality/health

# Malaysian Air Quality (MyEQMS)
GET /api/air-quality/malaysia?latitude={lat}&longitude={lon}&radius={km}
GET /api/air-quality/malaysia/stations
GET /api/air-quality/malaysia/state/{state}
GET /api/air-quality/malaysia/region/{region}
GET /api/air-quality/malaysia/station/{stationId}
GET /api/air-quality/malaysia/station/{stationId}/trend

# General Health Check
GET /api/health
```

### Response Format

```typescript
interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  metadata?: {
    cached: boolean;
    cacheAge?: number;
    rateLimit?: {
      remaining: number;
      resetTime: number;
    };
  };
}
```

## Security Architecture

### Data Protection

```mermaid
graph TB
    subgraph "Mobile App Security"
        A[Biometric Authentication] --> B[Local Data Encryption]
        B --> C["Secure Storage (MMKV)"]
        C --> D[Certificate Pinning]
    end

    subgraph "Network Security"
        D --> E[HTTPS/TLS 1.3]
        E --> F[API Gateway]
        F --> G[Rate Limiting]
        G --> H[Request Validation]
    end

    subgraph "Backend Security"
        H --> I[CORS Policy]
        I --> J[Security Headers]
        J --> K[Input Sanitization]
        K --> L[SQL Injection Prevention]
    end

    subgraph "Infrastructure Security"
        L --> M[VPC Network]
        M --> N[Database Encryption]
        N --> O[Backup Encryption]
        O --> P[Access Logging]
    end
```

### Privacy Controls

- **Data Minimization**: Only collect necessary environmental coordinates
- **Anonymization**: Hash IP addresses and remove identifying headers
- **Retention Policies**: Automatic cleanup of old environmental data
- **User Control**: Complete local data export and deletion capabilities

## Performance Architecture

### Caching Strategy

```mermaid
graph LR
    A[Client Request] --> B{Cache Check}
    B -->|Hit| C[Return Cached Data]
    B -->|Miss| D[Fetch from External API]
    D --> E[Process Data]
    E --> F[Store in Cache]
    F --> G[Return to Client]

    subgraph "Cache Layers"
        H[In-Memory Cache - Hot Data]
        I[External APIs - Cold Data]
    end

    C --> H
    F --> H
    D --> I
```

### Optimization Strategies

- **Geographic Clustering**: Cache data by coordinate regions (rounded to 3 decimal places)
- **TTL-based Expiration**: 30-minute default cache expiration for air quality data
- **Rate Limiting**: Prevent API abuse with configurable request limits
- **Compression**: Gzip responses and optimize payload sizes

## Deployment Architecture

### Infrastructure Overview

```mermaid
graph TB
    subgraph "Client Tier"
        A[iOS App]
        B[Android App]
    end

    subgraph "Load Balancer"
        C[Application Load Balancer]
    end

    subgraph "Application Tier"
        D[Node.js Instance 1]
        E[Node.js Instance 2]
        F[Node.js Instance N]
    end

    subgraph "Cache Tier"
        G[Redis Cluster]
    end

    subgraph "External Services"
        H[OpenAQ API]
        I[MyEQMS API]
    end

    A --> C
    B --> C
    C --> D
    C --> E
    C --> F

    D --> G
    E --> G
    F --> G

    D --> H
    E --> I
    F --> H
```

### Environment Configuration

#### Development

- In-memory cache for air quality data
- Direct external API access (OpenAQ, MyEQMS)
- Hot reloading enabled
- Development logging

#### Production

- In-memory cache with TTL
- Rate-limited external API access
- Comprehensive monitoring and alerting
- Production logging and error handling

## Monitoring & Observability

### Metrics Collection

```mermaid
graph TB
    subgraph "Application Metrics"
        A[Response Times]
        B[Error Rates]
        C[Throughput]
        D[Cache Hit Rates]
    end

    subgraph "Infrastructure Metrics"
        E[CPU Usage]
        F[Memory Usage]
        G[Disk I/O]
        H[Network I/O]
    end

    subgraph "Business Metrics"
        I[API Usage Patterns]
        J[Geographic Distribution]
        K[Feature Adoption]
        L[Performance Insights]
    end

    A --> M[Monitoring Dashboard]
    B --> M
    C --> M
    D --> M
    E --> M
    F --> M
    G --> M
    H --> M
    I --> N[Analytics Dashboard]
    J --> N
    K --> N
    L --> N
```

### Health Checks

- **Application Health**: API endpoint responsiveness
- **Cache Health**: In-memory cache status and memory usage
- **External API Health**: OpenAQ and MyEQMS service availability

## Development Workflow

### Local Development Setup

```bash
# Backend setup
cd backend
npm install
cp .env.example .env
npm run dev

# Mobile app setup
cd app
npm install
npx pod-install  # iOS only
npm start
```

### Testing Strategy

- **Unit Tests**: Individual service and component testing
- **Integration Tests**: API endpoint and database interaction testing
- **E2E Tests**: Complete user flow testing
- **Performance Tests**: Load testing and benchmarking

## Current Implementation Status

### Implemented Features

#### Mobile App (React Native)

- ✅ User onboarding flow (Splash → Welcome → Questionnaire → Avatar Creation → Dashboard)
- ✅ Local storage using MMKV for user profiles
- ✅ 3D avatar rendering with Three.js
- ✅ Air quality data integration
- ✅ Avatar customization (skin tone, gender-based models)
- ✅ Settings screen

#### Backend (Node.js)

- ✅ Express API with security middleware (helmet, CORS, rate limiting)
- ✅ Air quality data from OpenAQ API
- ✅ Malaysian air quality data from MyEQMS API
- ✅ In-memory caching with TTL
- ✅ Rate limiting and request validation
- ✅ Health check endpoints

### Not Yet Implemented

- ❌ Weather data integration
- ❌ Database persistence (PostgreSQL/Redis)
- ❌ Advanced health analytics
- ❌ Push notifications
- ❌ Data export functionality
- ❌ Biometric authentication
- ❌ Advanced avatar animations based on health status

### Future Considerations

#### Scalability Enhancements

- **Database Integration**: Add PostgreSQL for data persistence and analytics
- **Redis Caching**: Replace in-memory cache with Redis for scalability
- **Microservices**: Split services by domain (air quality, weather, analytics)
- **Geographic Sharding**: Distribute data by geographic regions

#### Feature Expansions

- **Weather Integration**: Add weather data to complement air quality information
- **Machine Learning**: Predictive health insights based on environmental patterns
- **Real-time Updates**: WebSocket connections for live environmental data
- **Wearable Integration**: Sync with fitness trackers and health devices

This architecture accurately reflects the current implementation while providing a roadmap for future enhancements.
