import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Modal } from 'react-native';
import { colors, spacing, borderRadius, fontSize } from '../theme';
import { useMeal } from '../hooks/useMeal';
import type { MealItem } from '../types/meal';
import { Button, Card, Input } from './ui';
import {
  formatNutrientValue,
  getMealItemModifiers,
  getMealItemSource,
  getMealItemNutrientPerItem,
  getMealItemNutrientTotal,
  getMealItemPortionText,
  resolveMealItemName,
  resolveSourceLabel,
} from '../utils/nutritionUtils';
import type { NutrientKey } from '../utils/nutritionUtils';

const DETAIL_FIELDS = [
  { key: 'energy_kcal', label: 'Energy', unit: 'kcal', decimals: 0 },
  { key: 'sugar_g', label: 'Sugar', unit: 'g', decimals: 1 },
  { key: 'fat_g', label: 'Fat', unit: 'g', decimals: 1 },
  { key: 'sat_fat_g', label: 'Saturated Fat', unit: 'g', decimals: 1 },
  { key: 'protein_g', label: 'Protein', unit: 'g', decimals: 1 },
  { key: 'fiber_g', label: 'Fiber', unit: 'g', decimals: 1 },
  { key: 'sodium_mg', label: 'Sodium', unit: 'mg', decimals: 0 },
] as const satisfies ReadonlyArray<{
  key: NutrientKey;
  label: string;
  unit: string;
  decimals: number;
}>;

