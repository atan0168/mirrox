import { Platform } from 'react-native';
import type { HealthProvider } from './types';

let provider: HealthProvider | null = null;

try {
  if (Platform.OS === 'ios') {
    provider = require('./providers/HealthKitProvider.ios').default;
  } else if (Platform.OS === 'android') {
    provider = require('./providers/HealthConnectProvider.android').default;
  }
} catch {
  provider = null;
}

if (!provider) {
  provider = require('./providers/MockHealthProvider').default;
}

export const healthProvider: HealthProvider = provider!;
