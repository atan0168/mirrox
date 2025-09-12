import { createNavigationContainerRef } from '@react-navigation/native';
import type { RootStackParamList } from '../../App';

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

export function navigate<Name extends keyof RootStackParamList>(
  name: Name,
  params?: RootStackParamList[Name]
) {
  if (navigationRef.isReady()) {
    // @ts-ignore cast for params optionality
    navigationRef.navigate(name as never, params as never);
  }
}

