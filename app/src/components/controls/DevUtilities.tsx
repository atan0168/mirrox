import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Button } from '../ui/Button';
import { colors, spacing, borderRadius, fontSize } from '../../theme';
import type { QuestId } from '../../models/quest';

interface QuestStreakProps {
  onResetOnboarding: () => void;
  seed7DayHistory: (id: QuestId) => void;
  seed6ThenCompleteToday: (id: QuestId) => void | Promise<void>;
  clearHistoryForRetest: () => void | Promise<void>;
}

const QUEST_OPTIONS: Array<{ key: QuestId; label: string }> = [
  { key: 'drink_2l', label: 'Hydration' },
  { key: 'haze_mask_today', label: 'Mask' },
  { key: 'nature_walk_10m', label: 'Walk' },
  { key: 'calm_breath_5m', label: 'Breathe' },
  { key: 'gratitude_note', label: 'Gratitude' },
];

const QuestStreakControls: React.FC<QuestStreakProps> = ({
  onResetOnboarding,
  seed7DayHistory,
  seed6ThenCompleteToday,
  clearHistoryForRetest,
}) => {
  const [selectedQuest, setSelectedQuest] = useState<QuestId>('drink_2l');

  const selectedLabel = useMemo(
    () => QUEST_OPTIONS.find(q => q.key === selectedQuest)?.label ?? 'Quest',
    [selectedQuest]
  );

  const renderPill = (q: { key: QuestId; label: string }) => {
    const active = q.key === selectedQuest;
    return (
      <TouchableOpacity
        key={q.key}
        onPress={() => setSelectedQuest(q.key)}
        style={[styles.pill, active && styles.pillActive]}
      >
        <Text style={[styles.pillText, active && styles.pillTextActive]}>
          {q.label}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>Quest Streak Controls</Text>
      </View>
      <Text style={styles.hintText}>
        Quick test tools for onboarding and badges.
      </Text>

      <Text style={styles.sectionLabel}>Quest</Text>
      <View style={styles.pillRow}>{QUEST_OPTIONS.map(renderPill)}</View>

      <View style={styles.row}>
        <Button size="sm" onPress={() => seed7DayHistory(selectedQuest)}>
          Seed 7d
        </Button>
        <Button
          size="sm"
          onPress={() => seed6ThenCompleteToday(selectedQuest)}
          style={styles.buttonRight}
        >
          Seed 6d + today
        </Button>
      </View>

      <View style={styles.row}>
        <Button size="sm" variant="outline" onPress={clearHistoryForRetest}>
          Clear seeded data
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onPress={onResetOnboarding}
          style={styles.buttonRight}
        >
          Show onboarding
        </Button>
      </View>

      <Text style={styles.caption}>Selected: {selectedLabel}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginTop: spacing.md,
    shadowColor: '#000000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  headerTitle: {
    fontSize: fontSize.base,
    fontWeight: '700',
    color: colors.neutral[900],
  },
  hintText: {
    fontSize: 12,
    color: colors.neutral[600],
    marginBottom: spacing.sm,
  },
  sectionLabel: {
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.neutral[800],
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: spacing.sm,
  },
  pill: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: borderRadius.md,
    backgroundColor: colors.neutral[200],
    marginRight: spacing.xs,
    marginBottom: spacing.xs,
  },
  pillActive: {
    backgroundColor: colors.black,
  },
  pillText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.neutral[800],
  },
  pillTextActive: {
    color: colors.white,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  buttonRight: {
    marginLeft: spacing.xs,
  },
  caption: {
    marginTop: spacing.xs,
    fontSize: 11,
    color: colors.neutral[500],
  },
});

export default QuestStreakControls;
