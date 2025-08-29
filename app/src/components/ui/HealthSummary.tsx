import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { Card } from './Card';
import { colors, spacing, fontSize, borderRadius } from '../../theme';
import { UserProfile } from '../../models/User';
import { AirQualityData } from '../../models/AirQuality';

interface HealthSummaryProps {
  userProfile?: UserProfile;
  airQuality?: AirQualityData;
}

const clamp = (v: number, min = 0, max = 100) =>
  Math.min(max, Math.max(min, v));

const deriveEnergy = (sleep?: number | null) => {
  if (sleep == null) return 50;
  if (sleep >= 8) return 90;
  if (sleep >= 7) return 80;
  if (sleep >= 6) return 65;
  if (sleep >= 4) return 45;
  return 25;
};

const deriveLung = (aqi?: number | null) => {
  if (aqi == null) return 60;
  if (aqi <= 50) return 90;
  if (aqi <= 100) return 75;
  if (aqi <= 150) return 60;
  if (aqi <= 200) return 45;
  if (aqi <= 300) return 30;
  return 15;
};

const deriveSkinGlow = (sleep?: number | null, commute?: string | null) => {
  let v = 50;
  if (sleep != null) {
    if (sleep >= 8) v += 30;
    else if (sleep >= 7) v += 20;
    else if (sleep >= 6) v += 10;
    else if (sleep < 5) v -= 10;
  }
  switch (commute) {
    case 'walk':
    case 'bike':
      v += 10;
      break;
    case 'wfh':
      v += 8;
      break;
    case 'transit':
      v += 5;
      break;
    case 'car':
      v -= 5;
      break;
  }
  return clamp(v, 10, 95);
};

const getBarColor = (value: number): string => {
  if (value >= 85) return '#22C55E'; // fresh green (excellent)
  if (value >= 70) return '#2DD4BF'; // aqua / teal (good, cool modern vibe)
  if (value >= 55) return '#FACC15'; // golden yellow (caution)
  if (value >= 40) return '#F97316'; // modern orange (warning)
  return '#EF4444'; // clean red (critical)
};

interface ProgressRowProps {
  label: string;
  value: number;
}
const ProgressRow: React.FC<ProgressRowProps> = ({ label, value }) => {
  const animated = useRef(new Animated.Value(0)).current;
  const clamped = clamp(value);
  useEffect(() => {
    animated.setValue(0);
    Animated.timing(animated, {
      toValue: clamped,
      duration: 700,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false, // width animation
    }).start();
  }, [clamped, animated]);

  const widthInterpolate = animated.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  return (
    <View
      style={styles.row}
      accessibilityRole="summary"
      accessibilityLabel={`${label} ${clamped} percent`}
    >
      <View style={styles.rowHeader}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.percent}>{clamped}%</Text>
      </View>
      <View style={styles.track}>
        <Animated.View
          style={[
            styles.fill,
            { width: widthInterpolate, backgroundColor: getBarColor(clamped) },
          ]}
        />
      </View>
    </View>
  );
};

const HealthSummary: React.FC<HealthSummaryProps> = ({
  userProfile,
  airQuality,
}) => {
  const energy = deriveEnergy(userProfile?.sleepHours);
  const lung = deriveLung(airQuality?.aqi);
  const skin = deriveSkinGlow(
    userProfile?.sleepHours,
    userProfile?.commuteMode
  );

  return (
    <View style={styles.container}>
      <Card variant="ghost">
        <Text style={styles.title}>Health Summary</Text>
        <ProgressRow label="Energy" value={energy} />
        <ProgressRow label="Lung Health" value={lung} />
        <ProgressRow label="Skin Glow" value={skin} />
      </Card>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { marginBottom: spacing.xl },
  title: {
    fontSize: fontSize.base,
    fontWeight: '600',
    marginBottom: spacing.md,
    color: colors.neutral[800],
  },
  row: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: fontSize.sm,
    color: colors.neutral[700],
    fontWeight: '500',
  },
  track: {
    width: '100%',
    height: 12,
    backgroundColor: colors.neutral[200],
    borderRadius: borderRadius.full,
    overflow: 'hidden',
    marginTop: spacing.xs,
  },
  fill: {
    height: '100%',
    backgroundColor: colors.neutral[800], // overridden dynamically
    borderRadius: borderRadius.full,
  },
  percent: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.neutral[800],
  },
  rowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});

export default HealthSummary;
