import { Alert } from 'react-native';

export function confirmAsync(message: string): Promise<boolean> {
  return new Promise((resolve) => {
    Alert.alert('确认', message, [
      { text: '否', onPress: () => resolve(false), style: 'cancel' },
      { text: '是', onPress: () => resolve(true) },
    ]);
  });
}
