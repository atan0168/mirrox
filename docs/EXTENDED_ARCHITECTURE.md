```mermaid
flowchart LR

    subgraph Client["Client (Mobile App)"]
        User["Aisyah (User)"]
        UI["React Native UI"]
        Local["Local Store (MMKV / SQLite)"]
        Api["BackendApiService"]
        User --> UI
        UI --> Local
        UI --> Api
    end

    subgraph Backend["Backend (Express API)"]
        Router["Express Router + Middleware"]
        Air["AirQualityController"]
        Traffic["TrafficController"]
        Dengue["DengueController"]
        LocationCtrl["LocationController"]
        Food["FoodController"]
        AI["AI Router"]
        Cache["CacheService"]
        Nutrition["nutrition.db (read-only)"]
        OCR["OCR Worker (tesseract.js)"]
        DeepseekSvc["DeepseekService"]

        Router --> Air
        Router --> Traffic
        Router --> Dengue
        Router --> LocationCtrl
        Router --> Food
        Router --> AI

        Air --> Cache
        Traffic --> Cache
        Dengue --> Cache
        Cache --> Router

        Food --> Nutrition
        Food --> OCR
        Food --> DeepseekSvc
        AI --> DeepseekSvc
    end

    subgraph Assets["Local Assets"]
        Eng["eng.traineddata"]
    end

    subgraph Sources["External Services"]
        AQICN["AQICN Air Quality"]
        OpenAQ["OpenAQ Measurements"]
        TomTom["TomTom Traffic Flow"]
        MYSA["MYSA ArcGIS (Dengue)"]
        LocationIQ["LocationIQ Autocomplete"]
        DeepSeek["DeepSeek API"]
        Python["Python Prediction Service"]
        Cloudinary["Cloudinary Uploads (optional)"]
    end

    Api --> Router

    Air --> AQICN
    Air --> OpenAQ
    Traffic --> TomTom
    Dengue --> MYSA
    Dengue --> Python
    LocationCtrl --> LocationIQ
    DeepseekSvc --> DeepSeek
    DeepseekSvc -. optional .-> Cloudinary
    OCR --> Eng
```

Key notes

- The backend now exposes dedicated controllers for air quality, traffic, dengue intelligence, location autocomplete, food analysis, and AI extraction. Shared middleware (Helmet, CORS, compression, rate limiting, request logging) sits ahead of the router.
- `CacheService` provides in-memory caching for geospatial calls (air quality, traffic, dengue) with TTLs tuned per domain, while rate limiting protects upstream quotas (OpenAQ, AQICN).
- Food analysis relies on `DeepseekService` for multimodal extraction, optional OCR (`eng.traineddata`) for receipts, and `nutrition.db` for canonical nutrient lookups.
- The dengue controller fans out to both MYSA's ArcGIS proxy for hotspot/outbreak data and the Python prediction microservice for state forecasts.
- Optional integrations (Cloudinary uploads, Python service) are isolated so the mobile app can still function against the core Node backend when those services are unavailable.
