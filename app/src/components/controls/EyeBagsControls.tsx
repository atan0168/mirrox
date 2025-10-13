import React from 'react';
import { View, Text, StyleSheet, Switch } from 'react-native';
import Slider from '@react-native-community/slider';
import { colors, spacing, borderRadius, fontSize } from '../../theme';
import { useAvatarStore } from '../../store/avatarStore';

const EyeBagsControls: React.FC = () => {
  const eyeBagsOverride = useAvatarStore(s => s.eyeBagsOverrideEnabled);
  const setEyeBagsOverride = useAvatarStore(s => s.setEyeBagsOverrideEnabled);
  const eyeBagsIntensity = useAvatarStore(s => s.eyeBagsIntensity);
  const setEyeBagsIntensity = useAvatarStore(s => s.setEyeBagsIntensity);
  const eyeBagsOffsetX = useAvatarStore(s => s.eyeBagsOffsetX);
  const eyeBagsOffsetY = useAvatarStore(s => s.eyeBagsOffsetY);
  const eyeBagsOffsetZ = useAvatarStore(s => s.eyeBagsOffsetZ);
  const setEyeBagsOffsets = useAvatarStore(s => s.setEyeBagsOffsets);
  const eyeBagsWidth = useAvatarStore(s => s.eyeBagsWidth);
  const eyeBagsHeight = useAvatarStore(s => s.eyeBagsHeight);
  const setEyeBagsSize = useAvatarStore(s => s.setEyeBagsSize);

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <Text style={styles.label}>Eye Bags (Override)</Text>
        <Switch value={eyeBagsOverride} onValueChange={setEyeBagsOverride} />
      </View>

      {eyeBagsOverride && (
        <View style={{ marginTop: spacing.sm }}>
          <Text style={styles.subtle}>
            Intensity: {(eyeBagsIntensity * 100).toFixed(0)}%
          </Text>
          <Slider
            value={eyeBagsIntensity}
            onValueChange={setEyeBagsIntensity}
            minimumValue={0}
            maximumValue={1}
            step={0.05}
            minimumTrackTintColor={colors.neutral[700]}
            maximumTrackTintColor={colors.neutral[300]}
          />

          <Text style={styles.subtle}>
            Offset X: {eyeBagsOffsetX.toFixed(3)}
          </Text>
          <Slider
            value={eyeBagsOffsetX}
            onValueChange={v =>
              setEyeBagsOffsets(v, eyeBagsOffsetY, eyeBagsOffsetZ)
            }
            minimumValue={-0.15}
            maximumValue={0.15}
            step={0.005}
            minimumTrackTintColor={colors.neutral[700]}
            maximumTrackTintColor={colors.neutral[300]}
          />

          <Text style={styles.subtle}>
            Offset Y: {eyeBagsOffsetY.toFixed(3)}
          </Text>
          <Slider
            value={eyeBagsOffsetY}
            onValueChange={v =>
              setEyeBagsOffsets(eyeBagsOffsetX, v, eyeBagsOffsetZ)
            }
            minimumValue={-0.15}
            maximumValue={0.15}
            step={0.005}
            minimumTrackTintColor={colors.neutral[700]}
            maximumTrackTintColor={colors.neutral[300]}
          />

          <Text style={styles.subtle}>
            Offset Z: {eyeBagsOffsetZ.toFixed(3)}
          </Text>
          <Slider
            value={eyeBagsOffsetZ}
            onValueChange={v =>
              setEyeBagsOffsets(eyeBagsOffsetX, eyeBagsOffsetY, v)
            }
            minimumValue={-0.2}
            maximumValue={0.2}
            step={0.005}
            minimumTrackTintColor={colors.neutral[700]}
            maximumTrackTintColor={colors.neutral[300]}
          />

          <Text style={styles.subtle}>Width: {eyeBagsWidth.toFixed(3)}</Text>
          <Slider
            value={eyeBagsWidth}
            onValueChange={v => setEyeBagsSize(v, eyeBagsHeight)}
            minimumValue={0.05}
            maximumValue={0.25}
            step={0.005}
            minimumTrackTintColor={colors.neutral[700]}
            maximumTrackTintColor={colors.neutral[300]}
          />

          <Text style={styles.subtle}>Height: {eyeBagsHeight.toFixed(3)}</Text>
          <Slider
            value={eyeBagsHeight}
            onValueChange={v => setEyeBagsSize(eyeBagsWidth, v)}
            minimumValue={0.03}
            maximumValue={0.15}
            step={0.005}
            minimumTrackTintColor={colors.neutral[700]}
            maximumTrackTintColor={colors.neutral[300]}
          />

          <Text style={styles.hint}>
            When override is off, eye bags follow sleep data.
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    elevation: 2,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    marginTop: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  label: {
    fontSize: fontSize.base,
    fontWeight: '600',
    color: colors.neutral[800],
  },
  subtle: {
    fontSize: fontSize.sm,
    color: colors.neutral[600],
    marginBottom: spacing.xs,
  },
  hint: {
    fontSize: fontSize.xs,
    color: colors.neutral[500],
    marginTop: spacing.xs,
  },
});

export default EyeBagsControls;
