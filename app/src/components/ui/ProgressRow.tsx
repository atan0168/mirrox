import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  TouchableOpacity,
} from 'react-native';
import Tooltip from './Tooltip';
import { colors, spacing, fontSize, borderRadius } from '../../theme';
import { getBarColor } from '../../utils/colorUtils';
import { clamp } from '../../utils/mathUtils';

interface ProgressRowProps {
  label: string;
  value: number;
  tooltipContent: string;
}

const ProgressRow: React.FC<ProgressRowProps> = ({
  label,
  value,
  tooltipContent,
}) => {
  const animated = useRef(new Animated.Value(0)).current;
  const [showTooltip, setShowTooltip] = useState(false);
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
    <>
      <TouchableOpacity
        style={styles.row}
        onPress={() => setShowTooltip(true)}
        accessibilityRole="button"
        accessibilityLabel={`${label} ${clamped} percent. Tap for more information.`}
        accessibilityHint="Double tap to learn more about this health metric"
      >
        <View style={styles.rowHeader}>
          <Text style={styles.label}>{label}</Text>
          <Text style={styles.percent}>{clamped}%</Text>
        </View>
        <View style={styles.track}>
          <Animated.View
            style={[
              styles.fill,
              {
                width: widthInterpolate,
                backgroundColor: getBarColor(clamped),
              },
            ]}
          />
        </View>
      </TouchableOpacity>

      <Tooltip
        visible={showTooltip}
        content={tooltipContent}
        onClose={() => setShowTooltip(false)}
      />
    </>
  );
};

const styles = StyleSheet.create({
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

export default ProgressRow;

