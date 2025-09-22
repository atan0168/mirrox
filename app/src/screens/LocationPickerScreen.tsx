import {
  Camera,
  CameraRef,
  MapView,
  PointAnnotation,
} from '@maplibre/maplibre-react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import * as Location from 'expo-location';
import { MapPin } from 'lucide-react-native';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Alert,
  Animated,
  FlatList,
  Keyboard,
  LayoutChangeEvent,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RootStackParamList } from '../../App';
import { BackButton } from '../components/BackButton';
import { LocationPickerFooter } from '../components/LocationPickerFooter';
import { SearchHeader } from '../components/SearchHeader';
import { STYLE_URL } from '../constants';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { LocationSuggestion } from '../models/Location';
import { UserLocationDetails } from '../models/User';
import { backendApiService } from '../services/BackendApiService';
import { borderRadius, colors, fontSize, spacing } from '../theme';
import {
  locationSuggestionToUserLocation,
  placemarkToUserLocation,
} from '../utils/locationHelpers';

const INITIAL_COORDINATE = { latitude: 3.139, longitude: 101.6869 };

const buildPendingLocation = (
  latitude: number,
  longitude: number,
  label = 'Dropped pin'
): UserLocationDetails => ({
  label,
  coordinates: { latitude, longitude },
  address: null,
  city: null,
  state: null,
  country: null,
  countryCode: null,
  postcode: null,
});

