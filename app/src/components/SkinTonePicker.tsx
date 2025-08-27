import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { colors, spacing, fontSize, borderRadius } from "../theme";

export type SkinTone = "light" | "medium" | "dark";

interface SkinTonePickerProps {
  selectedValue: SkinTone;
  onValueChange: (value: SkinTone) => void;
}

export const SkinTonePicker: React.FC<SkinTonePickerProps> = ({
  selectedValue,
  onValueChange,
}) => {
  const options: { value: SkinTone; label: string; color: string }[] = [
    {
      value: "light",
      label: "Light",
      color: "#F7D2A7",
    },
    {
      value: "medium",
      label: "Medium",
      color: "#E2A868",
    },
    {
      value: "dark",
      label: "Dark",
      color: "#8B4513",
    },
  ];

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Skin Tone</Text>
      <Text style={styles.description}>
        Choose the skin tone that best represents you
      </Text>
      <View style={styles.optionsContainer}>
        {options.map((option) => {
          const isSelected = selectedValue === option.value;
          
          return (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.option,
                isSelected && styles.selectedOption,
              ]}
              onPress={() => onValueChange(option.value)}
              activeOpacity={0.7}
            >
              <View style={[
                styles.swatch,
                { backgroundColor: option.color },
                isSelected && styles.selectedSwatch,
              ]} />
              <Text style={[
                styles.optionText,
                isSelected && styles.selectedOptionText,
              ]}>
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
    fontWeight: "600",
    color: colors.black,
  },
  description: {
    fontSize: fontSize.sm,
    color: colors.neutral[600],
    lineHeight: 20,
  },
  optionsContainer: {
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  option: {
    flex: 1,
    alignItems: "center",
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
  swatch: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.full,
    borderWidth: 2,
    borderColor: colors.neutral[200],
  },
  selectedSwatch: {
    borderColor: colors.neutral[700],
    borderWidth: 3,
  },
  optionText: {
    fontSize: fontSize.sm,
    fontWeight: "500",
    color: colors.neutral[700],
  },
  selectedOptionText: {
    color: colors.neutral[800],
    fontWeight: "600",
  },
});
