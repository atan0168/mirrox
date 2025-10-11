import React from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { FoodSearchItem } from '../services/BackendApiService';
import { borderRadius, colors, fontSize, spacing } from '../theme';

interface FoodItemSelectionModalProps {
  visible: boolean;
  totalItems: number;
  currentIndex: number;
  itemType: 'food' | 'drink' | null;
  itemName: string | null;
  suggestions: FoodSearchItem[];
  loading: boolean;
  onSelectSuggestion: (item: FoodSearchItem) => void;
  onSkip: () => void;
}

export function FoodItemSelectionModal({
  visible,
  totalItems,
  currentIndex,
  itemType,
  itemName,
  suggestions,
  loading,
  onSelectSuggestion,
  onSkip,
}: FoodItemSelectionModalProps) {
  const displayIndex = Math.min(currentIndex + 1, totalItems);
  const label =
    itemType === 'drink' ? 'Drink' : itemType === 'food' ? 'Food' : null;

  return (
    <Modal
      transparent
      animationType="fade"
      visible={visible}
      onRequestClose={onSkip}
    >
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>
            Confirm item {displayIndex} of {totalItems}
          </Text>

          {itemName ? (
            <View style={styles.modalItemSummary}>
              {label ? (
                <Text style={styles.modalItemLabel}>{label}</Text>
              ) : null}
              <Text style={styles.modalItemName}>{itemName}</Text>
            </View>
          ) : null}

          <Text style={styles.modalHint}>
            Pick the closest match or skip to keep your original entry.
          </Text>

          {loading ? (
            <View style={styles.modalLoading}>
              <ActivityIndicator size="large" />
            </View>
          ) : (
            <ScrollView
              style={styles.modalSuggestions}
              contentContainerStyle={styles.modalSuggestionsContent}
            >
              {suggestions.map(item => {
                const displayName = item.display_name ?? item.name;
                const details = [item.category, item.quantity]
                  .filter(Boolean)
                  .join(' • ');

                return (
                  <TouchableOpacity
                    key={`${item.id}-${item.name}`}
                    style={styles.suggestionButton}
                    onPress={() => onSelectSuggestion(item)}
                  >
                    <Text style={styles.suggestionName}>{displayName}</Text>
                    {details ? (
                      <Text style={styles.suggestionMeta}>{details}</Text>
                    ) : null}
                  </TouchableOpacity>
                );
              })}

              {suggestions.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateTitle}>
                    No close matches yet
                  </Text>
                  <Text style={styles.emptyStateBody}>
                    We will keep your original description if you skip this
                    step.
                  </Text>
                </View>
              ) : null}
            </ScrollView>
          )}

          <TouchableOpacity onPress={onSkip} style={styles.skipButton}>
            <Text style={styles.skipButtonText}>Skip</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modalCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
  },
  modalTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.neutral[900],
    marginBottom: spacing.xs,
  },
  modalItemSummary: {
    marginBottom: spacing.sm,
  },
  modalItemLabel: {
    fontSize: fontSize.sm,
    color: colors.neutral[500],
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  modalItemName: {
    fontSize: fontSize.base,
    fontWeight: '600',
    color: colors.neutral[900],
    marginTop: spacing.xs,
  },
  modalHint: {
    fontSize: fontSize.sm,
    color: colors.neutral[600],
    marginBottom: spacing.sm,
  },
  modalLoading: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 160,
  },
  modalSuggestions: {
    maxHeight: 260,
  },
  modalSuggestionsContent: {
    gap: spacing.xs,
    paddingVertical: spacing.xs,
  },
  suggestionButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderWidth: 1,
    borderColor: colors.divider,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.neutral[50],
  },
  suggestionName: {
    fontWeight: '600',
    fontSize: fontSize.base,
    color: colors.neutral[900],
  },
  suggestionMeta: {
    color: colors.neutral[600],
    fontSize: fontSize.sm,
    marginTop: spacing.xs,
  },
  emptyState: {
    borderWidth: 1,
    borderColor: colors.divider,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    backgroundColor: colors.neutral[50],
  },
  emptyStateTitle: {
    fontWeight: '600',
    fontSize: fontSize.base,
    color: colors.neutral[800],
  },
  emptyStateBody: {
    fontSize: fontSize.sm,
    color: colors.neutral[600],
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  skipButton: {
    marginTop: spacing.md,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  skipButtonText: {
    fontWeight: '600',
    color: colors.primary,
    fontSize: fontSize.base,
  },
});

export default FoodItemSelectionModal;
