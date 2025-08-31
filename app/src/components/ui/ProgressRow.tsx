import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, Easing, TouchableOpacity } from 'react-native';
import { Info } from 'lucide-react-native';
import Tooltip from './Tooltip';
import { colors, spacing, fontSize, borderRadius } from '../../theme';
import { getBarColor } from '../../utils/colorUtils';
import { clamp } from '../../utils/mathUtils';

interface ProgressRowProps {
  label: string;
  value: number;
  // Optional tooltip. If not provided, info button is hidden.
  tooltipContent?: string | React.ReactNode;
  tooltipTitle?: string;
  // Optional visual enhancements
  color?: string; // override fill color
  showTrend?: boolean;
  trendIcon?: React.ReactNode; // lucide icon or any node
  icon?: React.ReactNode; // optional leading icon
}

const ProgressRow: React.FC<ProgressRowProps> = ({
  label,
  value,
  tooltipContent,
  tooltipTitle,
  color,
  showTrend,
  trendIcon,
  icon,
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

  const handleOpenTooltip = () => {
    if (tooltipContent != null) setShowTooltip(true);
  };

  return (
    <>
      <TouchableOpacity style={styles.container} activeOpacity={0.9} onPress={handleOpenTooltip}>
        <View style={styles.rowHeader}>
          <View style={styles.labelContainer}>
            {icon && <View style={styles.iconContainer}>{icon}</View>}
            <Text style={styles.label}>{label}</Text>
            {tooltipContent != null && (
              <TouchableOpacity
                style={styles.infoButton}
                onPress={() => setShowTooltip(true)}
                accessibilityRole="button"
                accessibilityLabel={`Information about ${label}`}
                accessibilityHint="Tap to learn more about this health metric"
              >
                <Info size={18} color={colors.neutral[500]} />
              </TouchableOpacity>
            )}
          </View>
          <View style={styles.rightHeader}>
            {showTrend && !!trendIcon && trendIcon}
            <Text style={styles.percent}>{clamped}%</Text>
          </View>
        </View>

        <View style={styles.progressContainer}>
          <View style={styles.track}>
            <Animated.View
              style={[
                styles.fill,
                {
                  width: widthInterpolate,
                  backgroundColor: color ?? getBarColor(clamped),
                },
              ]}
            />
          </View>
        </View>
      </TouchableOpacity>

      {tooltipContent != null && (
        <Tooltip
          visible={showTooltip}
          content={tooltipContent}
          title={tooltipTitle}
          onClose={() => setShowTooltip(false)}
        />
      )}
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.neutral[50],
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    shadowColor: colors.neutral[900],
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  rowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  rightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    marginRight: spacing.xs,
  },
  label: {
    fontSize: fontSize.base,
    color: colors.neutral[800],
    fontWeight: '600',
    marginRight: spacing.xs,
  },
  infoButton: {
    padding: spacing.xs / 2,
    borderRadius: borderRadius.full,
    backgroundColor: colors.neutral[100],
  },
  percent: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.neutral[900],
    minWidth: 50,
    textAlign: 'right',
  },
  trendIcon: {},
  progressContainer: {
    marginTop: spacing.xs,
  },
  track: {
    width: '100%',
    height: 14,
    backgroundColor: colors.neutral[200],
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: colors.neutral[800],
    borderRadius: borderRadius.full,
  },
});

export default ProgressRow;
