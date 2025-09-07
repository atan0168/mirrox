import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useHomeSceneStore } from '../../store/homeSceneStore';

// Developer-only controls for the Home scene prototype.
// Mirrors the lightweight style of WeatherControls.

export function HomeSceneControls({ visible = true }: { visible?: boolean }) {
  const windowOpen = useHomeSceneStore(s => s.windowOpen);
  const toggleWindow = useHomeSceneStore(s => s.toggleWindow);
  const lampOn = useHomeSceneStore(s => s.lampOn);
  const toggleLamp = useHomeSceneStore(s => s.toggleLamp);
  const kettleActive = useHomeSceneStore(s => s.kettleActive);
  const toggleKettle = useHomeSceneStore(s => s.toggleKettle);

  if (!visible) return null;

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <TouchableOpacity
          style={[styles.smallButton, windowOpen && styles.smallButtonActive]}
          onPress={toggleWindow}
        >
          <Text
            style={[
              styles.smallButtonText,
              windowOpen && styles.smallButtonTextActive,
            ]}
          >
            Window {windowOpen ? 'Open' : 'Closed'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.smallButton, lampOn && styles.smallButtonActive]}
          onPress={toggleLamp}
        >
          <Text
            style={[
              styles.smallButtonText,
              lampOn && styles.smallButtonTextActive,
            ]}
          >
            Lamp {lampOn ? 'On' : 'Off'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.smallButton, kettleActive && styles.smallButtonActive]}
          onPress={toggleKettle}
        >
          <Text
            style={[
              styles.smallButtonText,
              kettleActive && styles.smallButtonTextActive,
            ]}
          >
            Kettle {kettleActive ? 'On' : 'Off'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 98, // below weather controls
    left: 10,
    padding: 8,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: 8,
    maxWidth: 320,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  button: {
    backgroundColor: '#374151',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    marginRight: 6,
    marginBottom: 6,
  },
  buttonActive: {
    backgroundColor: '#2563EB',
  },
  buttonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  buttonTextActive: {
    color: 'white',
  },
  smallButton: {
    backgroundColor: '#475569',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  smallButtonActive: {
    backgroundColor: '#2563EB',
  },
  smallButtonText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '600',
  },
  smallButtonTextActive: {
    color: 'white',
  },
});

export default HomeSceneControls;
