import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, fontSize } from '../../theme';
import { useReverseGeocode } from '../../hooks/useReverseGeocode';
import InfoSquare from './InfoSquare';
import AirQualityModal from './modals/AirQualityModal';
import TrafficModal from './modals/TrafficModal';
import DengueModal from './modals/DengueModal';
import WeatherModal from './modals/WeatherModal';
import { getAirQualityDisplay } from './display/airQuality';
import { getTrafficDisplay } from './display/traffic';
import { getDengueDisplay } from './display/dengue';
import { getWeatherDisplay } from './display/weather';
import {
  DenguePredictResponse,
  ArcGISResponse,
  HotspotAttributes,
  OutbreakAttributes,
  PointGeometry,
  PolygonGeometry,
} from '../../services/BackendApiService';

interface AirQualityData {
  aqi?: number;
  pm25?: number;
  pm10?: number;
  o3?: number;
  no2?: number;
  temperature?: number | null;
  humidity?: number | null;
  uvIndex?: number | null;
  uvForecast?: Array<{
    avg: number;
    day: string;
    max: number;
    min: number;
  }> | null;
  classification?: string;
  healthAdvice?: string;
  timestamp?: string;
  source?: string;
  location?: {
    name?: string;
    coordinates?: { latitude: number; longitude: number };
  };
  primaryPollutant?: string;
}

interface TrafficData {
  congestionFactor: number;
  currentSpeed: number;
  freeFlowSpeed: number;
  currentTravelTime: number;
  freeFlowTravelTime: number;
  confidence: number;
  roadClosure?: boolean;
}

interface EnvironmentalInfoSquaresProps {
  airQuality?: AirQualityData | null;
  trafficData?: TrafficData | null;
  isAirQualityLoading?: boolean;
  isTrafficLoading?: boolean;
  isAirQualityError?: boolean;
  isTrafficError?: boolean;
  airQualityErrorMessage?: string;
  trafficErrorMessage?: string;
  // Optional explicit coords used for queries
  queryLatitude?: number;
  queryLongitude?: number;
  // Dengue prediction
  denguePrediction?: DenguePredictResponse | null;
  isDengueLoading?: boolean;
  isDengueError?: boolean;
  dengueErrorMessage?: string;
  // Nearby dengue live data
  dengueHotspotCount?: number;
  dengueOutbreakCount?: number;
  dengueHotspotsData?: ArcGISResponse<HotspotAttributes, PointGeometry>;
  dengueOutbreaksData?: ArcGISResponse<OutbreakAttributes, PolygonGeometry>;
  showDengue?: boolean; // hide outside MY
}

export const EnvironmentalInfoSquares: React.FC<
  EnvironmentalInfoSquaresProps
