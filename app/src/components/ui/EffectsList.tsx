import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { EffectsModal, EffectData } from './EffectsModal';
import { colors, spacing, fontSize, borderRadius } from '../../theme';

interface EffectsListProps {
  effects: EffectData[];
  title?: string;
}

export const EffectsList: React.FC<EffectsListProps> = ({
  effects,
  title = 'Active Effects on Avatar',
}) => {
  const [selectedEffect, setSelectedEffect] = useState<EffectData | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const handleEffectPress = (effect: EffectData) => {
    setSelectedEffect(effect);
    setModalVisible(true);
  };

  const handleCloseModal = () => {
    setModalVisible(false);
    setSelectedEffect(null);
  };

  if (effects.length === 0) {
    return null;
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return colors.red?.[600] || '#DC2626';
      case 'medium':
        return colors.yellow?.[600] || '#D97706';
      case 'low':
        return colors.green?.[600] || '#059669';
      default:
        return colors.neutral[600];
    }
  };

  const getSeverityBackground = (severity: string) => {
    switch (severity) {
      case 'high':
        return colors.red[50];
      case 'medium':
        return colors.yellow[50];
      case 'low':
        return colors.green[50];
      default:
        return colors.neutral[50];
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>
          {effects.length} effect{effects.length !== 1 ? 's' : ''} applied
        </Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.effectsScroll}
        contentContainerStyle={styles.effectsContainer}
      >
        {effects.map(effect => (
          <TouchableOpacity
            key={effect.id}
            style={[
              styles.effectChip,
              { backgroundColor: getSeverityBackground(effect.severity) },
            ]}
            onPress={() => handleEffectPress(effect)}
            activeOpacity={0.7}
          >
            <View style={styles.effectContent}>
              <Text
                style={[
                  styles.effectTitle,
                  { color: getSeverityColor(effect.severity) },
                ]}
                numberOfLines={1}
              >
                {effect.title}
              </Text>
              <Text style={styles.effectDescription} numberOfLines={2}>
                {effect.description}
              </Text>
            </View>
            <View style={styles.moreIndicator}>
              <Text
                style={[
                  styles.moreText,
                  { color: getSeverityColor(effect.severity) },
                ]}
              >
                ›
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <EffectsModal
        visible={modalVisible}
        onClose={handleCloseModal}
        effect={selectedEffect}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    marginBottom: spacing.md,
  },
  title: {
    fontSize: fontSize.base,
    fontWeight: '600',
    color: colors.neutral[900],
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: fontSize.sm,
    color: colors.neutral[600],
  },
  effectsScroll: {
    marginHorizontal: -spacing.xs,
  },
  effectsContainer: {
    paddingHorizontal: spacing.xs,
    gap: spacing.sm,
  },
  effectChip: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 200,
    maxWidth: 280,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.neutral[200],
  },
  effectContent: {
    flex: 1,
    marginRight: spacing.sm,
  },
  effectTitle: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  effectDescription: {
    fontSize: fontSize.xs,
    color: colors.neutral[600],
    lineHeight: 16,
  },
  moreIndicator: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  moreText: {
    fontSize: fontSize.lg,
    fontWeight: '600',
  },
});
