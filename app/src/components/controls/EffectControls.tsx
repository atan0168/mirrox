import React from "react";
import { TouchableOpacity, Text, View, StyleSheet } from "react-native";

interface EffectControlsProps {
  hazeEnabled: boolean;
  onHazeToggle: () => void;
  intensity?: number;
  onIntensityChange?: (intensity: number) => void;
}

export function EffectControls({ 
  hazeEnabled, 
  onHazeToggle, 
  intensity = 1.0,
  onIntensityChange 
}: EffectControlsProps) {
  const handleIntensityToggle = () => {
    if (onIntensityChange) {
      const newIntensity = intensity >= 1.0 ? 0.5 : intensity >= 0.5 ? 1.5 : 1.0;
      onIntensityChange(newIntensity);
    }
  };

  const getIntensityLabel = () => {
    if (intensity <= 0.5) return "Light";
    if (intensity >= 1.5) return "Heavy";
    return "Medium";
  };

  const getSmogEmoji = () => {
    if (!hazeEnabled) return "💨";
    if (intensity <= 0.5) return "🌫️";
    if (intensity >= 1.5) return "☁️";
    return "💨";
  };

  return (
    <View style={styles.controlsContainer}>
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
          {getSmogEmoji()} {hazeEnabled ? "Smog ON" : "Add Smog"}
        </Text>
      </TouchableOpacity>
      
      {hazeEnabled && onIntensityChange && (
        <TouchableOpacity
          style={styles.intensityButton}
          onPress={handleIntensityToggle}
        >
          <Text style={styles.intensityButtonText}>
            {getIntensityLabel()}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  controlsContainer: {
    position: "absolute",
    top: 50,
    right: 10,
    flexDirection: "column",
    gap: 8,
  },
  hazeButton: {
    backgroundColor: "#68D391",
    padding: 10,
    borderRadius: 8,
    alignItems: "center",
    minWidth: 110,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  activeHazeButton: {
    backgroundColor: "#38A169",
  },
  hazeButtonText: {
    color: "white",
    fontSize: 13,
    fontWeight: "700",
  },
  activeHazeButtonText: {
    color: "white",
    fontSize: 13,
    fontWeight: "700",
  },
  intensityButton: {
    backgroundColor: "#4A90E2",
    padding: 6,
    borderRadius: 6,
    alignItems: "center",
    minWidth: 110,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  intensityButtonText: {
    color: "white",
    fontSize: 11,
    fontWeight: "600",
  },
});
