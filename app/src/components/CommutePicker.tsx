import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Car, Train, Home, Bike, PersonStanding } from 'lucide-react-native';
import { colors, spacing, fontSize, borderRadius, shadows } from '../theme';

interface CommutePickerProps {
  selectedValue: 'car' | 'transit' | 'wfh' | 'bike' | 'walk';
  onValueChange: (value: 'car' | 'transit' | 'wfh' | 'bike' | 'walk') => void;
}

const CommuteOption = ({ label, value, icon, isSelected, onPress }: {
  label: string;
  value: string;
  icon: React.ReactNode;
  isSelected: boolean;
  onPress: () => void;
}) => (
  <Pressable 
    style={({ pressed }) => [
      styles.option, 
      isSelected && styles.selectedOption,
      pressed && styles.pressedOption
    ]} 
    onPress={onPress}
  >
    <View style={styles.optionContent}>
      <View style={[styles.iconContainer, isSelected && styles.selectedIconContainer]}>
        {icon}
      </View>
      <Text style={[styles.optionText, isSelected && styles.selectedOptionText]}>
        {label}
      </Text>
    </View>
  </Pressable>
);

export const CommutePicker: React.FC<CommutePickerProps> = ({ selectedValue, onValueChange }) => {
  const options = [
    { 
      label: 'Drive to Work', 
      value: 'car' as const, 
      icon: <Car size={20} color={selectedValue === 'car' ? colors.white : colors.neutral[600]} />
    },
    { 
      label: 'Public Transport', 
      value: 'transit' as const, 
      icon: <Train size={20} color={selectedValue === 'transit' ? colors.white : colors.neutral[600]} />
    },
    { 
      label: 'Work from Home', 
      value: 'wfh' as const, 
      icon: <Home size={20} color={selectedValue === 'wfh' ? colors.white : colors.neutral[600]} />
    },
    { 
      label: 'Bike to Work', 
      value: 'bike' as const, 
      icon: <Bike size={20} color={selectedValue === 'bike' ? colors.white : colors.neutral[600]} />
    },
    { 
      label: 'Walk to Work', 
      value: 'walk' as const, 
      icon: <PersonStanding size={20} color={selectedValue === 'walk' ? colors.white : colors.neutral[600]} />
    },
  ];

  return (
    <View style={styles.container}>
      <Text style={styles.label}>How do you usually commute?</Text>
      <View style={styles.optionsContainer}>
        {options.map((option) => (
          <CommuteOption
            key={option.value}
            label={option.label}
            value={option.value}
            icon={option.icon}
            isSelected={selectedValue === option.value}
            onPress={() => onValueChange(option.value)}
          />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {},
  label: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    marginBottom: spacing.md,
    color: colors.black,
  },
  optionsContainer: {
    gap: spacing.sm,
  },
  option: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    backgroundColor: colors.white,
    overflow: 'hidden',
    ...shadows.soft,
  },
  selectedOption: {
    borderColor: colors.neutral[400],
    backgroundColor: colors.neutral[900],
  },
  pressedOption: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    backgroundColor: colors.neutral[100],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  selectedIconContainer: {
    backgroundColor: colors.neutral[700],
  },
  optionText: {
    fontSize: fontSize.base,
    color: colors.neutral[700],
    fontWeight: '500',
    flex: 1,
  },
  selectedOptionText: {
    color: colors.white,
    fontWeight: '600',
  },
});
