import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, fontSize, borderRadius } from '../../theme';

export interface TableRow {
  label: string;
  value: string;
  description?: string;
}

interface InfoTableProps {
  title?: string;
  rows: TableRow[];
}

const InfoTable: React.FC<InfoTableProps> = ({ title, rows }) => {
  return (
    <View style={styles.container}>
      {title && <Text style={styles.title}>{title}</Text>}
      <View style={styles.table}>
        {rows.map((row, index) => (
          <View
            key={index}
            style={[styles.row, index === rows.length - 1 && styles.lastRow]}
          >
            <View style={styles.labelColumn}>
              <Text style={styles.label}>{row.label}</Text>
              {row.description && (
                <Text style={styles.description}>{row.description}</Text>
              )}
            </View>
            <View style={styles.valueColumn}>
              <Text style={styles.value}>{row.value}</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: spacing.sm,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.neutral[800],
    marginBottom: spacing.sm,
  },
  table: {
    backgroundColor: colors.neutral[50],
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[200],
    alignItems: 'center',
  },
  lastRow: {
    borderBottomWidth: 0,
  },
  labelColumn: {
    flex: 2,
    paddingRight: spacing.sm,
  },
  valueColumn: {
    flex: 1,
    alignItems: 'flex-end',
  },
  label: {
    fontSize: fontSize.base,
    fontWeight: '500',
    color: colors.neutral[800],
  },
  description: {
    fontSize: fontSize.sm,
    color: colors.neutral[600],
    marginTop: spacing.xs / 2,
    lineHeight: 18,
  },
  value: {
    fontSize: fontSize.base,
    fontWeight: '600',
    color: colors.neutral[900],
    textAlign: 'right',
  },
});

export default InfoTable;
