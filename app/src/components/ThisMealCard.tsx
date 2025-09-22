// app/src/components/ThisMealCard.tsx
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  TextInput,
  Platform,
} from 'react-native';
import { useMealStore } from '../store/mealStore';

export default function ThisMealCard() {
  // Pull data & actions from the store
  const items = useMealStore(s => s.currentItems);
  const removeItem = useMealStore(s => s.removeItemById);
  const addManual = useMealStore(s => s.addManualItem);
  const finishMeal = useMealStore(s => s.finishMeal);
  const ensureMeal = useMealStore(s => s.ensureMeal);
  const reloadItems = useMealStore(s => s.reloadItems);

  // Local state for the add-item modal
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState('');
  const [energy, setEnergy] = useState('');

  // Ensure a "current meal" exists and load items when the card mounts
  useEffect(() => {
    (async () => {
      await ensureMeal();
      await reloadItems();
    })();
  }, []);

  // Add item handler (parse kcal safely)
  const onAdd = async () => {
    const trimmed = name.trim();
    if (!trimmed) return setShowAdd(false);

    const kcalNum = energy.trim() ? parseFloat(energy) : undefined;
    const kcal = Number.isFinite(kcalNum as number)
      ? (kcalNum as number)
      : undefined;

    await addManual(trimmed, kcal, 1);
    setName('');
    setEnergy('');
    setShowAdd(false);
  };

  // Sum up kcal for a quick glance
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

        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Pressable onPress={() => setShowAdd(true)} style={styles.ghostBtn}>
            <Text style={styles.ghostTxt}>+ Add item</Text>
          </Pressable>
          <Pressable onPress={finishMeal} style={styles.ghostBtn}>
            <Text style={styles.ghostTxt}>Finish meal</Text>
          </Pressable>
        </View>
      </View>

      {items.length === 0 ? (
        <Text style={styles.muted}>
          No items yet. Use “+ Add item” or run Analyze to add.
        </Text>
      ) : (
        <View style={{ marginTop: 10 }}>
          {items.map(it => (
            <View key={it.id} style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemName}>{it.name}</Text>
                <Text style={styles.itemSub}>
                  {it.energy_kcal != null
                    ? `${Math.round(it.energy_kcal)} kcal`
                    : 'kcal N/A'}{' '}
                  • x{it.qty}
                </Text>
              </View>
              <Pressable
                onPress={() => removeItem(it.id)}
                style={styles.deleteBtn}
              >
                <Text style={styles.deleteTxt}>Remove</Text>
              </Pressable>
            </View>
          ))}
        </View>
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
            keyboardType={Platform.select({
              ios: 'numbers-and-punctuation',
              android: 'numeric',
            })}
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
              <Text style={{ color: '#fff', opacity: !name.trim() ? 0.6 : 1 }}>
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
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: { fontSize: 16, fontWeight: '700' },
  subtle: { marginTop: 2, color: '#6B7280' },
  muted: { marginTop: 8, color: '#6B7280' },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  itemName: { fontWeight: '600', color: '#111827' },
  itemSub: { color: '#6B7280', marginTop: 2, fontSize: 12 },

  deleteBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FCA5A5',
    backgroundColor: '#FEF2F2',
  },
  deleteTxt: { color: '#B91C1C', fontWeight: '700' },

  ghostBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#fff',
  },
  ghostTxt: { fontWeight: '700', color: '#111827' },

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
    left: 18,
    right: 18,
    top: '25%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(17,24,39,0.08)',
  },
  modalTitle: { fontWeight: '700', fontSize: 16, marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
    backgroundColor: '#fff',
  },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },

  pill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#fff',
  },
  pillPrimary: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#2563EB',
  },
  pillDisabled: { backgroundColor: '#93C5FD' },
});
