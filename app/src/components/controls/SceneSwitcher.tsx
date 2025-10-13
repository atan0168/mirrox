import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import { borderRadius, spacing } from '../../theme';

export type SceneOption = 'zenpark' | 'city' | 'home';

interface SceneSwitcherProps {
  value: SceneOption;
  onChange: (value: SceneOption) => void;
}

export default function SceneSwitcher({ value, onChange }: SceneSwitcherProps) {
  const [isModalVisible, setIsModalVisible] = useState(false);

  const labelFor = (v: SceneOption) =>
    v === 'city' ? 'City Street' : v === 'home' ? 'Home' : 'Zen Park';
  const emojiFor = (v: SceneOption) =>
    v === 'city' ? '🌆' : v === 'home' ? '🏠' : '🌳';

  return (
    <>
      <TouchableOpacity
        style={styles.button}
        onPress={() => setIsModalVisible(true)}
      >
        <Text style={styles.emoji}>{emojiFor(value)}</Text>
        <View style={styles.textContainer}>
          <Text style={styles.label}>Scene</Text>
          <Text style={styles.value}>{labelFor(value)}</Text>
        </View>
        <Text style={styles.arrow}>▶</Text>
      </TouchableOpacity>

      <Modal
        animationType="slide"
        transparent={true}
        visible={isModalVisible}
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Choose Scene</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setIsModalVisible(false)}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.optionsContainer}>
              {(['zenpark', 'city', 'home'] as SceneOption[]).map(option => (
                <TouchableOpacity
                  key={option}
                  style={[
                    styles.optionRow,
                    value === option && styles.optionRowActive,
                  ]}
                  onPress={() => onChange(option)}
                >
                  <Text style={styles.optionEmoji}>{emojiFor(option)}</Text>
                  <Text style={styles.optionLabel}>{labelFor(option)}</Text>
                  <Text style={styles.optionCheck}>
                    {value === option ? '✓' : ''}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={styles.doneButton}
              onPress={() => setIsModalVisible(false)}
            >
              <Text style={styles.doneButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  emoji: {
    fontSize: 24,
    marginRight: spacing.md,
  },
  textContainer: {
    flex: 1,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D3748',
    marginBottom: 2,
  },
  value: {
    fontSize: 14,
    color: '#4A5568',
  },
  arrow: {
    fontSize: 16,
    color: '#CBD5E0',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    width: '90%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2D3748',
  },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#F7FAFC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 18,
    color: '#4A5568',
  },
  optionsContainer: {
    marginBottom: 20,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  optionRowActive: {
    backgroundColor: '#F1F5F9',
  },
  optionEmoji: {
    fontSize: 20,
    width: 28,
  },
  optionLabel: {
    flex: 1,
    fontSize: 16,
    color: '#2D3748',
  },
  optionCheck: {
    fontSize: 16,
    color: '#16A34A',
    width: 24,
    textAlign: 'right',
  },
  doneButton: {
    backgroundColor: '#4A90E2',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  doneButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
