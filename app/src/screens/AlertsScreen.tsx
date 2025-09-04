import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, fontSize } from '../theme';

const AlertsScreen: React.FC = () => {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyTitle}>No active alerts</Text>
      <Text style={styles.emptySubtitle}>
        You’re all caught up. Check back later.
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  empty: {
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.neutral[800],
    marginBottom: spacing.xs,
  },
  emptySubtitle: {
    fontSize: fontSize.sm,
    color: colors.neutral[600],
  },
});

export default AlertsScreen;
