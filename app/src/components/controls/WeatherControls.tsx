import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';

export type WeatherOption = 'sunny' | 'cloudy' | 'rainy' | 'night';

type WeatherControlsProps = {
  value: WeatherOption | null; // null means Auto (use prop/context)
  onChange: (value: WeatherOption | null) => void;
  visible?: boolean;
};

const OPTIONS: Array<{ key: WeatherOption | null; label: string }> = [
  { key: null, label: 'Auto' },
  { key: 'sunny', label: 'Sunny' },
  { key: 'cloudy', label: 'Cloudy' },
  { key: 'rainy', label: 'Rainy' },
  { key: 'night', label: 'Night' },
];

export function WeatherControls({
  value,
  onChange,
  visible = true,
}: WeatherControlsProps) {
  if (!visible) return null;
  return (
    <View style={styles.container}>
      {OPTIONS.map(opt => (
        <TouchableOpacity
          key={String(opt.key)}
          style={[styles.button, value === opt.key && styles.activeButton]}
          onPress={() => onChange(opt.key)}
        >
          <Text
            style={[
              styles.buttonText,
              value === opt.key && styles.activeButtonText,
            ]}
          >
            {opt.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 10,
    left: 10,
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.4)',
    padding: 6,
    borderRadius: 8,
  },
  button: {
    backgroundColor: '#374151',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    marginRight: 6,
  },
  activeButton: {
    backgroundColor: '#2563EB',
  },
  buttonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  activeButtonText: {
    color: 'white',
  },
});

export default WeatherControls;
