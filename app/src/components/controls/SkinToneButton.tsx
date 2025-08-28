import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import { SkinToneControls } from './SkinToneControls';

interface SkinToneButtonProps {
  skinToneAdjustment: number;
  onSkinToneChange: (value: number) => void;
}

export function SkinToneButton({
  skinToneAdjustment,
  onSkinToneChange,
}: SkinToneButtonProps) {
  const [isModalVisible, setIsModalVisible] = useState(false);

  const getSkinToneLabel = (value: number): string => {
    if (value < -0.6) return 'Very Dark';
    if (value < -0.3) return 'Dark';
    if (value < -0.1) return 'Medium Dark';
    if (value < 0.1) return 'Medium';
    if (value < 0.3) return 'Medium Light';
    if (value < 0.6) return 'Light';
    return 'Very Light';
  };

  const getSkinToneEmoji = (value: number): string => {
    if (value < -0.6) return '🤎';
    if (value < -0.3) return '🤎';
    if (value < -0.1) return '🟤';
    if (value < 0.1) return '🟫';
    if (value < 0.3) return '🟨';
    if (value < 0.6) return '🟡';
    return '🟨';
  };

  return (
    <>
      <TouchableOpacity
        style={styles.button}
        onPress={() => setIsModalVisible(true)}
      >
        <Text style={styles.emoji}>{getSkinToneEmoji(skinToneAdjustment)}</Text>
        <View style={styles.textContainer}>
          <Text style={styles.label}>Skin Tone</Text>
          <Text style={styles.value}>
            {getSkinToneLabel(skinToneAdjustment)}
          </Text>
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
              <Text style={styles.modalTitle}>Adjust Skin Tone</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setIsModalVisible(false)}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.sliderContainer}>
              <SkinToneControls
                skinToneAdjustment={skinToneAdjustment}
                onSkinToneChange={onSkinToneChange}
                visible={true}
              />
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
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    marginBottom: 12,
  },
  emoji: {
    fontSize: 24,
    marginRight: 12,
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
  sliderContainer: {
    marginBottom: 20,
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
