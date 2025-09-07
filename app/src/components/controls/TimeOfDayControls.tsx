import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useAvatarStore } from '../../store/avatarStore';

// Developer control bar for unified global time-of-day override.
// Phases: morning / day / evening / night. Null = auto mapping.
// Auto mapping window (local time):
//  - Morning: 06:00 - 10:59
//  - Day:     11:00 - 16:59
//  - Evening: 17:00 - 20:59
//  - Night:   21:00 - 05:59

const OPTIONS: Array<{
  key: ReturnType<typeof String> | null;
  label: string;
  phase: any;
}> = [
  { key: null, label: 'Auto', phase: null },
  { key: 'morning', label: 'Morning', phase: 'morning' },
  { key: 'day', label: 'Day', phase: 'day' },
  { key: 'evening', label: 'Evening', phase: 'evening' },
  { key: 'night', label: 'Night', phase: 'night' },
];

export function TimeOfDayControls({ visible = true }: { visible?: boolean }) {
  const value = useAvatarStore(s => s.timeOfDayOverride);
  const setValue = useAvatarStore(s => s.setTimeOfDayOverride);
  if (!visible) return null;
  return (
    <View style={styles.container}>
      {OPTIONS.map(opt => (
        <TouchableOpacity
          key={String(opt.key)}
          style={[styles.button, value === opt.phase && styles.activeButton]}
          onPress={() => setValue(opt.phase === null ? null : opt.phase)}
        >
          <Text
            style={[
              styles.buttonText,
              value === opt.phase && styles.activeButtonText,
            ]}
          >
            {opt.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 10,
    left: 10,
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.4)',
    padding: 6,
    borderRadius: 8,
    gap: 6,
  },
  button: {
    backgroundColor: '#475569',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  activeButton: {
    backgroundColor: '#2563EB',
  },
  buttonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  activeButtonText: {
    color: 'white',
  },
});

export default TimeOfDayControls;
