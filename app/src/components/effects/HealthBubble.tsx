import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export function HealthBubble({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <View style={styles.container} pointerEvents="none">
      <View style={styles.bubble}>
        <Text style={styles.text}>{message}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 10,
    bottom: 10,
    maxWidth: '70%',
  },
  bubble: {
    backgroundColor: 'rgba(0,0,0,0.75)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  text: {
    color: 'white',
    fontSize: 12,
    lineHeight: 16,
  },
});

export default HealthBubble;
