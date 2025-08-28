import React, { useState } from 'react';
import { View, StyleSheet, Text, SafeAreaView } from 'react-native';
import ThreeAvatar from '../components/ThreeAvatar';
import { colors, spacing, fontSize, borderRadius, shadows } from '../theme';

export default function AvatarCustomizationScreen() {
  const [skinToneAdjustment, setSkinToneAdjustment] = useState(0);

  const handleSkinToneChange = (value: number) => {
    setSkinToneAdjustment(value);
    console.log(`Skin tone adjusted to: ${value}`);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Avatar Customization</Text>

        <View style={styles.avatarContainer}>
          <ThreeAvatar
            width={300}
            height={400}
            showSkinToneControls={true}
            skinToneAdjustment={skinToneAdjustment}
            onSkinToneChange={handleSkinToneChange}
            facialExpression="neutral"
          />
        </View>

        <View style={styles.infoContainer}>
          <Text style={styles.infoTitle}>Instructions:</Text>
          <Text style={styles.infoText}>
            • Use the skin tone slider to darken or lighten your avatar's skin
          </Text>
          <Text style={styles.infoText}>
            • Negative values make the skin darker
          </Text>
          <Text style={styles.infoText}>
            • Positive values make the skin lighter
          </Text>
          <Text style={styles.currentValue}>
            Current adjustment: {skinToneAdjustment.toFixed(1)}
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.neutral[50],
  },
  content: {
    flex: 1,
    padding: spacing.lg,
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: spacing.lg,
    color: colors.black,
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  infoContainer: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    ...shadows.soft,
  },
  infoTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    marginBottom: spacing.md,
    color: colors.black,
  },
  infoText: {
    fontSize: fontSize.sm,
    marginBottom: spacing.xs,
    color: colors.neutral[600],
    lineHeight: 20,
  },
  currentValue: {
    fontSize: fontSize.base,
    fontWeight: '600',
    marginTop: spacing.sm,
    color: colors.neutral[700],
    textAlign: 'center',
  },
});
