import { View, Text, StyleSheet } from 'react-native';
import Loader from './Loader';

interface LoadingStateProps {
  message?: string;
  width: number;
  height: number;
}

export function LoadingState({
  message = 'Loading avatar...',
  width,
  height,
}: LoadingStateProps) {
  return (
    <View style={[styles.container, { width, height }]}>
      <Loader />
      <Text style={styles.loadingText}>{message}</Text>
    </View>
  );
}

interface ErrorStateProps {
  error: string;
  width: number;
  height: number;
}

export function ErrorState({ error, width, height }: ErrorStateProps) {
  return (
    <View style={[styles.container, { width, height }]}>
      <Text style={styles.errorText}>{error}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f0f0f0',
    borderRadius: 12,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#4A5568',
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#E53E3E',
    textAlign: 'center',
    padding: 20,
  },
});
