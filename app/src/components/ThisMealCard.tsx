import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  TextInput,
} from 'react-native';
import { colors, spacing, borderRadius, fontSize, shadows } from '../theme';
import { useMeal } from '../hooks/useMeal';

export default function ThisMealCard() {
  const { data: items = [], removeItem, addManual } = useMeal();

  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState('');
  const [energy, setEnergy] = useState('');

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

  const totalKcal = Math.round(
    items.reduce((s, it) => s + (it.energy_kcal ?? 0) * (it.qty ?? 1), 0)
  );

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>This meal</Text>
          <Text style={styles.subtle}>Approx. {totalKcal} kcal</Text>
        </View>

        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <Pressable onPress={() => setShowAdd(true)} style={styles.ghostBtn}>
            <Text style={styles.ghostTxt}>+ Add item</Text>
          </Pressable>
        </View>
      </View>

      {items.length === 0 ? (
        <Text style={styles.muted}>
          No items yet. Use “+ Add item” or run Analyze to add.
        </Text>
      ) : (
        items.map(item => (
          <View key={item.id.toString()} style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.itemName}>{item.name}</Text>
              <Text style={styles.itemSub}>
                {item.energy_kcal != null
                  ? `${Math.round(item.energy_kcal)} kcal`
                  : 'kcal N/A'}{' '}
                • x{item.qty}
              </Text>
            </View>
            <Pressable
              onPress={() => removeItem.mutate(item.id)}
              style={styles.deleteBtn}
            >
              <Text style={styles.deleteTxt}>Remove</Text>
            </Pressable>
          </View>
        ))
      )}
      {/* Add item modal */}
      <Modal
        transparent
        visible={showAdd}
        animationType="fade"
        onRequestClose={() => setShowAdd(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setShowAdd(false)} />
        <View style={styles.modal}>
          <Text style={styles.modalTitle}>Add item</Text>
          <TextInput
            placeholder="Food name (required)"
            value={name}
            onChangeText={setName}
            style={styles.input}
          />
          <TextInput
            placeholder="Energy kcal (optional)"
            value={energy}
            onChangeText={setEnergy}
            keyboardType="decimal-pad"
            style={styles.input}
          />
          <View style={styles.modalActions}>
            <Pressable onPress={() => setShowAdd(false)} style={styles.pill}>
              <Text>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={onAdd}
              disabled={!name.trim()}
              style={[styles.pillPrimary, !name.trim() && styles.pillDisabled]}
            >
              <Text
                style={{
                  color: colors.white,
                  opacity: !name.trim() ? 0.6 : 1,
                }}
              >
                Add
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.divider,
    ...shadows.soft,
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
  itemName: { fontWeight: '600', color: colors.neutral[900] },
  itemSub: {
    color: colors.neutral[500],
    marginTop: spacing.xs,
    fontSize: fontSize.xs,
  },
  deleteBtn: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.red[300],
    backgroundColor: colors.red[50],
  },
  deleteTxt: { color: colors.red[700], fontWeight: '700' },
  ghostBtn: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.divider,
    backgroundColor: colors.white,
  },
  ghostTxt: { fontWeight: '700', color: colors.neutral[900] },
  backdrop: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  modal: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    top: '25%',
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.neutral[200],
  },
  modalTitle: {
    fontWeight: '700',
    fontSize: fontSize.base,
    marginBottom: spacing.sm,
    color: colors.neutral[900],
  },
  input: {
    borderWidth: 1,
    borderColor: colors.divider,
    borderRadius: borderRadius.lg,
    padding: spacing.sm,
    marginBottom: spacing.sm,
    backgroundColor: colors.white,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
  },
  pill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.divider,
    backgroundColor: colors.white,
  },
  pillPrimary: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary,
  },
  pillDisabled: { backgroundColor: colors.sky[300] },
});
