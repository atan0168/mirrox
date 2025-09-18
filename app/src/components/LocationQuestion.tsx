import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import * as Location from 'expo-location';
import { ChevronRight, MapPin } from 'lucide-react-native';

import { RootStackParamList } from '../../App';
import { UserLocationDetails } from '../models/User';
import { colors, spacing, fontSize, borderRadius } from '../theme';
import { Button } from './ui';
import { placemarkToUserLocation } from '../utils/locationHelpers';

interface LocationQuestionProps {
  label: string;
  description?: string;
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
  description,
  value,
  onChange,
  allowCurrentLocation = true,
}) => {
  const navigation = useNavigation<LocationPickerNavigation>();
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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

  const ensurePermission = useCallback(async () => {
    const { status: permissionStatus } =
      await Location.requestForegroundPermissionsAsync();

    if (permissionStatus !== Location.PermissionStatus.GRANTED) {
      throw new Error('Location permission is required.');
    }
  }, []);

  const handleUseCurrentLocation = useCallback(async () => {
    try {
      setLoading(true);
      setStatus('Fetching your current location…');
      setError(null);

      await ensurePermission();

      const position = await Location.getCurrentPositionAsync({});
      const placemarks = await Location.reverseGeocodeAsync({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });

      const normalized = placemarkToUserLocation(
        position.coords,
        placemarks[0] ?? null
      );

      onChange(normalized);
      setStatus('Current location set');
    } catch (locationError) {
      console.error('Failed to fetch current location', locationError);
      setStatus(null);
      setError(
        locationError instanceof Error
          ? locationError.message
          : 'Unable to fetch your current location.'
      );
    } finally {
      setLoading(false);
    }
  }, [ensurePermission, onChange]);

  const handleClear = useCallback(() => {
    onChange(null);
    setStatus('Location cleared');
    setError(null);
  }, [onChange]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        {value ? (
          <Button
            size="sm"
            variant="ghost"
            onPress={handleClear}
            disabled={loading}
          >
            Clear
          </Button>
        ) : null}
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
          <MapPin size={18} color={colors.neutral[600]} />
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

      <View style={styles.actionsRow}>
        {allowCurrentLocation ? (
          <Button
            size="sm"
            variant="secondary"
            onPress={handleUseCurrentLocation}
            disabled={loading}
          >
            Use Current Location
          </Button>
        ) : null}
        <Button
          size="sm"
          variant="outline"
          onPress={handleNavigate}
          disabled={loading}
        >
          Open Location Picker
        </Button>
      </View>

      {loading ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" color={colors.neutral[600]} />
          <Text style={styles.loadingText}>Updating…</Text>
        </View>
      ) : null}

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
  label: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.black,
    flexShrink: 1,
  },
  description: {
    fontSize: fontSize.sm,
    color: colors.neutral[600],
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
  actionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  loadingText: {
    fontSize: fontSize.sm,
    color: colors.neutral[600],
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
