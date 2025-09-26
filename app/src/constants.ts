export const STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty';

// Define available idle animations in order of preference
export const AVAILABLE_ANIMATIONS = [
  { name: 'M_Standing_Expressions_007', label: 'Cough' },
  { name: 'wiping_sweat', label: 'Wipe Sweat' },
  { name: 'shock', label: 'Shock' },
  { name: 'swat_bugs', label: 'Swat Bugs' },
  { name: 'drinking', label: 'Drink Water' },
  { name: 'breathing', label: 'Breathing' },
  { name: 'yawn', label: 'Yawn' },
  { name: 'sleeping', label: 'Sleeping' },
  { name: 'sleeping_idle', label: 'Idle Sleeping' },
  { name: 'slump', label: 'Slump' },
];

export const IDLE_ANIMATIONS = [
  'M_Standing_Idle_Variations_007',
  'M_Standing_Idle_Variations_003',
  // fallback
  'idle_breathing',
];

export const ONE_SHOT_ANIMATION_KEYWORDS = ['drinking'];

export const FULL_SLEEP_MINUTES = 7.5 * 60; // 100% energy when last-night sleep >= 7.5h
export const AWAKE_DEPLETION_PER_MIN = 100 / (24 * 60); // 24 hours to reach 0%
export const TICK_MS = 30 * 1000; // update roughly every 30s

export const RPM_SUBDOMAIN = 'mirrox';
export const RPM_APPLICATION_ID = '68ab0e092240338178fb429e';
export const USER_PROFILE_KEY = 'user_profile';
export const AVATAR_URL_KEY = 'avatar_url';
export const AVATAR_CACHE_KEY = 'avatar_cache';
export const DASHBOARD_ONBOARDING_SEEN_KEY = 'dashboard_onboarding_seen_v1';
export const UI_PERSIST_KEY = 'ui_persist_v1';
export const AVATAR_DEBUG = false; // Toggle verbose avatar debug logging
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;
// Persisted key for the last environmental query (lat/lng + timestamp)
export const LAST_ENV_QUERY_KEY = 'last_env_query_v1';
// Persisted key for reverse-geocode cache (keyed by rounded lat,lng)
export const REVERSE_GEOCODE_CACHE_KEY = 'reverse_geocode_cache_v1';
// Unified environmental refresh interval (ms)
export const ENV_REFRESH_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
// Reverse-geocode cache behavior
export const REVERSE_GEOCODE_ROUNDING_DECIMALS = 2; // ~1.1km granularity
export const MAX_REVERSE_GEOCODE_CACHE_ENTRIES = 500; // LRU cap
export const REVERSE_GEOCODE_TOUCH_MIN_MS = 10 * 60 * 1000; // 10 min between lastAccess writes
export const SLEEP_NOTIF_MIN_DAYS_BETWEEN = 1; // Frequency cap: min full days between
// Persisted key for alerts
export const ALERTS_KEY = 'alerts.items';
export const MAX_ALERTS = 50;
export const ALERT_RETENTION_DAYS = 30; // Auto-purge alerts older than this
// Hydration tracking
export const HYDRATION_PERSIST_KEY = 'hydration-state-v1';
export const DEFAULT_HYDRATION_GOAL_ML = 2000; // Default 2L daily goal
