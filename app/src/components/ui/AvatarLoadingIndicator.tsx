import React from "react";
import { View, Text, ActivityIndicator, StyleSheet } from "react-native";

interface AvatarLoadingIndicatorProps {
  isLoading: boolean;
  progress?: {
    loaded: number;
    total: number;
    item: string;
  };
  style?: any;
}

export function AvatarLoadingIndicator({
  isLoading,
  progress,
  style,
}: AvatarLoadingIndicatorProps) {
  if (!isLoading && (!progress || progress.loaded >= progress.total)) {
    return null;
  }

  const progressPercentage = progress
    ? Math.round((progress.loaded / progress.total) * 100)
    : 0;

  return (
    <View style={[styles.container, style]}>
      <View style={styles.content}>
        <ActivityIndicator
          size="large"
          color="#007AFF"
          style={styles.spinner}
        />

        <Text style={styles.title}>Loading Avatar</Text>

        {progress && (
          <>
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${progressPercentage}%` },
                  ]}
                />
              </View>
              <Text style={styles.progressText}>{progressPercentage}%</Text>
            </View>

            <Text style={styles.countText}>
              {progress.loaded} / {progress.total} items
            </Text>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  content: {
    backgroundColor: "white",
    padding: 30,
    borderRadius: 15,
    alignItems: "center",
    minWidth: 250,
    maxWidth: "80%",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  spinner: {
    marginBottom: 15,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 20,
  },
  progressContainer: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    marginBottom: 10,
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: "#E0E0E0",
    borderRadius: 4,
    marginRight: 10,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#007AFF",
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#666",
    minWidth: 40,
    textAlign: "right",
  },
  statusText: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginBottom: 5,
    width: "100%",
  },
  countText: {
    fontSize: 12,
    color: "#999",
    textAlign: "center",
  },
});

export default AvatarLoadingIndicator;
