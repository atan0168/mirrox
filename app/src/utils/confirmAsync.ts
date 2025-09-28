import { Alert } from 'react-native';

export function confirmAsync(message: string): Promise<boolean> {
  return new Promise(resolve => {
    Alert.alert('Confirm', message, [
      { text: 'Cancel', onPress: () => resolve(false), style: 'cancel' },
      { text: 'OK', onPress: () => resolve(true) },
    ]);
  });
}
