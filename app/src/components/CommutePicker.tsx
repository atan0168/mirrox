import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

interface CommutePickerProps {
  selectedValue: 'car' | 'transit' | 'wfh' | 'bike' | 'walk';
  onValueChange: (value: 'car' | 'transit' | 'wfh' | 'bike' | 'walk') => void;
}

const CommuteOption = ({ label, value, isSelected, onPress }: {
  label: string;
  value: string;
  isSelected: boolean;
  onPress: () => void;
}) => (
  <TouchableOpacity 
    style={[styles.option, isSelected && styles.selectedOption]} 
    onPress={onPress}
  >
    <Text style={[styles.optionText, isSelected && styles.selectedOptionText]}>
      {label}
    </Text>
  </TouchableOpacity>
);

export const CommutePicker: React.FC<CommutePickerProps> = ({ selectedValue, onValueChange }) => {
  const options = [
    { label: '🚗 Drive to Work', value: 'car' as const },
    { label: '🚇 Public Transport', value: 'transit' as const },
    { label: '🏠 Work from Home', value: 'wfh' as const },
    { label: '🚴 Bike to Work', value: 'bike' as const },
    { label: '🚶 Walk to Work', value: 'walk' as const },
  ];

  return (
    <View style={styles.container}>
      <Text style={styles.label}>How do you usually commute?</Text>
      {options.map((option) => (
        <CommuteOption
          key={option.value}
          label={option.label}
          value={option.value}
          isSelected={selectedValue === option.value}
          onPress={() => onValueChange(option.value)}
        />
      ))}
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
    marginBottom: 16,
    color: '#2D3748',
  },
  option: {
    padding: 16,
    marginVertical: 4,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  selectedOption: {
    borderColor: '#3182CE',
    backgroundColor: '#EBF8FF',
  },
  optionText: {
    fontSize: 16,
    color: '#4A5568',
    textAlign: 'center',
  },
  selectedOptionText: {
    color: '#2B6CB0',
    fontWeight: '600',
  },
});
