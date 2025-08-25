import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Slider from '@react-native-community/slider';

interface SkinToneControlsProps {
  skinToneAdjustment: number;
  onSkinToneChange: (value: number) => void;
  visible?: boolean;
}

export function SkinToneControls({
  skinToneAdjustment,
  onSkinToneChange,
  visible = true,
}: SkinToneControlsProps) {
  if (!visible) return null;

  const getSkinToneLabel = (value: number): string => {
    if (value < -0.6) return 'Very Dark';
    if (value < -0.3) return 'Dark';
    if (value < -0.1) return 'Medium Dark';
    if (value < 0.1) return 'Medium';
    if (value < 0.3) return 'Medium Light';
    if (value < 0.6) return 'Light';
    return 'Very Light';
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Skin Tone</Text>
      <Text style={styles.label}>{getSkinToneLabel(skinToneAdjustment)}</Text>
      <View style={styles.sliderContainer}>
        <Text style={styles.sliderLabel}>Darker</Text>
        <Slider
          style={styles.slider}
          minimumValue={-1}
          maximumValue={1}
          value={skinToneAdjustment}
          onValueChange={onSkinToneChange}
          minimumTrackTintColor="#8B4513"
          maximumTrackTintColor="#F5DEB3"
          thumbTintColor="#4A90E2"
          step={0.1}
        />
        <Text style={styles.sliderLabel}>Lighter</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
    padding: 16,
    minWidth: 200,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  label: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 12,
  },
  sliderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  slider: {
    flex: 1,
    height: 40,
  },
  sliderLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
});
