import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

interface Config {
  deepseek: {
    baseUrl: string;
    apiKey: string;
    textModel: string;
  };
  cloudinary: {
    cloudName?: string;
    preset?: string;
  };
  server: {
    port: number;
    nodeEnv: string;
  };
  openaq: {
    apiKey: string;
    baseUrl: string;
  };
  aqicn: {
    apiKey: string;
    baseUrl: string;
    rateLimit: {
      requestsPerMinute: number;
      windowMs: number;
    };
  };
  cors: {
    allowedOrigins: string[];
  };
  rateLimit: {
    windowMs: number;
    maxRequests: number;
  };
  locationiq: {
    apiKey: string;
    baseUrl: string;
  };
  cache: {
    airQualityTtl: number;
    locationSearchTtl: number;
    trafficTtl: number;
    dengueTtl: number;
  };
  tomtom: {
    apiKey: string;
  };
  pythonPredict: {
    baseUrl: string; // e.g. http://localhost:8000
    timeoutMs: number;
  };
}

const config: Config = {
  deepseek: {
    baseUrl: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1',
    apiKey: process.env.DEEPSEEK_API_KEY || '',
    textModel: process.env.DEEPSEEK_TEXT_MODEL || 'deepseek-chat',
  },
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    preset: process.env.CLOUDINARY_UNSIGNED_PRESET,
  },

  server: {
    port: parseInt(process.env.PORT || '3000', 10),
    nodeEnv: process.env.NODE_ENV || 'development',
  },
  openaq: {
    apiKey: process.env.OPENAQ_API_KEY || '',
    baseUrl: 'https://api.openaq.org/v3',
  },
  aqicn: {
    apiKey: process.env.AQICN_API_KEY || '',
    baseUrl: 'https://api.waqi.info',
    rateLimit: {
      requestsPerMinute: parseInt(
        process.env.AQICN_RATE_LIMIT_PER_MINUTE || '50',
        10
      ),
      windowMs: parseInt(process.env.AQICN_RATE_LIMIT_WINDOW_MS || '60000', 10), // 1 minute
    },
  },
  cors: {
    allowedOrigins: process.env.ALLOWED_ORIGINS
      ? process.env.ALLOWED_ORIGINS.split(',')
      : ['http://localhost:3000', 'http://localhost:8081'],
  },
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  },
  locationiq: {
    apiKey: process.env.LOCATIONIQ_API_KEY || '',
    baseUrl: process.env.LOCATIONIQ_BASE_URL || 'https://us1.locationiq.com/v1',
  },
  cache: {
    airQualityTtl: parseInt(process.env.CACHE_TTL_AIR_QUALITY || '1800000', 10), // 30 minutes
    locationSearchTtl: parseInt(
      process.env.CACHE_TTL_LOCATION_SEARCH || '3600000',
      10
    ), // 1 hour
    trafficTtl: parseInt(process.env.CACHE_TTL_TRAFFIC || '300000', 10), // 5 minutes
    dengueTtl: parseInt(process.env.CACHE_TTL_DENGUE || '3600000', 10), // 1 hours
  },
  tomtom: {
    apiKey: process.env.TOMTOM_API_KEY || '',
  },
  pythonPredict: {
    baseUrl: process.env.PY_PREDICT_BASE_URL || 'http://localhost:8090',
    timeoutMs: parseInt(process.env.PY_PREDICT_TIMEOUT_MS || '15000', 10),
  },
};

// Validate required environment variables
const requiredVars = [
  'OPENAQ_API_KEY',
  'AQICN_API_KEY',
  'TOMTOM_API_KEY',
  'LOCATIONIQ_API_KEY',
];
const missingVars = requiredVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error('Missing required environment variables:', missingVars);
  process.exit(1);
}
if (!config.deepseek.apiKey) {
  console.error('Missing required environment variable: DEEPSEEK_API_KEY');
  process.exit(1);
}

export default config;
