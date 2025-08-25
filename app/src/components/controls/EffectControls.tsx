import React from "react";
import { TouchableOpacity, Text, View, StyleSheet } from "react-native";

interface EffectControlsProps {
  hazeEnabled: boolean;
  onHazeToggle: () => void;
}

export function EffectControls({ hazeEnabled, onHazeToggle }: EffectControlsProps) {
  return (
    <View style={styles.hazeButtonContainer}>
      <TouchableOpacity
        style={[
          styles.hazeButton,
          hazeEnabled && styles.activeHazeButton,
        ]}
        onPress={onHazeToggle}
      >
        <Text
          style={[
            styles.hazeButtonText,
            hazeEnabled && styles.activeHazeButtonText,
          ]}
        >
          {hazeEnabled ? "💨 Smog ON" : "💨 Add Smog"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  hazeButtonContainer: {
    position: "absolute",
    top: 50,
    right: 10,
  },
  hazeButton: {
    backgroundColor: "#68D391",
    padding: 8,
    borderRadius: 6,
    alignItems: "center",
    minWidth: 100,
  },
  activeHazeButton: {
    backgroundColor: "#38A169",
  },
  hazeButtonText: {
    color: "white",
    fontSize: 12,
    fontWeight: "600",
  },
  activeHazeButtonText: {
    color: "white",
    fontSize: 12,
    fontWeight: "600",
  },
});
