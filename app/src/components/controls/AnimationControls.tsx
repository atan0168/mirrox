import React from "react";
import { TouchableOpacity, Text, View, StyleSheet } from "react-native";

interface AnimationControlsProps {
  availableAnimations: Array<{ name: string; label: string }>;
  activeAnimation: string | null;
  onAnimationToggle: (animationName: string) => void;
  visible?: boolean;
}

export function AnimationControls({
  availableAnimations,
  activeAnimation,
  onAnimationToggle,
  visible = true,
}: AnimationControlsProps) {
  if (!visible) return null;

  return (
    <View style={styles.animationButtonsContainer}>
      {availableAnimations.map((animation, index) => (
        <TouchableOpacity
          key={animation.name}
          style={[
            styles.animationButton,
            activeAnimation === animation.name && styles.activeAnimationButton,
            {
              marginBottom: index < availableAnimations.length - 1 ? 8 : 0,
            },
          ]}
          onPress={() => onAnimationToggle(animation.name)}
        >
          <Text
            style={[
              styles.animationButtonText,
              activeAnimation === animation.name &&
                styles.activeAnimationButtonText,
            ]}
          >
            {activeAnimation === animation.name
              ? `Stop ${animation.label}`
              : `Play ${animation.label}`}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  animationButtonsContainer: {
    position: "absolute",
    bottom: 10,
    left: 10,
    right: 10,
    flexDirection: "row", // Arrange children in a row
    flexWrap: "wrap", // Allow items to wrap to the next line
    justifyContent: "space-between", // Distribute space between items
    alignItems: "center", // Center items vertically
    alignContent: "center", // Center lines of wrapped items
    textAlign: "center",
  },
  animationButton: {
    backgroundColor: "#3182CE",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    width: "48%", // Set width for two columns with a small gap
    marginBottom: 8, // Add margin to the bottom of each button
  },
  activeAnimationButton: {
    backgroundColor: "#E53E3E",
  },
  animationButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },
  activeAnimationButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },
});
