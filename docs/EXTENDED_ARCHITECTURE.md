```mermaid
flowchart LR

%% Direction
%% High-level digital twin system with data sources and epics

%% Client
subgraph Client["Client (Mobile/Web)"]
    U[["Aisyah (User)"]]
    APP["App UI + State"]
    RENDER["3D Twin Renderer"]
    U --> APP
    APP --> RENDER
end

%% Backend Core
subgraph Backend["Backend & Services"]
    APIGW["API Gateway / BFF"]
    AUTH["Auth & Privacy (Minimal PII)"]

    subgraph Ingestion["Data Ingestion & Adapters"]
    %%   SCHED["Scheduler (e.g., runs every 5 mins)"]
      ADAPT["API Adapters + Normalizers"]
    %%   SCHED --> ADAPT
    end

    subgraph Storage["Storage"]
      PROFILE[("User Profile & Location")]
      TIMESERIES[("Time‑Series Env Data (incl. Geo)")]
      CACHE[("Edge Cache")]
    end

    subgraph Engines["Engines (Features map to Epics)"]
      PERS["Personalization Engine (Epic 1)"]
      ENV["Living Environment Engine (Epic 2)"]
      DIET["Diet Deconstructor (Epic 3)"]
      OUTB["Outbreak Shield (Epic 4)"]
      STRESS["Stress & Burnout (Epic 5)"]
      NUDGE["Nudges & Quests (Epic 6)"]
      SOCIAL["Social & Sharing (Epic 7)"]
      AGING["Aging Simulator (Epic 8)"]
    end

    subgraph Notify["Notifications"]
      NUDGE_SVC["Nudge/Alert Service"]
      FEED["Activity Feed / Events"]
    end

    %% Core Data Flow
    APP <--> APIGW
    APIGW --> AUTH

    %% Ingestion to Storage Flow
    ADAPT --> TIMESERIES

    %% API Gateway to Services/Storage
    APIGW <--> PROFILE
    APIGW <--> CACHE
    APIGW --> PERS
    APIGW --> ENV
    APIGW --> DIET
    APIGW --> OUTB
    APIGW --> STRESS
    APIGW --> NUDGE
    APIGW --> SOCIAL
    APIGW --> AGING

    %% Engine Data Dependencies
    TIMESERIES --> PERS
    PROFILE --> PERS

    TIMESERIES --> ENV
    CACHE --> ENV

    TIMESERIES --> DIET
    TIMESERIES --> OUTB
    PROFILE --> STRESS
    TIMESERIES --> STRESS

    %% Notifications and Client Updates
    NUDGE --> NUDGE_SVC --> APIGW
    ENVDATA[/"Realtime overlays + Twin State"/] -.-> APP
    ENV -. "twin state" .-> ENVDATA
    PERS -. "initial state" .-> ENVDATA
    OUTB -. "alerts" .-> NUDGE_SVC
end

%% External Data Sources
subgraph Sources["External Open Data Sources (APIs)"]
    %% Air Quality
    subgraph AQ["Air Quality"]
        OPENAQ["OpenAQ (PM2.5, PM10, O3, NO2, SO2, CO)"]
        DOE["Malaysia DOE API (API readings)"]
        AQICN["AQICN"]
        MYEQMS["MyEQMS"]
    end
    %% Traffic / Noise / Mobility
    subgraph MOB["Traffic, Noise, Mobility"]
        GMAPS["Google Maps/Waze Traffic API"]
        EEA["EEA Noise Data (model ref)"]
        OSM["OpenStreetMap (geospatial context)"]
        GTFS["GTFS Feeds (RapidKL, etc.)"]
        GMR["Google Mobility Reports (archived)"]
    end
    %% Weather & UV
    subgraph WX["Weather & UV"]
        OWM["OpenWeatherMap API"]
        NASA["NASA POWER (solar/UV)"]
    end
    %% Nutrition & Prices
    subgraph NUTR["Nutrition & Food Supply"]
        FAO["FAOSTAT Food Balance"]
        DOSM["DOSM CPI (Food categories)"]
        MOA["MOA Food Balance / Supply"]
    end
    %% Disease & Outbreaks
    subgraph DIS["Disease & Outbreaks"]
        MOH["MOH Malaysia Dengue (open API)"]
        WHOF["WHO FluNet"]
        WHOD["WHO Dengue & Zika"]
        NEXT["Nextstrain (limited MY)"]
    end
end

%% Data flow from sources into ingestion/adapters
OPENAQ --> ADAPT
DOE --> ADAPT
AQICN --> ADAPT
MYEQMS --> ADAPT

GMAPS --> ADAPT
EEA --> ADAPT
OSM --> ADAPT
GTFS --> ADAPT
GMR --> ADAPT

OWM --> ADAPT
NASA --> ADAPT

FAO --> ADAPT
DOSM --> ADAPT
MOA --> ADAPT

MOH --> ADAPT
WHOF --> ADAPT
WHOD --> ADAPT
NEXT --> ADAPT

%% Client inputs to personalization
APP -- "Location + minimal inputs" --> APIGW

%% Styling for implementation status
classDef impl fill:#2ecc71,stroke:#1e8449,color:#fff;
classDef planned fill:#d0d3d4,stroke:#7b7d7d,color:#000;
class PERS,ENV impl;
class DIET,OUTB,STRESS,NUDGE,SOCIAL,AGING planned;
```

Key notes

- Data ingestion: Pulls from open APIs on schedule, normalizes to a common schema, and streams into time-series and geospatial stores.
- Epic mapping: Personalization (Epic 1) computes initial twin; Living Environment (Epic 2) drives real-time visual effects; other engines are planned.
- Client flow: App sends location and minimal inputs; receives twin state and overlays via API for rendering.
- Privacy: Minimal PII, with profile/preferences separated from environmental data.
- Next step: I can add a variant diagram focused on Epic 1–2 data flows or save this in your repo (e.g., docs/architecture.mmd).
