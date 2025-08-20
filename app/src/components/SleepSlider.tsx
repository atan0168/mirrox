import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Slider from '@react-native-community/slider';

interface SleepSliderProps {
  value: number;
  onValueChange: (value: number) => void;
}

export const SleepSlider: React.FC<SleepSliderProps> = ({ value, onValueChange }) => {
  const getSleepEmoji = (hours: number) => {
    if (hours < 5) return '😴';
    if (hours < 6) return '😪';
    if (hours < 7) return '😊';
    if (hours < 9) return '😀';
    return '😴';
  };

  const getSleepDescription = (hours: number) => {
    if (hours < 5) return 'Very Sleep Deprived';
    if (hours < 6) return 'Sleep Deprived';
    if (hours < 7) return 'Could Use More Sleep';
    if (hours < 8) return 'Good Sleep';
    if (hours < 9) return 'Great Sleep';
    return 'Lots of Sleep';
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>How many hours do you usually sleep?</Text>
      
      <View style={styles.valueContainer}>
        <Text style={styles.emoji}>{getSleepEmoji(value)}</Text>
        <Text style={styles.value}>{value.toFixed(1)} hours</Text>
        <Text style={styles.description}>{getSleepDescription(value)}</Text>
      </View>

      <Slider
        style={styles.slider}
        minimumValue={3}
        maximumValue={12}
        value={value}
        onValueChange={onValueChange}
        step={0.5}
        minimumTrackTintColor="#3182CE"
        maximumTrackTintColor="#E2E8F0"
        thumbStyle={styles.thumb}
      />

      <View style={styles.rangeLabels}>
        <Text style={styles.rangeLabel}>3h</Text>
        <Text style={styles.rangeLabel}>12h</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 20,
  },
  label: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 20,
    color: '#2D3748',
    textAlign: 'center',
  },
  valueContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  emoji: {
    fontSize: 48,
    marginBottom: 8,
  },
  value: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2D3748',
    marginBottom: 4,
  },
  description: {
    fontSize: 16,
    color: '#4A5568',
  },
  slider: {
    width: '100%',
    height: 40,
  },
  thumb: {
    backgroundColor: '#3182CE',
    width: 20,
    height: 20,
  },
  rangeLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  rangeLabel: {
    fontSize: 14,
    color: '#718096',
  },
});
