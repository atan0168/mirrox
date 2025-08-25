import React from "react";
import { View, Text, StyleSheet } from "react-native";

interface DebugOverlayProps {
  title?: string;
}

export function DebugOverlay({ title = "Your Digital Twin" }: DebugOverlayProps) {
  return (
    <View style={styles.debugContainer}>
      <Text style={styles.debugText}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  debugContainer: {
    position: "absolute",
    top: 10,
    left: 10,
    right: 10,
    backgroundColor: "rgba(0,0,0,0.5)",
    padding: 5,
    borderRadius: 5,
  },
  debugText: {
    color: "white",
    textAlign: "center",
    fontSize: 12,
  },
});
