import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { User, UserX } from 'lucide-react-native';
import { colors, spacing, fontSize, borderRadius } from '../theme';

interface GenderPickerProps {
  selectedValue: 'male' | 'female';
  onValueChange: (value: 'male' | 'female') => void;
}

export const GenderPicker: React.FC<GenderPickerProps> = ({
  selectedValue,
  onValueChange,
}) => {
  const options = [
    {
      value: 'male' as const,
      label: 'Male',
      icon: User,
    },
    {
      value: 'female' as const,
      label: 'Female',
      icon: UserX,
    },
  ];

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Gender</Text>
      <Text style={styles.description}>
        This helps us select the right avatar template for you
      </Text>
      <View style={styles.optionsContainer}>
        {options.map(option => {
          const isSelected = selectedValue === option.value;
          const IconComponent = option.icon;

          return (
            <TouchableOpacity
              key={option.value}
              style={[styles.option, isSelected && styles.selectedOption]}
              onPress={() => onValueChange(option.value)}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.iconContainer,
                  isSelected && styles.selectedIconContainer,
                ]}
              >
                <IconComponent
                  size={24}
                  color={isSelected ? colors.white : colors.neutral[600]}
                />
              </View>
              <Text
                style={[
                  styles.optionText,
                  isSelected && styles.selectedOptionText,
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  label: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.black,
  },
  description: {
    fontSize: fontSize.sm,
    color: colors.neutral[600],
    lineHeight: 20,
  },
  optionsContainer: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  option: {
    flex: 1,
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    backgroundColor: colors.white,
    gap: spacing.xs,
  },
  selectedOption: {
    borderColor: colors.neutral[700],
    backgroundColor: colors.neutral[100],
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.full,
    backgroundColor: colors.neutral[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedIconContainer: {
    backgroundColor: colors.neutral[700],
  },
  optionText: {
    fontSize: fontSize.sm,
    fontWeight: '500',
    color: colors.neutral[700],
  },
  selectedOptionText: {
    color: colors.neutral[800],
    fontWeight: '600',
  },
});
