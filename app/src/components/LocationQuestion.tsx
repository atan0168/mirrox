import React, { useCallback, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { ChevronRight, MapPin } from 'lucide-react-native';

import type { RootStackParamList } from '../navigation/types';
import { UserLocationDetails } from '../models/User';
import { colors, spacing, fontSize, borderRadius } from '../theme';
import { Button } from './ui';

interface LocationQuestionProps {
  label: string;
  description?: string;
  icon?: React.ComponentType<{ size: number; color: string }>;
  value: UserLocationDetails | null;
  onChange: (value: UserLocationDetails | null) => void;
  allowCurrentLocation?: boolean;
}

const formatCoord = (value: number) => value.toFixed(4);

type LocationPickerNavigation = StackNavigationProp<
  RootStackParamList,
  'LocationPicker'
>;

export const LocationQuestion: React.FC<LocationQuestionProps> = ({
  label,
  description,
  value,
  icon,
  onChange,
  allowCurrentLocation = true,
}) => {
  const navigation = useNavigation<LocationPickerNavigation>();
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const Icon = icon || MapPin;

  const handleNavigate = useCallback(() => {
    setStatus(null);
    setError(null);
    navigation.navigate('LocationPicker', {
      initialLocation: value,
      allowCurrentLocation,
      onSelect: selection => {
        onChange(selection);
        setStatus(selection ? 'Location updated' : 'Location cleared');
        setError(null);
      },
    });
  }, [allowCurrentLocation, navigation, onChange, value]);

  const handleClear = useCallback(() => {
    onChange(null);
    setStatus('Location cleared');
    setError(null);
  }, [onChange]);

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.label}>{label}</Text>
        <View style={styles.header}>
          {value ? (
            <Button size="sm" variant="primary" onPress={handleClear}>
              Clear
            </Button>
          ) : null}
        </View>
      </View>
      {description ? (
        <Text style={styles.description}>{description}</Text>
      ) : null}

      <TouchableOpacity
        style={styles.summaryCard}
        activeOpacity={0.8}
        onPress={handleNavigate}
      >
        <View style={styles.summaryIcon}>
          <Icon size={18} color={colors.neutral[600]} />
        </View>
        <View style={styles.summaryContent}>
          <Text style={styles.summaryTitle}>
            {value?.label || 'No location selected'}
          </Text>
          {value ? (
            <Text style={styles.summarySubtitle}>
              {formatCoord(value.coordinates.latitude)},
              {formatCoord(value.coordinates.longitude)}
            </Text>
          ) : (
            <Text style={styles.summaryPlaceholder}>
              Tap to choose via map or search
            </Text>
          )}
        </View>
        <ChevronRight size={20} color={colors.neutral[400]} />
      </TouchableOpacity>

      {status ? <Text style={styles.statusText}>{status}</Text> : null}
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  label: {
    fontSize: fontSize.lg,
    fontWeight: '500',
    color: colors.neutral[600],
    flexShrink: 1,
  },
  description: {
    fontSize: fontSize.sm,
    color: colors.neutral[600],
    marginBottom: spacing.sm,
  },
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    backgroundColor: colors.white,
    padding: spacing.md,
    gap: spacing.md,
  },
  summaryIcon: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.full,
    backgroundColor: colors.neutral[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryContent: {
    flex: 1,
    gap: spacing.xs,
  },
  summaryTitle: {
    fontSize: fontSize.base,
    color: colors.black,
    fontWeight: '600',
  },
  summarySubtitle: {
    fontSize: fontSize.sm,
    color: colors.neutral[600],
  },
  summaryPlaceholder: {
    fontSize: fontSize.sm,
    color: colors.neutral[500],
  },
  statusText: {
    fontSize: fontSize.xs,
    color: colors.neutral[500],
  },
  errorText: {
    fontSize: fontSize.sm,
    color: colors.red[600],
    fontWeight: '500',
  },
});

export default LocationQuestion;
