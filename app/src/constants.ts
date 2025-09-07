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

export const RPM_SUBDOMAIN = 'mirrox';
export const RPM_APPLICATION_ID = '68ab0e092240338178fb429e';
export const USER_PROFILE_KEY = 'user_profile';
export const AVATAR_URL_KEY = 'avatar_url';
export const AVATAR_CACHE_KEY = 'avatar_cache';
export const AVATAR_DEBUG = false; // Toggle verbose avatar debug logging
export const API_BASE_URL = __DEV__
  ? 'http://10.10.0.113:8080/api'
  : 'https://mirrox.iceon.top/api';
