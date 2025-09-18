import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  MapView,
  Camera,
  CameraRef,
  CircleLayer,
  ShapeSource,
  OnPressEvent,
} from '@maplibre/maplibre-react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import * as Location from 'expo-location';
import { RootStackParamList } from '../../App';
import { colors, spacing, fontSize, borderRadius } from '../theme';
import { Input, Button } from '../components/ui';
import { backendApiService } from '../services/BackendApiService';
import { LocationSuggestion } from '../models/Location';
import { UserLocationDetails } from '../models/User';
import {
  locationSuggestionToUserLocation,
  placemarkToUserLocation,
} from '../utils/locationHelpers';
import { STYLE_URL } from '../constants';

const INITIAL_COORDINATE = { latitude: 3.139, longitude: 101.6869 };

const useDebouncedValue = <T,>(value: T, delay: number) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
};

export const LocationPickerScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<RootStackParamList, 'LocationPicker'>>();

  const {
    title,
    initialLocation,
    onSelect,
    allowCurrentLocation = true,
  } = route.params;

  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<LocationSuggestion[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const [selectedLocation, setSelectedLocation] =
    useState<UserLocationDetails | null>(initialLocation ?? null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);

  const debouncedSearchTerm = useDebouncedValue(searchTerm, 300);
  const cameraRef = useRef<CameraRef>(null);

  const selectedCoordinates = selectedLocation?.coordinates;

  useEffect(() => {
    navigation.setOptions({ title });
  }, [navigation, title]);

  useEffect(() => {
    if (!debouncedSearchTerm || debouncedSearchTerm.trim().length < 2) {
      setSearchResults([]);
      setSearchError(null);
      setSearchLoading(false);
      return;
    }

    let isCancelled = false;
    setSearchLoading(true);
    setSearchError(null);

    backendApiService
      .searchLocations(debouncedSearchTerm, { limit: 8 })
      .then(results => {
        if (isCancelled) return;
        setSearchResults(results);
      })
      .catch(error => {
        if (isCancelled) return;
        console.error('Location search failed', error);
        setSearchError(
          error instanceof Error
            ? error.message
            : 'Failed to search for locations.'
        );
      })
      .finally(() => {
        if (isCancelled) return;
        setSearchLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [debouncedSearchTerm]);

  useEffect(() => {
    if (!selectedCoordinates) return;
    cameraRef.current?.setCamera({
      centerCoordinate: [
        selectedCoordinates.longitude,
        selectedCoordinates.latitude,
      ],
      zoomLevel: 14,
      animationDuration: 350,
    });
  }, [selectedCoordinates]);

  const handleSuggestionPress = useCallback(
    (suggestion: LocationSuggestion) => {
      const normalized = locationSuggestionToUserLocation(suggestion);
      setSelectedLocation(normalized);
      setSearchTerm(suggestion.displayName);
      setSearchResults([]);
      setStatusMessage('Location updated from suggestion');
    },
    []
  );

  const handleMapPress = useCallback(async (event: OnPressEvent) => {
    try {
      if (!event?.geometry?.coordinates) {
        return;
      }

      const [longitude, latitude] = event.geometry.coordinates as [
        number,
        number,
      ];

      setGeoLoading(true);
      setStatusMessage('Looking up this spot…');

      const placemarks = await Location.reverseGeocodeAsync({
        latitude,
        longitude,
      });

      const coords = {
        latitude,
        longitude,
        altitude: 0,
        accuracy: null,
        altitudeAccuracy: null,
        heading: null,
        speed: null,
      } as Location.LocationObjectCoords;

      const locationDetails = placemarkToUserLocation(
        coords,
        placemarks[0] ?? null
      );

      setSelectedLocation(locationDetails);
      setStatusMessage('Location updated from map');
    } catch (error) {
      console.error('Failed to reverse geocode map press', error);
      setStatusMessage(null);
      Alert.alert(
        'Reverse geocode failed',
        error instanceof Error
          ? error.message
          : 'Unable to fetch details for this point.'
      );
    } finally {
      setGeoLoading(false);
    }
  }, []);

  const ensureLocationPermission = useCallback(async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== Location.PermissionStatus.GRANTED) {
      throw new Error('Location permission is required.');
    }
  }, []);

  const handleUseCurrentLocation = useCallback(async () => {
    try {
      setGeoLoading(true);
      setStatusMessage('Fetching your current location…');
      await ensureLocationPermission();

      const position = await Location.getCurrentPositionAsync({});
      const placemarks = await Location.reverseGeocodeAsync({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });

      const normalized = placemarkToUserLocation(
        position.coords,
        placemarks[0] ?? null
      );

      setSelectedLocation(normalized);
      setStatusMessage('Current location set');
      cameraRef.current?.setCamera({
        centerCoordinate: [position.coords.longitude, position.coords.latitude],
        zoomLevel: 14,
        animationDuration: 350,
      });
    } catch (error) {
      console.error('Failed to set current location', error);
      setStatusMessage(null);
      Alert.alert(
        'Unable to fetch current location',
        error instanceof Error ? error.message : 'Please try again later.'
      );
    } finally {
      setGeoLoading(false);
    }
  }, [ensureLocationPermission]);

  const handleConfirm = useCallback(() => {
    if (!selectedLocation) {
      Alert.alert('Select a location first');
      return;
    }
    onSelect?.(selectedLocation);
    navigation.goBack();
  }, [navigation, onSelect, selectedLocation]);

  const mapShape = useMemo(() => {
    if (!selectedCoordinates) {
      return {
        type: 'FeatureCollection' as const,
        features: [],
      };
    }

    return {
      type: 'FeatureCollection' as const,
      features: [
        {
          type: 'Feature' as const,
          geometry: {
            type: 'Point' as const,
            coordinates: [
              selectedCoordinates.longitude,
              selectedCoordinates.latitude,
            ],
          },
          properties: {
            selection: true,
          },
        },
      ],
    };
  }, [selectedCoordinates]);

  const renderSuggestion = useCallback(
    ({ item }: { item: LocationSuggestion }) => (
      <TouchableOpacity
        style={styles.suggestion}
        onPress={() => handleSuggestionPress(item)}
      >
        <Text style={styles.suggestionTitle}>{item.displayName}</Text>
        <Text style={styles.suggestionSubtitle}>
          {item.address.city || item.address.country || 'Unknown area'}
        </Text>
      </TouchableOpacity>
    ),
    [handleSuggestionPress]
  );

  const keyExtractor = useCallback(
    (item: LocationSuggestion) => item.placeId,
    []
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.mapContainer}>
        <MapView
          style={StyleSheet.absoluteFill}
          styleURL={STYLE_URL}
          onPress={handleMapPress}
        >
          <Camera
            ref={cameraRef}
            defaultSettings={{
              centerCoordinate: [
                selectedCoordinates?.longitude ?? INITIAL_COORDINATE.longitude,
                selectedCoordinates?.latitude ?? INITIAL_COORDINATE.latitude,
              ],
              zoomLevel: selectedCoordinates ? 13 : 10,
            }}
          />
          <ShapeSource id="selected-point" shape={mapShape}>
            <CircleLayer
              id="selected-circle"
              style={{
                circleColor: colors.sky[500],
                circleOpacity: 0.9,
                circleRadius: 6,
              }}
            />
          </ShapeSource>
        </MapView>
      </View>

      <View style={styles.content}>
        <Input
          label="Search"
          placeholder="Search for a location"
          value={searchTerm}
          onChangeText={setSearchTerm}
          autoCorrect={false}
          autoCapitalize="none"
          containerStyle={styles.searchInput}
        />
        {searchLoading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color={colors.neutral[600]} />
            <Text style={styles.loadingText}>Searching…</Text>
          </View>
        ) : null}
        {searchError ? (
          <Text style={styles.errorText}>{searchError}</Text>
        ) : null}

        <FlatList
          data={searchResults}
          keyExtractor={keyExtractor}
          renderItem={renderSuggestion}
          keyboardShouldPersistTaps="handled"
          style={styles.suggestions}
          contentContainerStyle={styles.suggestionList}
        />

        <View style={styles.selectedCard}>
          <Text style={styles.selectedLabel}>Selected location</Text>
          {selectedLocation ? (
            <>
              <Text style={styles.selectedTitle}>{selectedLocation.label}</Text>
              <Text style={styles.selectedSubtitle}>
                {selectedLocation.coordinates.latitude.toFixed(4)},{' '}
                {selectedLocation.coordinates.longitude.toFixed(4)}
              </Text>
            </>
          ) : (
            <Text style={styles.selectedPlaceholder}>
              Tap on the map or use search to choose a location.
            </Text>
          )}
          {statusMessage ? (
            <Text style={styles.statusText}>{statusMessage}</Text>
          ) : null}
        </View>

        <View style={styles.actions}>
          {allowCurrentLocation ? (
            <Button
              variant="secondary"
              onPress={handleUseCurrentLocation}
              disabled={geoLoading}
            >
              Use Current Location
            </Button>
          ) : null}
          <Button
            onPress={handleConfirm}
            disabled={!selectedLocation || geoLoading}
          >
            Confirm
          </Button>
        </View>
        {geoLoading ? (
          <View style={styles.geoLoadingOverlay}>
            <ActivityIndicator size="small" color={colors.neutral[200]} />
            <Text style={styles.geoLoadingText}>Updating location…</Text>
          </View>
        ) : null}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.white,
  },
  mapContainer: {
    flex: 1,
    minHeight: '45%',
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.md,
    backgroundColor: colors.white,
  },
  searchInput: {
    marginBottom: spacing.sm,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  loadingText: {
    color: colors.neutral[600],
    fontSize: fontSize.sm,
  },
  errorText: {
    color: colors.red[600],
    fontSize: fontSize.sm,
  },
  suggestionList: {
    gap: spacing.xs,
    paddingBottom: spacing.sm,
  },
  suggestions: {
    maxHeight: 200,
  },
  suggestion: {
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[200],
  },
  suggestionTitle: {
    fontSize: fontSize.base,
    color: colors.black,
    fontWeight: '600',
  },
  suggestionSubtitle: {
    fontSize: fontSize.sm,
    color: colors.neutral[600],
    marginTop: spacing.xs,
  },
  selectedCard: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    padding: spacing.md,
    backgroundColor: colors.neutral[50],
    gap: spacing.xs,
  },
  selectedLabel: {
    fontSize: fontSize.sm,
    color: colors.neutral[600],
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  selectedTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.black,
  },
  selectedSubtitle: {
    fontSize: fontSize.sm,
    color: colors.neutral[600],
  },
  selectedPlaceholder: {
    fontSize: fontSize.sm,
    color: colors.neutral[500],
  },
  statusText: {
    fontSize: fontSize.xs,
    color: colors.neutral[500],
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  geoLoadingOverlay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  geoLoadingText: {
    color: colors.neutral[600],
    fontSize: fontSize.sm,
  },
});

export default LocationPickerScreen;
