import React, { useState } from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  Modal,
  FlatList,
} from 'react-native';
import { Button } from '../ui/Button';
import { colors, spacing } from '../../theme';

interface FacialExpressionControlsProps {
  currentExpression: string | null;
  onExpressionChange: (expression: string) => void;
  onReset?: () => void; // Reset to automatic (clears manual override)
}

const FACIAL_EXPRESSIONS = [
  { name: 'neutral', label: '😐 Neutral', emoji: '😐' },
  { name: 'happy', label: '😊 Happy', emoji: '😊' },
  { name: 'tired', label: '😴 Tired', emoji: '😴' },
  { name: 'exhausted', label: '😵 Exhausted', emoji: '😵' },
  { name: 'concerned', label: '😟 Concerned', emoji: '😟' },
  { name: 'calm', label: '😌 Calm', emoji: '😌' },
  { name: 'surprised', label: '😲 Surprised', emoji: '😲' },
  { name: 'angry', label: '😠 Angry', emoji: '😠' },
  { name: 'sick', label: '🤢 Sick', emoji: '🤢' },
];

export function FacialExpressionControls({
  currentExpression,
  onExpressionChange,
  onReset,
}: FacialExpressionControlsProps) {
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const [selectedExpression, setSelectedExpression] = useState<string | null>(
    null
  );

  const handleApply = () => {
    if (selectedExpression) {
      onExpressionChange(selectedExpression);
    }
  };

  const handleReset = () => {
    onReset?.();
    setSelectedExpression(null);
  };

  const getExpressionLabel = (name: string | null) => {
    if (name === null) return 'Auto (Automatic Detection)';
    const expression = FACIAL_EXPRESSIONS.find(exp => exp.name === name);
    return expression
      ? `${expression.emoji} ${expression.name.charAt(0).toUpperCase() + expression.name.slice(1)}`
      : 'Select Expression';
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Facial Expression</Text>

      {/* Current selection indicator */}
      <View style={styles.currentSelectionContainer}>
        <Text style={styles.currentSelectionLabel}>Current: </Text>
        <Text style={styles.currentSelectionValue}>
          {getExpressionLabel(currentExpression)}
        </Text>
      </View>

      {/* Dropdown and Apply Button */}
      <View style={styles.controlsContainer}>
        <TouchableOpacity
          style={styles.dropdownButton}
          onPress={() => setDropdownVisible(true)}
        >
          <Text style={styles.dropdownButtonText}>
            {selectedExpression
              ? getExpressionLabel(selectedExpression)
              : 'Select Expression'}
          </Text>
          <Text style={styles.dropdownIcon}>▼</Text>
        </TouchableOpacity>

        <Button
          variant="secondary"
          size="sm"
          onPress={handleApply}
          disabled={!selectedExpression}
          style={!selectedExpression ? styles.disabledButton : undefined}
        >
          Apply
        </Button>
      </View>

      {/* Auto Button */}
      <Button
        variant="primary"
        size="md"
        onPress={handleReset}
        style={styles.autoButton}
        textStyle={{ color: colors.red[900] }}
      >
        Reset to Auto
      </Button>

      {/* Dropdown Modal */}
      <Modal
        visible={dropdownVisible}
        transparent={true}
        animationType="none"
        onRequestClose={() => setDropdownVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          onPress={() => setDropdownVisible(false)}
        >
          <View style={styles.dropdownContainer}>
            <FlatList
              data={FACIAL_EXPRESSIONS}
              keyExtractor={item => item.name}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.dropdownItem,
                    selectedExpression === item.name &&
                      styles.selectedDropdownItem,
                  ]}
                  onPress={() => {
                    setSelectedExpression(item.name);
                    setDropdownVisible(false);
                  }}
                >
                  <Text style={styles.dropdownItemEmoji}>{item.emoji}</Text>
                  <Text style={styles.dropdownItemText}>
                    {item.name.charAt(0).toUpperCase() + item.name.slice(1)}
                  </Text>
                </TouchableOpacity>
              )}
              showsVerticalScrollIndicator={false}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.md,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.2)',
  },
  title: {
    color: '#1f2937',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  currentSelectionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    padding: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  currentSelectionLabel: {
    color: '#374151',
    fontSize: 14,
    fontWeight: '600',
    marginRight: 5,
  },
  currentSelectionValue: {
    color: '#1f2937',
    fontSize: 14,
    fontWeight: 'bold',
  },
  controlsContainer: {
    flexDirection: 'row',
    marginBottom: 12,
    gap: 10,
  },
  dropdownButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.5)',
  },
  dropdownButtonText: {
    color: '#374151',
    fontSize: 15,
  },
  dropdownIcon: {
    color: '#374151',
    fontSize: 12,
  },
  disabledButton: {
    opacity: 0.5,
  },
  autoButton: {
    marginTop: 8,
    backgroundColor: colors.red[300],
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropdownContainer: {
    width: 280,
    maxHeight: 300,
    backgroundColor: 'white',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
    overflow: 'hidden',
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  selectedDropdownItem: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
  },
  dropdownItemEmoji: {
    fontSize: 20,
    marginRight: 10,
  },
  dropdownItemText: {
    fontSize: 15,
    color: '#1f2937',
  },
});
