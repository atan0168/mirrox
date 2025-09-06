import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Slider from '@react-native-community/slider';

type Props = {
  value: number; // 0..1
  onChange: (v: number) => void;
  direction: 'vertical' | 'angled';
  onChangeDirection: (d: 'vertical' | 'angled') => void;
};

export default function RainIntensityControls({ value, onChange, direction, onChangeDirection }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Rain Intensity</Text>
      <View style={styles.sliderRow}>
        <Text style={styles.label}>Light</Text>
        <Slider
          style={styles.slider}
          minimumValue={0}
          maximumValue={1}
          step={0.05}
          value={value}
          minimumTrackTintColor="#2563EB"
          maximumTrackTintColor="#CBD5E1"
          thumbTintColor="#2563EB"
          onValueChange={onChange}
        />
        <Text style={styles.label}>Heavy</Text>
      </View>
      <Text style={styles.value}>{Math.round(value * 100)}%</Text>
      <View style={styles.directionRow}>
        <Text style={styles.title}>Rain Direction</Text>
        <View style={styles.chips}>
          <Text
            onPress={() => onChangeDirection('vertical')}
            style={[styles.chip, direction === 'vertical' && styles.activeChip]}
          >
            Vertical
          </Text>
          <Text
            onPress={() => onChangeDirection('angled')}
            style={[styles.chip, direction === 'angled' && styles.activeChip]}
          >
            Angled
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: 12 },
  title: { fontSize: 14, fontWeight: '600', color: '#2D3748', marginBottom: 6 },
  sliderRow: { flexDirection: 'row', alignItems: 'center' },
  slider: { flex: 1, marginHorizontal: 8 },
  label: { fontSize: 12, color: '#4A5568', width: 40, textAlign: 'center' },
  value: { marginTop: 4, fontSize: 12, color: '#475569' },
  directionRow: { marginTop: 12 },
  chips: { flexDirection: 'row', gap: 8 },
  chip: {
    backgroundColor: '#374151',
    color: 'white',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 16,
    marginRight: 8,
    overflow: 'hidden',
  },
  activeChip: { backgroundColor: '#2563EB' },
});
