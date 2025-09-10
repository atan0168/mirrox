// Define available idle animations in order of preference
export const AVAILABLE_ANIMATIONS = [
  { name: 'M_Standing_Expressions_007', label: 'Cough' },
  { name: 'wiping_sweat', label: 'Wipe Sweat' },
  { name: 'shock', label: 'Shock' },
  { name: 'swat_bugs', label: 'Swat Bugs' },
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

export const FULL_SLEEP_MINUTES = 7.0 * 60; // 100% energy when last-night sleep >= 7.0h
export const AWAKE_DEPLETION_PER_MIN = 100 / (16 * 60); // ~16 hours awake to reach 0%
export const TICK_MS = 30 * 1000; // update roughly every 30s

export const RPM_SUBDOMAIN = 'mirrox';
export const RPM_APPLICATION_ID = '68ab0e092240338178fb429e';
export const USER_PROFILE_KEY = 'user_profile';
export const AVATAR_URL_KEY = 'avatar_url';
export const AVATAR_CACHE_KEY = 'avatar_cache';
export const DASHBOARD_ONBOARDING_SEEN_KEY = 'dashboard_onboarding_seen_v1';
export const UI_PERSIST_KEY = 'ui_persist_v1';
export const AVATAR_DEBUG = false; // Toggle verbose avatar debug logging
export const API_BASE_URL = __DEV__
  ? 'http://10.10.0.114:8080/api'
  : 'https://mirrox.iceon.top/api';
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
