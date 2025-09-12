import React from 'react';
import { Modal, View, Text, StyleSheet, ScrollView } from 'react-native';
import { Battery, Info } from 'lucide-react-native';
import {
  colors,
  spacing,
  borderRadius,
  fontSize,
  lineHeight,
} from '../../theme';
import { Card } from './Card';
import { Button } from './Button';

interface EnergyInfoModalProps {
  visible: boolean;
  onClose: () => void;
}

export function EnergyInfoModal({ visible, onClose }: EnergyInfoModalProps) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Card style={styles.modalContainer} variant="default">
          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            {/* Header */}
            <View style={styles.header}>
              <Battery size={32} color={colors.neutral[800]} style={styles.headerIcon} />
              <Text style={styles.headerTitle}>Energy Battery</Text>
            </View>

            {/* Description */}
            <View style={styles.section}>
              <Text style={styles.description}>
                A simple estimate of daily energy based on your sleep and time awake.
              </Text>
            </View>

            {/* How it works */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>How it’s calculated</Text>
              {[
                'After ~7.5 hours of sleep you start near 100%. Less sleep starts lower.',
                'Energy gradually depletes while you’re awake (about 16 hours from full to empty).',
                'Short daytime naps add a small boost back.',
                'It resets each day at local midnight based on last night’s sleep.',
              ].map((item, idx) => (
                <View key={idx} style={styles.listItem}>
                  <View style={styles.bullet} />
                  <Text style={styles.listText}>{item}</Text>
                </View>
              ))}
            </View>

            {/* Note */}
            <View style={styles.section}>
              <View style={styles.infoRow}>
                <Info size={16} color={colors.neutral[400]} />
                <Text style={styles.infoText}>
                  This is a lightweight guide, not a medical or diagnostic metric.
                </Text>
              </View>
            </View>
          </ScrollView>

          {/* Close Button */}
          <View style={styles.buttonContainer}>
            <Button onPress={onClose} variant="secondary" fullWidth>
              Got it
            </Button>
          </View>
        </Card>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay.darker,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalContainer: {
    maxHeight: '80%',
    width: '100%',
    maxWidth: 420,
  },
  scrollView: {
    maxHeight: 480,
  },
  header: {
    padding: spacing.lg,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    alignItems: 'center',
  },
  headerIcon: {
    marginBottom: spacing.sm,
  },
  headerTitle: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: lineHeight.tight * fontSize.xl,
    color: colors.neutral[900],
  },
  section: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  description: {
    fontSize: fontSize.base,
    color: colors.neutral[700],
    textAlign: 'center',
    lineHeight: lineHeight.normal * fontSize.base,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.neutral[800],
    marginBottom: spacing.sm,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: borderRadius.full,
    backgroundColor: colors.neutral[400],
    marginRight: spacing.md,
    marginTop: 6,
  },
  listText: {
    fontSize: fontSize.sm,
    color: colors.neutral[700],
    flex: 1,
    lineHeight: lineHeight.normal * fontSize.sm,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  infoText: {
    fontSize: fontSize.xs,
    color: colors.neutral[500],
    fontStyle: 'italic',
    lineHeight: lineHeight.normal * fontSize.xs,
    marginLeft: spacing.sm,
    flex: 1,
  },
  buttonContainer: {
    padding: spacing.lg,
    paddingTop: 0,
  },
});

export default EnergyInfoModal;

