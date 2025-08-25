import React, { useState } from "react";
import { View, TouchableOpacity, Text, StyleSheet } from "react-native";

interface AdvancedFacialControlsProps {
  currentExpression: string;
  onExpressionChange: (expression: string) => void;
  onCustomExpressionChange?: (morphTargets: { [key: string]: number }) => void;
}

const HEALTH_EXPRESSIONS = [
  { name: "healthy", emoji: "😊", description: "Healthy & Energetic" },
  { name: "mild_symptoms", emoji: "😐", description: "Mild Symptoms" },
  { name: "tired", emoji: "😴", description: "Tired" },
  { name: "breathing_difficulty", emoji: "😤", description: "Breathing Issues" },
  { name: "coughing", emoji: "😷", description: "Coughing" },
  { name: "sick", emoji: "🤢", description: "Feeling Sick" },
  { name: "exhausted", emoji: "😵", description: "Exhausted" },
  { name: "concerned", emoji: "😟", description: "Concerned" },
];

export function AdvancedFacialControls({
  currentExpression,
  onExpressionChange,
}: AdvancedFacialControlsProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Health Status Expression</Text>
        <TouchableOpacity
          style={styles.advancedToggle}
          onPress={() => setShowAdvanced(!showAdvanced)}
        >
          <Text style={styles.advancedText}>
            {showAdvanced ? "Simple" : "Advanced"}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.expressionContainer}>
        {HEALTH_EXPRESSIONS.map((expression) => (
          <TouchableOpacity
            key={expression.name}
            style={[
              styles.healthButton,
              currentExpression === expression.name && styles.activeHealthButton,
            ]}
            onPress={() => onExpressionChange(expression.name)}
          >
            <Text style={styles.healthEmoji}>{expression.emoji}</Text>
            <Text style={styles.healthDescription}>{expression.description}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 10,
    left: 10,
    right: 10,
    padding: 16,
    backgroundColor: "rgba(0, 0, 0, 0.9)",
    borderRadius: 16,
    zIndex: 1000,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
  },
  advancedToggle: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  advancedText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },
  expressionContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 8,
  },
  healthButton: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignItems: "center",
    minWidth: 100,
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  activeHealthButton: {
    backgroundColor: "rgba(0, 122, 255, 0.8)",
    borderColor: "#007AFF",
    transform: [{ scale: 1.05 }],
  },
  healthEmoji: {
    fontSize: 20,
    marginBottom: 4,
  },
  healthDescription: {
    color: "white",
    fontSize: 12,
    textAlign: "center",
    fontWeight: "500",
  },
});