export default function ThisMealCard() {
  const { data: rawItems = [], analysis, removeItem, addManual } = useMeal();
  const items = (rawItems as MealItem[]) ?? [];
  const analysisSources = analysis?.sources;

  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState('');
  const [energy, setEnergy] = useState('');
  const [detailItem, setDetailItem] = useState<MealItem | null>(null);
  const detailPortion = detailItem ? getMealItemPortionText(detailItem) : null;
  const detailModifiers = detailItem ? getMealItemModifiers(detailItem) : [];
  const detailSourceKey = detailItem ? getMealItemSource(detailItem) : null;
  const detailSource = resolveSourceLabel(detailSourceKey, analysisSources);

  const onAdd = async () => {
    const trimmed = name.trim();
    if (!trimmed) return setShowAdd(false);

    const kcalNum = energy.trim() ? parseFloat(energy) : undefined;
    const kcal = Number.isFinite(kcalNum as number) ? kcalNum : undefined;

    addManual.mutate({ name: trimmed, kcal, qty: 1 });

    setName('');
    setEnergy('');
    setShowAdd(false);
  };

  const closeDetail = () => setDetailItem(null);

  const totalKcal = Math.round(
    items.reduce(
      (sum, item) => sum + (getMealItemNutrientTotal(item, 'energy_kcal') ?? 0),
      0
    )
  );

  return (
    <Card padding="md" shadow="sm" style={styles.card}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>This meal</Text>
          <Text style={styles.subtle}>Approx. {totalKcal} kcal</Text>
        </View>

        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <Button
            variant="secondary"
            size="sm"
            onPress={() => setShowAdd(true)}
            style={styles.add}
          >
            + Add item
          </Button>
        </View>
      </View>

      {items.length === 0 ? (
        <Text style={styles.muted}>
          No items yet. Use “+ Add item” or run Analyze to add.
        </Text>
      ) : (
        items.map(item => {
          const displayName = resolveMealItemName(item);
          const energyDisplay = formatNutrientValue(
            getMealItemNutrientPerItem(item, 'energy_kcal'),
            'kcal',
            0
          );
          const portionText = getMealItemPortionText(item);
          const modifiers = getMealItemModifiers(item);
          const metaParts: string[] = [];
          if (portionText) {
            metaParts.push(portionText);
          }
          if (modifiers.length) {
            metaParts.push(modifiers.join(', '));
          }
          return (
            <View key={item.id.toString()} style={styles.row}>
              <Pressable
                style={styles.itemPressable}
                onPress={() => setDetailItem(item)}
                accessibilityRole="button"
                accessibilityLabel={`View details for ${displayName}`}
              >
                <Text style={styles.itemName}>{displayName}</Text>
                <Text style={styles.itemSub}>
                  {energyDisplay} • x{item.qty}
                </Text>
                {metaParts.length > 0 ? (
                  <Text style={styles.itemMeta}>{metaParts.join(' • ')}</Text>
                ) : null}
              </Pressable>
              <Button
                variant="outline"
                size="sm"
                onPress={() => removeItem.mutate(item.id)}
                style={styles.removeButton}
                textStyle={styles.removeButtonText}
                accessibilityLabel={`Remove ${displayName}`}
              >
                Remove
              </Button>
            </View>
          );
        })
      )}
      {/* Add item modal */}
      <Modal
        transparent
        visible={showAdd}
        animationType="fade"
        onRequestClose={() => setShowAdd(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setShowAdd(false)} />
        <View style={styles.modalContainer}>
          <Card padding="md" shadow="sm" style={styles.modalCard}>
            <Text style={styles.modalTitle}>Add item</Text>
            <Input
              label="Food name"
              placeholder="Required"
              value={name}
              onChangeText={setName}
              autoFocus
              returnKeyType="done"
            />
            <Input
              label="Energy (kcal)"
              placeholder="Optional"
              value={energy}
              onChangeText={setEnergy}
              keyboardType="decimal-pad"
            />
            <View style={styles.modalActions}>
              <Button
                variant="ghost"
                size="sm"
                onPress={() => setShowAdd(false)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onPress={onAdd}
                disabled={!name.trim()}
                style={styles.primaryActionButton}
                textStyle={styles.primaryActionText}
              >
                Add
              </Button>
            </View>
          </Card>
        </View>
      </Modal>
      {/* Item detail modal */}
      <Modal
        transparent
        visible={detailItem != null}
        animationType="fade"
        onRequestClose={closeDetail}
      >
        <Pressable style={styles.backdrop} onPress={closeDetail} />
        {detailItem && (
          <View style={styles.modalContainer}>
            <Card padding="md" shadow="sm" style={styles.detailCard}>
              <Text style={styles.detailTitle}>
                {resolveMealItemName(detailItem)}
              </Text>
              <Text style={styles.detailSubtitle}>
                Quantity: x{detailItem.qty}
              </Text>
              {detailPortion ? (
                <Text style={styles.detailMeta}>Portion: {detailPortion}</Text>
              ) : null}
              {detailModifiers.length > 0 ? (
                <Text style={styles.detailMeta}>
                  Modifiers: {detailModifiers.join(', ')}
                </Text>
              ) : null}
              {detailSource ? (
                <Text style={styles.detailMeta}>Source: {detailSource}</Text>
              ) : null}
              <Text style={styles.detailHint}>
                Values for recorded quantity.
              </Text>
              <View style={styles.detailRows}>
                {DETAIL_FIELDS.map(field => (
                  <View key={field.key} style={styles.detailRow}>
                    <Text style={styles.detailLabel}>{field.label}</Text>
                    <Text style={styles.detailValue}>
                      {formatNutrientValue(
                        getMealItemNutrientTotal(detailItem, field.key),
                        field.unit,
                        field.decimals
                      )}
                    </Text>
                  </View>
                ))}
              </View>
              <Button
                variant="primary"
                size="sm"
                onPress={closeDetail}
                style={StyleSheet.flatten([
                  styles.primaryActionButton,
                  styles.detailCloseButton,
                ])}
                textStyle={styles.primaryActionText}
              >
                Close
              </Button>
            </Card>
          </View>
        )}
      </Modal>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: borderRadius.xl,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: fontSize.base,
    fontWeight: '700',
    color: colors.neutral[900],
  },
  subtle: { marginTop: spacing.xs, color: colors.neutral[500] },
  muted: { marginTop: spacing.sm, color: colors.neutral[500] },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  itemPressable: { flex: 1 },
  itemName: { fontWeight: '600', color: colors.neutral[900] },
  itemSub: {
    color: colors.neutral[500],
    marginTop: spacing.xs,
    fontSize: fontSize.xs,
  },
  itemMeta: {
    color: colors.neutral[400],
    marginTop: spacing.xs,
    fontSize: fontSize.xs,
  },
  add: {
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
  },
  removeButton: {
    backgroundColor: colors.red[50],
    borderColor: colors.red[200],
    borderRadius: borderRadius.md,
    marginLeft: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  removeButtonText: {
    color: colors.red[700],
    fontWeight: '600',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modalCard: {
    borderRadius: borderRadius.xl,
    gap: spacing.sm,
  },
  modalTitle: {
    fontWeight: '700',
    fontSize: fontSize.base,
    color: colors.neutral[900],
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
  },
  primaryActionButton: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  primaryActionText: {
    color: colors.white,
    fontWeight: '600',
  },
  detailCard: {
    borderRadius: borderRadius.xl,
    gap: spacing.sm,
  },
  detailTitle: {
    fontWeight: '700',
    fontSize: fontSize.base,
    color: colors.neutral[900],
  },
  detailSubtitle: {
    color: colors.neutral[500],
    marginTop: spacing.xs,
  },
  detailMeta: {
    color: colors.neutral[500],
    marginTop: spacing.xs,
    fontSize: fontSize.xs,
  },
  detailHint: {
    color: colors.neutral[400],
    fontSize: fontSize.xs,
    marginTop: spacing.xs,
  },
  detailRows: {
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  detailLabel: {
    color: colors.neutral[600],
    fontSize: fontSize.sm,
  },
  detailValue: {
    fontWeight: '600',
    color: colors.neutral[900],
    fontSize: fontSize.sm,
  },
  detailCloseButton: {
    alignSelf: 'flex-end',
    marginTop: spacing.sm,
  },
});
