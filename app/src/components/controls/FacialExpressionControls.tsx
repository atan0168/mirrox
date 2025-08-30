import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';

interface FacialExpressionControlsProps {
  currentExpression: string;
  onExpressionChange: (expression: string) => void;
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
}: FacialExpressionControlsProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Facial Expression</Text>
      <View style={styles.buttonContainer}>
        {FACIAL_EXPRESSIONS.map(expression => (
          <TouchableOpacity
            key={expression.name}
            style={[
              styles.expressionButton,
              currentExpression === expression.name && styles.activeButton,
            ]}
            onPress={() => onExpressionChange(expression.name)}
          >
            <Text style={styles.emoji}>{expression.emoji}</Text>
            <Text
              style={[
                styles.buttonText,
                currentExpression === expression.name &&
                  styles.activeButtonText,
              ]}
            >
              {expression.name.charAt(0).toUpperCase() +
                expression.name.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
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
  buttonContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
  },
  expressionButton: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 25,
    alignItems: 'center',
    minWidth: 90,
    borderWidth: 2,
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  activeButton: {
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    borderColor: 'rgba(59, 130, 246, 0.8)',
    transform: [{ scale: 1.05 }],
  },
  emoji: {
    fontSize: 24,
    marginBottom: 6,
  },
  buttonText: {
    color: '#374151',
    fontSize: 13,
    fontWeight: '600',
  },
  activeButtonText: {
    fontWeight: 'bold',
    color: '#1f2937',
  },
});