export const LocationPickerScreen: React.FC = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const route = useRoute<RouteProp<RootStackParamList, 'LocationPicker'>>();

  const bottomActionPadding = Math.max(spacing.md, insets.bottom + spacing.sm);

  const {
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
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [bottomSheetHeight, setBottomSheetHeight] = useState(0);

  const debouncedSearchTerm = useDebouncedValue(searchTerm, 300);
  const cameraRef = useRef<CameraRef>(null);
  const flatListRef = useRef<FlatList<LocationSuggestion> | null>(null);
  const sheetAnimation = useRef(new Animated.Value(0)).current;
  const sheetAnimationValueRef = useRef(0);
  const hasMeasuredSheetRef = useRef(false);
  const reverseGeocodeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const selectedCoordinates = selectedLocation?.coordinates;
  const windowDimensions = useWindowDimensions();
  const [pinCoordinate, setPinCoordinate] = useState<[number, number] | null>(
    selectedCoordinates
      ? [selectedCoordinates.longitude, selectedCoordinates.latitude]
      : null
  );

  const handleCollapseSearch = useCallback(() => {
    setIsSearchExpanded(false);
    setSearchResults([]);
    setSearchError(null);
    setSearchLoading(false);
    Keyboard.dismiss();
  }, []);

  const handleSearchBlur = useCallback(() => {
    setIsSearchExpanded(false);
  }, []);

  const handleSearchFocus = useCallback(() => {
    setIsSearchExpanded(true);
  }, []);

  const handleClearSearch = useCallback(() => {
    setSearchTerm('');
    setSearchResults([]);
    setSearchError(null);
  }, []);

  const handleBottomSheetLayout = useCallback(
    (event: LayoutChangeEvent) => {
      if (isSearchExpanded || sheetAnimationValueRef.current > 0.001) {
        return;
      }

      const { height } = event.nativeEvent.layout;

      setBottomSheetHeight(prev => {
        if (height > 0 && (prev === 0 || Math.abs(prev - height) > 1)) {
          return height;
        }
        return prev;
      });

      if (!hasMeasuredSheetRef.current && height > 0) {
        sheetAnimation.setValue(0);
        hasMeasuredSheetRef.current = true;
      }
    },
    [isSearchExpanded, sheetAnimation, sheetAnimationValueRef]
  );

  const focusCameraOnCoordinate = useCallback(
    (
      latitude: number,
      longitude: number,
      options: {
        zoomLevel?: number;
        animationDuration?: number;
        treatAsCollapsed?: boolean;
      } = {}
    ) => {
      if (!cameraRef.current) {
        return;
      }

      const {
        zoomLevel = 14,
        animationDuration = 350,
        treatAsCollapsed = false,
      } = options;

      const cameraConfig: {
        centerCoordinate: [number, number];
        zoomLevel: number;
        animationDuration: number;
        padding?: {
          paddingBottom: number;
          paddingTop: number;
          paddingLeft: number;
          paddingRight: number;
        };
      } = {
        centerCoordinate: [longitude, latitude] as [number, number],
        zoomLevel,
        animationDuration,
      };

      const shouldApplyPadding =
        (treatAsCollapsed || !isSearchExpanded) && bottomSheetHeight > 0;

      if (shouldApplyPadding) {
        cameraConfig.padding = {
          paddingBottom: bottomSheetHeight + spacing.lg,
          paddingTop: insets.top + spacing.md,
          paddingLeft: spacing.md,
          paddingRight: spacing.md,
        };
      }

      cameraRef.current.setCamera(cameraConfig);
    },
    [bottomSheetHeight, insets.top, isSearchExpanded]
  );

  useEffect(() => {
    if (!bottomSheetHeight) {
      sheetAnimation.setValue(isSearchExpanded ? 1 : 0);
      return;
    }

    if (!hasMeasuredSheetRef.current) {
      sheetAnimation.setValue(isSearchExpanded ? 1 : 0);
      return;
    }

    Animated.timing(sheetAnimation, {
      toValue: isSearchExpanded ? 1 : 0,
      duration: 260,
      useNativeDriver: false,
    }).start();
  }, [bottomSheetHeight, isSearchExpanded, sheetAnimation]);

  useEffect(() => {
    if (!selectedCoordinates) {
      return;
    }

    setPinCoordinate(prev => {
      if (
        prev &&
        prev[0] === selectedCoordinates.longitude &&
        prev[1] === selectedCoordinates.latitude
      ) {
        return prev;
      }

      return [selectedCoordinates.longitude, selectedCoordinates.latitude];
    });
  }, [selectedCoordinates]);

  useEffect(() => {
    return () => {
      if (reverseGeocodeTimeoutRef.current) {
        clearTimeout(reverseGeocodeTimeoutRef.current);
        reverseGeocodeTimeoutRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const listenerId = sheetAnimation.addListener(({ value }) => {
      sheetAnimationValueRef.current = value;
    });

    return () => {
      sheetAnimation.removeListener(listenerId);
    };
  }, [sheetAnimation]);

  const clearPendingReverseGeocode = useCallback(() => {
    if (reverseGeocodeTimeoutRef.current) {
      clearTimeout(reverseGeocodeTimeoutRef.current);
      reverseGeocodeTimeoutRef.current = null;
    }
  }, []);

  const reverseGeocodeCoordinate = useCallback(
    async (
      latitude: number,
      longitude: number,
      { successMessage }: { successMessage?: string } = {}
    ) => {
      try {
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
        setStatusMessage(successMessage ?? 'Location updated');
      } catch (error) {
        console.error('Failed to reverse geocode coordinate', error);
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
    },
    []
  );

  useEffect(() => {
    const trimmedSearchTerm = debouncedSearchTerm.trim();

    if (!isSearchExpanded) {
      setSearchResults([]);
      setSearchError(null);
      setSearchLoading(false);
      return;
    }

    if (trimmedSearchTerm.length < 3) {
      setSearchResults([]);
      setSearchError(null);
      setSearchLoading(false);
      return;
    }

    let isCancelled = false;
    setSearchLoading(true);
    setSearchError(null);

    backendApiService
      .searchLocations(trimmedSearchTerm, { limit: 8 })
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
  }, [debouncedSearchTerm, isSearchExpanded]);

  useEffect(() => {
    if (!selectedCoordinates) return;
    focusCameraOnCoordinate(
      selectedCoordinates.latitude,
      selectedCoordinates.longitude
    );
  }, [focusCameraOnCoordinate, selectedCoordinates]);

  const handleSuggestionPress = useCallback(
    (suggestion: LocationSuggestion) => {
      const normalized = locationSuggestionToUserLocation(suggestion);
      clearPendingReverseGeocode();
      setSelectedLocation(normalized);
      setPinCoordinate([
        normalized.coordinates.longitude,
        normalized.coordinates.latitude,
      ]);
      setSearchTerm(suggestion.displayName);
      setSearchResults([]);
      setStatusMessage('Location updated from suggestion');
      focusCameraOnCoordinate(
        normalized.coordinates.latitude,
        normalized.coordinates.longitude,
        { treatAsCollapsed: true }
      );
      handleCollapseSearch();
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 0);
    },
    [
      clearPendingReverseGeocode,
      focusCameraOnCoordinate,
      handleCollapseSearch,
      flatListRef,
    ]
  );

  const handleMapPress = useCallback(
    (feature: GeoJSON.Feature) => {
      if (!feature?.geometry?.type || feature.geometry.type !== 'Point') {
        return;
      }

      const [longitude, latitude] = feature.geometry.coordinates as [
        number,
        number,
      ];

      clearPendingReverseGeocode();
      setPinCoordinate([longitude, latitude]);
      setSelectedLocation(buildPendingLocation(latitude, longitude));
      focusCameraOnCoordinate(latitude, longitude);
      reverseGeocodeCoordinate(latitude, longitude, {
        successMessage: 'Location updated from map',
      });
    },
    [
      clearPendingReverseGeocode,
      focusCameraOnCoordinate,
      reverseGeocodeCoordinate,
    ]
  );

  const ensureLocationPermission = useCallback(async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== Location.PermissionStatus.GRANTED) {
      throw new Error('Location permission is required.');
    }
  }, []);

  const handleUseCurrentLocation = useCallback(async () => {
    try {
      clearPendingReverseGeocode();
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
      setPinCoordinate([position.coords.longitude, position.coords.latitude]);
      focusCameraOnCoordinate(
        position.coords.latitude,
        position.coords.longitude,
        { treatAsCollapsed: true }
      );
      handleCollapseSearch();
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
  }, [
    ensureLocationPermission,
    clearPendingReverseGeocode,
    focusCameraOnCoordinate,
    handleCollapseSearch,
  ]);

  const handleConfirm = useCallback(() => {
    if (!selectedLocation) {
      Alert.alert('Select a location first');
      return;
    }
    onSelect?.(selectedLocation);
    navigation.goBack();
  }, [navigation, onSelect, selectedLocation]);

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

  const sheetContentStyle = useMemo(
    () => [styles.sheetContent, { paddingBottom: bottomActionPadding }],
    [bottomActionPadding]
  );

  const animatedSheetStyle = useMemo(() => {
    if (!bottomSheetHeight) {
      return {};
    }

    const expandedHeight = Math.max(windowDimensions.height, bottomSheetHeight);

    return {
      height: sheetAnimation.interpolate({
        inputRange: [0, 1],
        outputRange: [bottomSheetHeight, expandedHeight],
      }),
      borderTopLeftRadius: sheetAnimation.interpolate({
        inputRange: [0, 1],
        outputRange: [borderRadius.xl, 0],
      }),
      borderTopRightRadius: sheetAnimation.interpolate({
        inputRange: [0, 1],
        outputRange: [borderRadius.xl, 0],
      }),
    } as const;
  }, [bottomSheetHeight, sheetAnimation, windowDimensions.height]);

  const expandedSheetStyle = useMemo(
    () =>
      isSearchExpanded
        ? {
            paddingTop: insets.top + spacing.lg,
          }
        : null,
    [insets.top, isSearchExpanded]
  );

  const searchHeaderElement = useMemo(
    () => (
      <SearchHeader
        searchTerm={searchTerm}
        isSearchExpanded={isSearchExpanded}
        onChangeSearchTerm={setSearchTerm}
        onFocus={handleSearchFocus}
        onBlur={handleSearchBlur}
        onClear={handleClearSearch}
        onCollapse={handleCollapseSearch}
        searchLoading={searchLoading}
        searchError={searchError}
      />
    ),
    [
      handleClearSearch,
      handleCollapseSearch,
      handleSearchBlur,
      handleSearchFocus,
      isSearchExpanded,
      searchError,
      searchLoading,
      searchTerm,
    ]
  );

  const footerElement = useMemo(
    () => (
      <LocationPickerFooter
        allowCurrentLocation={allowCurrentLocation}
        geoLoading={geoLoading}
        selectedLocation={selectedLocation}
        statusMessage={statusMessage}
        onUseCurrentLocation={handleUseCurrentLocation}
        onConfirm={handleConfirm}
      />
    ),
    [
      allowCurrentLocation,
      geoLoading,
      handleConfirm,
      handleUseCurrentLocation,
      selectedLocation,
      statusMessage,
    ]
  );

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        mapStyle={STYLE_URL}
        onPress={handleMapPress}
        onDidFailLoadingMap={() => {
          console.warn('Map failed to load');
        }}
      >
        <BackButton />
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
        {pinCoordinate ? (
          <PointAnnotation
            id="selected-pin"
            coordinate={pinCoordinate}
            anchor={{ x: 0.5, y: 1 }}
          >
            <View style={styles.pinWrapper}>
              <View style={styles.pinIconContainer}>
                <MapPin size={36} color={colors.sky[500]} />
              </View>
              <View style={styles.pinShadow} />
            </View>
          </PointAnnotation>
        ) : null}
      </MapView>

      <Animated.View
        style={[
          styles.bottomSheet,
          animatedSheetStyle,
          isSearchExpanded ? styles.bottomSheetExpanded : null,
          expandedSheetStyle,
        ]}
        pointerEvents="auto"
        onLayout={handleBottomSheetLayout}
      >
        <FlatList
          ref={flatListRef}
          data={searchResults}
          keyExtractor={keyExtractor}
          renderItem={renderSuggestion}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={sheetContentStyle}
          ListHeaderComponent={searchHeaderElement}
          ListHeaderComponentStyle={styles.sheetHeaderContainer}
          ListFooterComponent={footerElement}
          showsVerticalScrollIndicator={false}
        />
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  map: {
    flex: 1,
  },
  bottomSheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.white,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    paddingTop: spacing.md,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 6,
    overflow: 'hidden',
  },
  bottomSheetExpanded: {
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  sheetContent: {
    paddingHorizontal: spacing.lg,
  },
  sheetHeader: {
    gap: spacing.md,
  },
  sheetHeaderContainer: {
    marginBottom: spacing.md,
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
  pinWrapper: {
    alignItems: 'center',
  },
  pinIconContainer: {
    shadowColor: 'rgba(0, 0, 0, 0.25)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  pinShadow: {
    width: 18,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    marginTop: -4,
  },
});

export default LocationPickerScreen;
