import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { ActivityIndicator, StyleSheet, Text, View, Alert } from 'react-native';
import * as Location from 'expo-location';
import { locationIQService } from '../services/LocationIQService';
import { UserLocationDetails } from '../models/User';
import { Button, Input } from './ui';
import { borderRadius, colors, fontSize, spacing } from '../theme';

interface LocationQuestionProps {
  label: string;
  description?: string;
  value: UserLocationDetails | null;
  onChange: (value: UserLocationDetails | null) => void;
  defaultCoordinates?: { latitude: number; longitude: number } | null;
  allowCopyFrom?: UserLocationDetails | null;
  onCopyRequested?: () => void;
}

const formatCoord = (value: number) => value.toFixed(6);

export const LocationQuestion: React.FC<LocationQuestionProps> = ({
  label,
  description,
  value,
  onChange,
  defaultCoordinates,
  allowCopyFrom,
  onCopyRequested,
}) => {
  const [latInput, setLatInput] = useState('');
  const [lngInput, setLngInput] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const hasPrefilled = useRef(false);

  const hasDefault = useMemo(
    () =>
      defaultCoordinates != null &&
      Number.isFinite(defaultCoordinates.latitude) &&
      Number.isFinite(defaultCoordinates.longitude),
    [defaultCoordinates]
  );

  const handleLookup = useCallback(
    async (latitude: number, longitude: number) => {
      setIsLoading(true);
      setError(null);
      setStatus('Looking up address…');
      try {
        const location = await locationIQService.reverseGeocode(
          latitude,
          longitude
        );
        setLatInput(formatCoord(latitude));
        setLngInput(formatCoord(longitude));
        onChange(location);
        setStatus('Address updated');
      } catch (lookupError) {
        console.error('Reverse geocode failed', lookupError);
        const message =
          lookupError instanceof Error
            ? lookupError.message
            : 'Unable to reverse geocode these coordinates.';
        setError(message);
        setStatus(null);
      } finally {
        setIsLoading(false);
      }
    },
    [onChange]
  );

  const handleUseCurrentLocation = useCallback(async () => {
    try {
      setError(null);
      setStatus('Requesting location permission…');
      const { status: permissionStatus } =
        await Location.requestForegroundPermissionsAsync();
      if (permissionStatus !== Location.PermissionStatus.GRANTED) {
        setStatus(null);
        setError(
          'Location permission is required to use your current location.'
        );
        return;
      }

      setStatus('Fetching current location…');
      const position = await Location.getCurrentPositionAsync({});
      await handleLookup(position.coords.latitude, position.coords.longitude);
    } catch (locationError) {
      console.error('Failed to obtain current location', locationError);
      setStatus(null);
      setError(
        locationError instanceof Error
          ? locationError.message
          : 'Unable to obtain your current location.'
      );
    }
  }, [handleLookup]);

  const handleUseDefault = useCallback(() => {
    if (!defaultCoordinates) {
      return;
    }
    void handleLookup(
      defaultCoordinates.latitude,
      defaultCoordinates.longitude
    );
  }, [defaultCoordinates, handleLookup]);

  const handleManualLookup = useCallback(() => {
    const lat = Number.parseFloat(latInput);
    const lng = Number.parseFloat(lngInput);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      setError('Enter valid latitude and longitude values.');
      return;
    }
    void handleLookup(lat, lng);
  }, [handleLookup, latInput, lngInput]);

  useEffect(() => {
    if (value) {
      setLatInput(formatCoord(value.coordinates.latitude));
      setLngInput(formatCoord(value.coordinates.longitude));
    }
  }, [value]);

  useEffect(() => {
    if (hasPrefilled.current) return;
    if (!value && hasDefault && defaultCoordinates) {
      hasPrefilled.current = true;
      void handleLookup(
        defaultCoordinates.latitude,
        defaultCoordinates.longitude
      );
    }
  }, [defaultCoordinates, handleLookup, hasDefault, value]);

  const handleCopyFrom = useCallback(() => {
    if (allowCopyFrom && onCopyRequested) {
      onCopyRequested();
    } else if (allowCopyFrom) {
      onChange({ ...allowCopyFrom });
    } else {
      Alert.alert('No saved location to copy.');
    }
  }, [allowCopyFrom, onChange, onCopyRequested]);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      {description ? (
        <Text style={styles.description}>{description}</Text>
      ) : null}

      <View style={styles.actionsRow}>
        <Button
          size="sm"
          variant="secondary"
          onPress={handleUseCurrentLocation}
          disabled={isLoading}
        >
          Use Current Location
        </Button>
        {hasDefault ? (
          <Button
            size="sm"
            variant="outline"
            onPress={handleUseDefault}
            disabled={isLoading}
          >
            Use Selected City
          </Button>
        ) : null}
        {allowCopyFrom ? (
          <Button
            size="sm"
            variant="outline"
            onPress={handleCopyFrom}
            disabled={isLoading}
          >
            Use Saved Location
          </Button>
        ) : null}
      </View>

      <View style={styles.coordinatesRow}>
        <Input
          label="Latitude"
          keyboardType="decimal-pad"
          value={latInput}
          onChangeText={text => {
            setLatInput(text);
            setError(null);
          }}
          containerStyle={styles.coordinateInput}
        />
        <Input
          label="Longitude"
          keyboardType="decimal-pad"
          value={lngInput}
          onChangeText={text => {
            setLngInput(text);
            setError(null);
          }}
          containerStyle={styles.coordinateInput}
        />
      </View>

      <Button
        size="sm"
        variant="ghost"
        onPress={handleManualLookup}
        disabled={isLoading}
        style={styles.lookupButton}
      >
        Lookup Address
      </Button>

      <View style={styles.resultCard}>
        <View style={styles.resultHeader}>
          <Text style={styles.resultTitle}>
            {value ? value.label : 'No location selected yet'}
          </Text>
          {isLoading ? (
            <ActivityIndicator size="small" color={colors.neutral[600]} />
          ) : null}
        </View>
        {value ? (
          <Text style={styles.resultCoordinates}>
            {formatCoord(value.coordinates.latitude)},
            {formatCoord(value.coordinates.longitude)}
          </Text>
        ) : (
          <Text style={styles.resultPlaceholder}>
            Choose an option above to populate your location.
          </Text>
        )}
        {value?.city ? (
          <Text style={styles.resultMeta}>
            {value.city}
            {value.state ? `, ${value.state}` : ''}
            {value.country ? ` • ${value.country}` : ''}
          </Text>
        ) : null}
        {value?.postcode ? (
          <Text style={styles.resultMeta}>Postcode: {value.postcode}</Text>
        ) : null}
      </View>

      {status ? <Text style={styles.statusText}>{status}</Text> : null}
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  label: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.black,
  },
  description: {
    fontSize: fontSize.sm,
    color: colors.neutral[600],
  },
  actionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  coordinatesRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  coordinateInput: {
    flex: 1,
  },
  lookupButton: {
    alignSelf: 'flex-start',
  },
  resultCard: {
    backgroundColor: colors.neutral[50],
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    padding: spacing.md,
    gap: spacing.xs,
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  resultTitle: {
    fontSize: fontSize.base,
    fontWeight: '600',
    color: colors.black,
    flex: 1,
    marginRight: spacing.sm,
  },
  resultCoordinates: {
    fontSize: fontSize.sm,
    color: colors.neutral[600],
  },
  resultPlaceholder: {
    fontSize: fontSize.sm,
    color: colors.neutral[500],
  },
  resultMeta: {
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
