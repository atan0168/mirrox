import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ViewStyle,
} from 'react-native';
import { Droplets, Plus, Minus, RefreshCw } from 'lucide-react-native';
import { colors, spacing, fontSize, borderRadius } from '../../theme';
import { useHydrationStore } from '../../store/hydrationStore';
import {
  FLUID_INTAKE_SUGGESTIONS,
  FluidIntakeType,
  getHydrationStatusInfo,
} from '../../utils/hydrationUtils';
import { hydrationService } from '../../services/HydrationService';

interface HydrationTrackerProps {
  style?: ViewStyle;
}

export const HydrationTracker: React.FC<HydrationTrackerProps> = ({
  style,
}) => {
  const {
    currentHydrationMl,
    dailyGoalMl,
    logFluidIntake,
    getProgressPercentage,
    getHydrationStatus,
  } = useHydrationStore();

  const [customAmount, setCustomAmount] = useState(250);
  const [isLoading, setIsLoading] = useState(false);

  const progressPercentage = getProgressPercentage();
  const hydrationStatus = getHydrationStatus();
  const statusInfo = getHydrationStatusInfo(progressPercentage);

  const handleQuickIntake = async (type: FluidIntakeType) => {
    const suggestion = FLUID_INTAKE_SUGGESTIONS[type];
    setIsLoading(true);

    try {
      logFluidIntake(suggestion.amount);
      hydrationService.logFluidIntake(suggestion.amount, suggestion.label);
    } catch (error) {
      console.error('Failed to log fluid intake:', error);
      Alert.alert('Error', 'Failed to log fluid intake. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCustomIntake = () => {
    if (customAmount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount.');
      return;
    }

    logFluidIntake(customAmount);
    hydrationService.logFluidIntake(customAmount, 'Custom');
  };

  const adjustCustomAmount = (delta: number) => {
    setCustomAmount(prev => Math.max(50, Math.min(1000, prev + delta)));
  };

  const getStatusColor = () => {
    switch (hydrationStatus) {
      case 'severely_dehydrated':
      case 'dehydrated':
        return colors.red[500];
      case 'low':
        return colors.orange[500];
      case 'adequate':
        return colors.yellow[500];
      case 'optimal':
        return colors.green[500];
      case 'over_hydrated':
        return colors.sky[500];
      default:
        return colors.neutral[500];
    }
  };

  const getProgressBarColor = () => {
    if (progressPercentage < 25) return colors.red[500];
    if (progressPercentage < 50) return colors.orange[500];
    if (progressPercentage < 75) return colors.yellow[500];
    if (progressPercentage <= 100) return colors.green[500];
    return colors.teal[500];
  };

  return (
    <View style={style}>
      {/* Progress Display */}
      <View style={styles.progressSection}>
        <View style={styles.progressHeader}>
          <View style={styles.progressInfo}>
            <Text style={styles.currentAmount}>
              {Math.max(0, currentHydrationMl).toLocaleString()} mL
            </Text>
            <Text style={styles.goalAmount}>
              / {dailyGoalMl.toLocaleString()} mL goal
            </Text>
          </View>

          <TouchableOpacity
            style={styles.refreshButton}
            onPress={() => hydrationService.checkForNewDay()}
          >
            <RefreshCw size={16} color={colors.neutral[600]} />
          </TouchableOpacity>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressBarContainer}>
          <View style={styles.progressBarTrack}>
            <View
              style={[
                styles.progressBarFill,
                {
                  width: `${Math.min(100, progressPercentage)}%`,
                  backgroundColor: getProgressBarColor(),
                },
              ]}
            />
          </View>
          <Text style={styles.progressPercentage}>
            {Math.round(progressPercentage)}%
          </Text>
        </View>

        {/* Status Message */}
        <View style={[styles.statusBadge, { borderColor: getStatusColor() }]}>
          <Text style={[styles.statusText, { color: getStatusColor() }]}>
            {statusInfo.message}
          </Text>
        </View>
      </View>

      {/* Quick Add Buttons */}
      <View style={styles.quickAddSection}>
        <Text style={styles.sectionTitle}>Quick Add</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.quickButtonsContainer}
        >
          {Object.entries(FLUID_INTAKE_SUGGESTIONS)
            .slice(0, 6)
            .map(([key, suggestion]) => (
              <TouchableOpacity
                key={key}
                style={styles.quickButton}
                onPress={() => handleQuickIntake(key as FluidIntakeType)}
                disabled={isLoading}
              >
                <Text style={styles.quickButtonAmount}>
                  {suggestion.amount}
                </Text>
                <Text style={styles.quickButtonLabel}>{suggestion.label}</Text>
              </TouchableOpacity>
            ))}
        </ScrollView>
      </View>

      {/* Custom Amount */}
      <View style={styles.customSection}>
        <Text style={styles.sectionTitle}>Custom Amount (mL)</Text>
        <View style={styles.customControls}>
          <TouchableOpacity
            style={styles.adjustButton}
            onPress={() => adjustCustomAmount(-50)}
          >
            <Minus size={20} color={colors.neutral[600]} />
          </TouchableOpacity>

          <View style={styles.customAmountContainer}>
            <Text style={styles.customAmount}>{customAmount} mL</Text>
          </View>

          <TouchableOpacity
            style={styles.adjustButton}
            onPress={() => adjustCustomAmount(50)}
          >
            <Plus size={20} color={colors.neutral[600]} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.addCustomButton}
          onPress={handleCustomIntake}
          disabled={isLoading}
        >
          <Plus size={20} color={colors.white} />
          <Text style={styles.addCustomButtonText}>Add {customAmount} mL</Text>
        </TouchableOpacity>
      </View>

      {/* Recommendations */}
      {statusInfo.recommendations.length > 0 && (
        <View style={styles.recommendationsSection}>
          <Text style={styles.sectionTitle}>Recommendations</Text>
          {statusInfo.recommendations.slice(0, 2).map((rec, index) => (
            <Text key={index} style={styles.recommendation}>
              • {rec}
            </Text>
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.neutral[900],
  },
  refreshButton: {
    padding: spacing.xs,
    marginLeft: spacing.sm,
  },
  progressSection: {
    marginVertical: spacing.lg,
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  progressInfo: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: spacing.sm,
  },
  currentAmount: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.neutral[900],
  },
  goalAmount: {
    fontSize: fontSize.base,
    color: colors.neutral[600],
    marginLeft: spacing.xs,
  },
  progressBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  progressBarTrack: {
    flex: 1,
    height: 8,
    backgroundColor: colors.neutral[200],
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: borderRadius.full,
  },
  progressPercentage: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.neutral[700],
    minWidth: 40,
    textAlign: 'right',
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    backgroundColor: colors.neutral[50],
  },
  statusText: {
    fontSize: fontSize.sm,
    fontWeight: '500',
    textAlign: 'center',
  },
  quickAddSection: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSize.base,
    fontWeight: '600',
    color: colors.neutral[800],
    marginBottom: spacing.sm,
  },
  quickButtonsContainer: {
    gap: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  quickButton: {
    backgroundColor: colors.neutral[100],
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    minWidth: 80,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.neutral[300],
  },
  quickButtonAmount: {
    fontSize: fontSize.base,
    fontWeight: '700',
    color: colors.primary,
  },
  quickButtonLabel: {
    fontSize: fontSize.xs,
    color: colors.neutral[600],
    textAlign: 'center',
    marginTop: 2,
  },
  customSection: {
    marginBottom: spacing.lg,
  },
  customControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  adjustButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    backgroundColor: colors.neutral[100],
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.neutral[300],
  },
  customAmountContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.neutral[50],
    borderRadius: borderRadius.md,
    minWidth: 100,
    alignItems: 'center',
  },
  customAmount: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.neutral[900],
  },
  addCustomButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
  },
  addCustomButtonText: {
    color: colors.white,
    fontSize: fontSize.base,
    fontWeight: '600',
  },
  recommendationsSection: {
    padding: spacing.sm,
  },
  recommendation: {
    fontSize: fontSize.sm,
    color: colors.neutral[700],
    marginBottom: spacing.xs,
    lineHeight: 18,
  },
});
