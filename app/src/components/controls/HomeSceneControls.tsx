import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useHomeSceneStore } from '../../store/homeSceneStore';

// Developer-only controls for the Home scene prototype.
// Mirrors the lightweight style of WeatherControls.

const TIME_OPTIONS: Array<{
  key: 'morning' | 'day' | 'evening' | 'night';
  label: string;
}> = [
  { key: 'morning', label: 'Morning' },
  { key: 'day', label: 'Day' },
  { key: 'evening', label: 'Evening' },
  { key: 'night', label: 'Night' },
];

export function HomeSceneControls({ visible = true }: { visible?: boolean }) {
  const timeOfDay = useHomeSceneStore(s => s.timeOfDay);
  const setTimeOfDay = useHomeSceneStore(s => s.setTimeOfDay);
  const windowOpen = useHomeSceneStore(s => s.windowOpen);
  const toggleWindow = useHomeSceneStore(s => s.toggleWindow);
  const lampOn = useHomeSceneStore(s => s.lampOn);
  const toggleLamp = useHomeSceneStore(s => s.toggleLamp);
  const kettleActive = useHomeSceneStore(s => s.kettleActive);
  const toggleKettle = useHomeSceneStore(s => s.toggleKettle);

  if (!visible) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.sectionLabel}>Time</Text>
      <View style={styles.row}>
        {TIME_OPTIONS.map(opt => (
          <TouchableOpacity
            key={opt.key}
            style={[
              styles.button,
              timeOfDay === opt.key && styles.buttonActive,
            ]}
            onPress={() => setTimeOfDay(opt.key)}
          >
            <Text
              style={[
                styles.buttonText,
                timeOfDay === opt.key && styles.buttonTextActive,
              ]}
            >
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <Text style={[styles.sectionLabel, { marginTop: 6 }]}>Toggles</Text>
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
    top: 54, // below weather controls
    left: 10,
    padding: 8,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: 8,
    maxWidth: 320,
  },
  sectionLabel: {
    color: '#e2e8f0',
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 4,
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
    marginRight: 6,
    marginBottom: 6,
  },
  smallButtonActive: {
    backgroundColor: '#16a34a',
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
