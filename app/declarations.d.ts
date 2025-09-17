import type { SvgProps as DefaultSvgProps } from 'react-native-svg';

declare module 'react-native-svg' {
  interface SvgProps extends DefaultSvgProps {
    className?: string;
  }
}

// Minimal shims for optional Expo modules used via dynamic require
declare module 'expo-clipboard' {
  export function setStringAsync(text: string): Promise<void>;
}

declare module 'expo-sharing' {
  export function isAvailableAsync(): Promise<boolean>;
  export function shareAsync(
    url: string,
    options?: { dialogTitle?: string }
  ): Promise<void>;
}
