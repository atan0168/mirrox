import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Slider from '@react-native-community/slider';
import { Moon, Sun } from 'lucide-react-native';
import { colors, spacing, fontSize, borderRadius } from '../theme';

interface SleepSliderProps {
  value: number;
  onValueChange: (value: number) => void;
}

export const SleepSlider: React.FC<SleepSliderProps> = ({ value, onValueChange }) => {
  const getSleepIcon = (hours: number) => {
    if (hours < 7) {
      return <Moon size={32} color={colors.neutral[600]} />;
    }
    return <Sun size={32} color={colors.neutral[600]} />;
  };

  const getSleepDescription = (hours: number) => {
    if (hours < 5) return 'Very Sleep Deprived';
    if (hours < 6) return 'Sleep Deprived';
    if (hours < 7) return 'Could Use More Sleep';
    if (hours < 8) return 'Good Sleep';
    if (hours < 9) return 'Great Sleep';
    return 'Lots of Sleep';
  };

  const getSleepQuality = (hours: number) => {
    if (hours < 6) return 'Poor';
    if (hours < 7) return 'Fair';
    if (hours < 8) return 'Good';
    if (hours < 9) return 'Excellent';
    return 'Excessive';
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>How many hours do you usually sleep?</Text>
      
      <View style={styles.valueContainer}>
        <View style={styles.iconContainer}>
          {getSleepIcon(value)}
        </View>
        
        <View style={styles.valueDisplay}>
          <Text style={styles.value}>{value.toFixed(1)} hours</Text>
          <View style={styles.qualityBadge}>
            <Text style={styles.qualityText}>{getSleepQuality(value)}</Text>
          </View>
        </View>
        
        <Text style={styles.description}>{getSleepDescription(value)}</Text>
      </View>

      <View style={styles.sliderContainer}>
        <Slider
          style={styles.slider}
          minimumValue={3}
          maximumValue={12}
          value={value}
          onValueChange={onValueChange}
          step={0.5}
          minimumTrackTintColor={colors.neutral[400]}
          maximumTrackTintColor={colors.neutral[200]}
          thumbTintColor={colors.white}
        />

        <View style={styles.rangeLabels}>
          <Text style={styles.rangeLabel}>3h</Text>
          <Text style={styles.rangeLabel}>12h</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {},
  label: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    marginBottom: spacing.lg,
    color: colors.black,
  },
  valueContainer: {
    alignItems: 'center',
    marginBottom: spacing.lg,
    padding: spacing.lg,
    backgroundColor: colors.neutral[50],
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.neutral[200],
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: borderRadius.full,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  valueDisplay: {
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  value: {
    fontSize: fontSize.xxl,
    fontWeight: '700',
    color: colors.black,
    marginBottom: spacing.xs,
  },
  qualityBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: colors.neutral[200],
    borderRadius: borderRadius.full,
  },
  qualityText: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    color: colors.neutral[700],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  description: {
    fontSize: fontSize.sm,
    color: colors.neutral[600],
    textAlign: 'center',
  },
  sliderContainer: {
    paddingHorizontal: spacing.sm,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  rangeLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  rangeLabel: {
    fontSize: fontSize.xs,
    color: colors.neutral[500],
    fontWeight: '500',
  },
});