> = ({
  airQuality,
  trafficData,
  isAirQualityLoading = false,
  isTrafficLoading = false,
  isAirQualityError = false,
  isTrafficError = false,
  airQualityErrorMessage = 'Unable to load air quality data',
  trafficErrorMessage = 'Unable to load traffic data',
  queryLatitude,
  queryLongitude,
  denguePrediction,
  isDengueLoading = false,
  isDengueError = false,
  dengueErrorMessage = 'Unable to load dengue risk',
  dengueHotspotCount = 0,
  dengueOutbreakCount = 0,
  dengueHotspotsData,
  dengueOutbreaksData,
  showDengue = true,
}) => {
  const [selectedModal, setSelectedModal] = useState<
    'air' | 'traffic' | 'dengue' | 'weather' | null
  >(null);

  // Reverse geocode when user opens the modal (avoid background geocoding)
  const latForLookup =
    queryLatitude ?? airQuality?.location?.coordinates?.latitude;
  const lngForLookup =
    queryLongitude ?? airQuality?.location?.coordinates?.longitude;

  const { data: reverseGeo } = useReverseGeocode(
    latForLookup,
    lngForLookup,
    selectedModal === 'air' ||
      selectedModal === 'traffic' ||
      selectedModal === 'dengue'
  );

  const {
    color: airColor,
    icon: airIcon,
    statusText: airStatus,
  } = getAirQualityDisplay(airQuality, isAirQualityError);
  const resolvedUVIndex =
    airQuality?.uvIndex ??
    (airQuality?.uvForecast && airQuality.uvForecast.length > 0
      ? airQuality.uvForecast[0].avg
      : null);
  const {
    color: weatherColor,
    icon: weatherIcon,
    statusText: weatherStatus,
  } = getWeatherDisplay({
    temperature: airQuality?.temperature ?? null,
    humidity: airQuality?.humidity ?? null,
    uvIndex: resolvedUVIndex ?? null,
    isError: isAirQualityError,
  });
  const {
    color: trafficColor,
    icon: trafficIcon,
    statusText: trafficStatus,
  } = getTrafficDisplay(trafficData ?? null, isTrafficError);
  const {
    color: dengueColor,
    icon: dengueIcon,
    statusText: dengueStatus,
    valueText: dengueValue,
  } = getDengueDisplay(
    denguePrediction,
    dengueHotspotCount,
    dengueOutbreakCount,
    isDengueError
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Environmental Overview</Text>

      <View style={styles.squaresGrid}>
        <InfoSquare
          title="Air Quality"
          value={
            isAirQualityError
              ? 'Error'
              : isAirQualityLoading
                ? '...'
                : (airQuality?.aqi ?? 'N/A')
          }
          statusText={isAirQualityError ? undefined : airStatus}
          color={airColor}
          icon={airIcon}
          loading={isAirQualityLoading}
          errorMessage={isAirQualityError ? airQualityErrorMessage : undefined}
          disabled={isAirQualityLoading || isAirQualityError}
          onPress={() => setSelectedModal('air')}
        />

        <InfoSquare
          title="Temperature"
          value={
            isAirQualityError
              ? 'Error'
              : isAirQualityLoading
                ? '...'
                : airQuality?.temperature != null
                  ? `${airQuality.temperature.toFixed(1)}°C`
                  : 'N/A'
          }
          statusText={isAirQualityError ? undefined : weatherStatus}
          color={weatherColor}
          icon={weatherIcon}
          loading={isAirQualityLoading}
          errorMessage={isAirQualityError ? airQualityErrorMessage : undefined}
          disabled={isAirQualityLoading || isAirQualityError}
          onPress={() => setSelectedModal('weather')}
        />
      </View>

      <View style={[styles.squaresGrid, styles.squaresGridBottom]}>
        <InfoSquare
          title="Traffic"
          value={
            isTrafficError
              ? 'Error'
              : isTrafficLoading
                ? '...'
                : trafficData
                  ? `${trafficData.congestionFactor.toFixed(1)}x`
                  : 'N/A'
          }
          statusText={isTrafficError ? undefined : trafficStatus}
          color={trafficColor}
          icon={trafficIcon}
          loading={isTrafficLoading}
          errorMessage={isTrafficError ? trafficErrorMessage : undefined}
          disabled={isTrafficLoading || isTrafficError}
          onPress={() => setSelectedModal('traffic')}
        />

        {showDengue && (
          <InfoSquare
            title="Dengue"
            value={
              isDengueError ? 'Error' : isDengueLoading ? '...' : dengueValue
            }
            statusText={
              isDengueError
                ? undefined
                : denguePrediction
                  ? dengueStatus
                  : undefined
            }
            color={dengueColor}
            icon={dengueIcon}
            loading={isDengueLoading}
            errorMessage={isDengueError ? dengueErrorMessage : undefined}
            disabled={isDengueLoading || isDengueError}
            onPress={() => setSelectedModal('dengue')}
          />
        )}
      </View>

      <AirQualityModal
        visible={selectedModal === 'air'}
        onClose={() => setSelectedModal(null)}
        airQuality={airQuality}
        isError={isAirQualityError}
        errorMessage={airQualityErrorMessage}
        color={airColor}
        locationLabel={reverseGeo?.label || null}
        latitude={latForLookup ?? null}
        longitude={lngForLookup ?? null}
      />
      <TrafficModal
        visible={selectedModal === 'traffic'}
        onClose={() => setSelectedModal(null)}
        trafficData={trafficData}
        isError={isTrafficError}
        errorMessage={trafficErrorMessage}
        color={trafficColor}
        locationLabel={reverseGeo?.label || null}
        latitude={latForLookup ?? null}
        longitude={lngForLookup ?? null}
      />
      <DengueModal
        visible={selectedModal === 'dengue'}
        onClose={() => setSelectedModal(null)}
        denguePrediction={denguePrediction}
        isError={isDengueError}
        errorMessage={dengueErrorMessage}
        color={dengueColor}
        locationLabel={reverseGeo?.label || null}
        latitude={latForLookup ?? null}
        longitude={lngForLookup ?? null}
        dengueHotspotCount={dengueHotspotCount}
        dengueOutbreakCount={dengueOutbreakCount}
        dengueHotspotsData={dengueHotspotsData}
        dengueOutbreaksData={dengueOutbreaksData}
        stateName={reverseGeo?.region || null}
      />
      <WeatherModal
        visible={selectedModal === 'weather'}
        onClose={() => setSelectedModal(null)}
        temperature={airQuality?.temperature ?? null}
        humidity={airQuality?.humidity ?? null}
        uvIndex={resolvedUVIndex ?? null}
        uvForecast={airQuality?.uvForecast}
        isError={isAirQualityError}
        errorMessage={airQualityErrorMessage}
        color={weatherColor}
        locationLabel={reverseGeo?.label || null}
        latitude={latForLookup ?? null}
        longitude={lngForLookup ?? null}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.neutral[900],
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
  },
  squaresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: spacing.md,
    gap: spacing.md,
  },
  squaresGridBottom: {
    marginTop: spacing.md,
  },
});

export default EnvironmentalInfoSquares;
