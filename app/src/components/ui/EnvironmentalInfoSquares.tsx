import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
} from 'react-native';
import {
  Wind,
  Car,
  Activity,
  AlertTriangle,
  CheckCircle,
  XCircle,
  AlertCircle,
  Bug,
} from 'lucide-react-native';
import { Card } from './Card';
import { Button } from './Button';
import { colors, spacing, fontSize, borderRadius } from '../../theme';
import {
  getAQIInfo,
  getShortClassification,
  formatPollutantValue,
  formatTimestamp,
} from '../../utils/aqiUtils';
import { useReverseGeocode } from '../../hooks/useReverseGeocode';
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
  stressLevel: string;
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
    'air' | 'traffic' | 'dengue' | null
  >(null);
  const [dengueList, setDengueList] = useState<
    'none' | 'outbreaks' | 'hotspots'
  >('none');

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

  const getAirQualityColor = () => {
    if (isAirQualityError) return colors.red[500];
    if (!airQuality?.aqi) return colors.neutral[400];
    return getAQIInfo(airQuality.aqi).colorCode;
  };

  const getAirQualityIcon = () => {
    if (isAirQualityError)
      return <AlertTriangle size={24} color={colors.red[500]} />;
    if (!airQuality?.aqi) return <Wind size={24} color={colors.neutral[400]} />;
    const aqi = airQuality.aqi;
    const color = getAirQualityColor();

    if (aqi <= 50) return <CheckCircle size={24} color={color} />;
    if (aqi <= 100) return <Activity size={24} color={color} />;
    if (aqi <= 150) return <AlertTriangle size={24} color={color} />;
    return <XCircle size={24} color={color} />;
  };

  const getTrafficColor = () => {
    if (isTrafficError) return colors.red[500];
    if (!trafficData) return colors.neutral[400];
    switch (trafficData.stressLevel) {
      case 'none':
        return colors.green[400];
      case 'mild':
        return '#FFC107';
      case 'moderate':
        return colors.orange[600];
      case 'high':
        return '#F44336';
      default:
        return colors.neutral[400];
    }
  };

  const getTrafficIcon = () => {
    if (isTrafficError)
      return <AlertTriangle size={24} color={colors.red[500]} />;
    if (!trafficData) return <Car size={24} color={colors.neutral[400]} />;
    const color = getTrafficColor();

    switch (trafficData.stressLevel) {
      case 'none':
        return <CheckCircle size={24} color={color} />;
      case 'mild':
        return <AlertTriangle size={24} color={color} />;
      case 'moderate':
        return <AlertCircle size={24} color={color} />;
      case 'high':
        return <XCircle size={24} color={color} />;
      default:
        return <Car size={24} color={color} />;
    }
  };

  // Dengue tile helpers
  const getDengueColor = () => {
    if (isDengueError) return colors.red[500];
    // Prioritize live nearby outbreaks/hotspots
    if (dengueOutbreakCount > 0) return colors.orange[700];
    if (dengueHotspotCount > 0) return '#FFC107';
    if (!denguePrediction) return colors.neutral[400];
    const pSeason = denguePrediction.season?.prob_in_season ?? 0;
    const pTrend = denguePrediction.trend?.prob_trend_increase_next_week ?? 0;
    const high = pSeason >= 0.6 || pTrend >= 0.5;
    const moderate = pSeason >= 0.3 || pTrend >= 0.3;
    if (high) return colors.orange[600];
    if (moderate) return '#FFC107';
    return colors.green[500];
  };

  const getDengueIcon = () => {
    if (isDengueError)
      return <AlertTriangle size={24} color={colors.red[500]} />;
    const color = getDengueColor();
    return <Bug size={24} color={color} />;
  };

  const dengueStatusText = () => {
    if (dengueOutbreakCount > 0) return 'Active outbreak nearby';
    if (dengueHotspotCount > 0) return 'Hotspot nearby';
    return 'Low risk';
  };

  const renderAirQualityModal = () => (
    <Modal
      visible={selectedModal === 'air'}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setSelectedModal(null)}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Air Quality Details</Text>
          <TouchableOpacity
            onPress={() => setSelectedModal(null)}
            style={styles.closeButton}
          >
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent}>
          {isAirQualityError ? (
            <Card
              variant="outline"
              style={{ ...styles.detailCard, borderColor: colors.red[500] }}
            >
              <View style={styles.errorContainer}>
                <Text style={styles.errorIcon}>⚠️</Text>
                <Text style={styles.errorTitle}>
                  Failed to Load Air Quality Data
                </Text>
                <Text style={styles.errorMessage}>
                  {airQualityErrorMessage}
                </Text>
                <Text style={styles.errorSubtext}>
                  Please check your connection and try again
                </Text>
              </View>
            </Card>
          ) : airQuality ? (
            <>
              <Card
                variant="outline"
                style={{
                  ...styles.detailCard,
                  borderColor: getAirQualityColor(),
                }}
              >
                {/* Location line */}
                {latForLookup != null && lngForLookup != null && (
                  <Text style={styles.locationLine}>
                    Location: {reverseGeo?.label || 'Fetching…'} • (
                    {latForLookup.toFixed(4)}, {lngForLookup.toFixed(4)})
                  </Text>
                )}
                <View style={styles.aqiHeader}>
                  <Text style={styles.aqiTitle}>Air Quality Index</Text>
                  <Text
                    style={[styles.aqiValue, { color: getAirQualityColor() }]}
                  >
                    {airQuality.aqi}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.aqiClassification,
                    { color: getAirQualityColor() },
                  ]}
                >
                  {airQuality.classification ||
                    (airQuality.aqi &&
                      getShortClassification(
                        getAQIInfo(airQuality.aqi).classification
                      ))}
                </Text>
                {airQuality.healthAdvice && (
                  <Text style={styles.healthAdvice}>
                    {airQuality.healthAdvice}
                  </Text>
                )}
                {airQuality.timestamp && (
                  <Text style={styles.timestamp}>
                    Updated {formatTimestamp(airQuality.timestamp)} •{' '}
                    {airQuality.source?.toUpperCase() || 'AQICN'}
                  </Text>
                )}
              </Card>

              <View style={styles.pollutantsSection}>
                <Text style={styles.sectionTitle}>Pollutant Levels</Text>
                <View style={styles.pollutantGrid}>
                  {airQuality.pm25 && (
                    <View style={styles.pollutantItem}>
                      <Text style={styles.pollutantLabel}>PM2.5</Text>
                      <Text style={styles.pollutantValue}>
                        {formatPollutantValue(airQuality.pm25, 'pm25')}
                      </Text>
                    </View>
                  )}
                  {airQuality.pm10 && (
                    <View style={styles.pollutantItem}>
                      <Text style={styles.pollutantLabel}>PM10</Text>
                      <Text style={styles.pollutantValue}>
                        {formatPollutantValue(airQuality.pm10, 'pm10')}
                      </Text>
                    </View>
                  )}
                  {airQuality.o3 && (
                    <View style={styles.pollutantItem}>
                      <Text style={styles.pollutantLabel}>Ozone</Text>
                      <Text style={styles.pollutantValue}>
                        {formatPollutantValue(airQuality.o3, 'o3')}
                      </Text>
                    </View>
                  )}
                  {airQuality.no2 && (
                    <View style={styles.pollutantItem}>
                      <Text style={styles.pollutantLabel}>NO₂</Text>
                      <Text style={styles.pollutantValue}>
                        {formatPollutantValue(airQuality.no2, 'no2')}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            </>
          ) : null}
        </ScrollView>

        <View style={styles.modalFooter}>
          <Button
            variant="secondary"
            onPress={() => setSelectedModal(null)}
            fullWidth
          >
            Close
          </Button>
        </View>
      </View>
    </Modal>
  );

  const renderTrafficModal = () => (
    <Modal
      visible={selectedModal === 'traffic'}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setSelectedModal(null)}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Traffic Conditions</Text>
          <TouchableOpacity
            onPress={() => setSelectedModal(null)}
            style={styles.closeButton}
          >
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent}>
          {isTrafficError ? (
            <Card
              variant="outline"
              style={{ ...styles.detailCard, borderColor: colors.red[500] }}
            >
              <View style={styles.errorContainer}>
                <Text style={styles.errorIcon}>⚠️</Text>
                <Text style={styles.errorTitle}>
                  Failed to Load Traffic Data
                </Text>
                <Text style={styles.errorMessage}>{trafficErrorMessage}</Text>
                <Text style={styles.errorSubtext}>
                  Please check your connection and try again
                </Text>
              </View>
            </Card>
          ) : trafficData ? (
            <>
              <Card
                variant="outline"
                style={{
                  ...styles.detailCard,
                  borderColor: getTrafficColor(),
                }}
              >
                {latForLookup != null && lngForLookup != null && (
                  <Text style={styles.locationLine}>
                    Location: {reverseGeo?.label || 'Fetching…'} • (
                    {latForLookup.toFixed(4)}, {lngForLookup.toFixed(4)})
                  </Text>
                )}
                <View style={styles.trafficHeader}>
                  <Text style={styles.trafficTitle}>Current Conditions</Text>
                  <Text
                    style={[styles.trafficLevel, { color: getTrafficColor() }]}
                  >
                    {trafficData.stressLevel.toUpperCase()}
                  </Text>
                </View>
                <Text style={styles.trafficDescription}>
                  {trafficData.stressLevel === 'none' &&
                    'Traffic is flowing smoothly'}
                  {trafficData.stressLevel === 'mild' &&
                    'Light traffic congestion detected'}
                  {trafficData.stressLevel === 'moderate' &&
                    'Moderate traffic delays expected'}
                  {trafficData.stressLevel === 'high' &&
                    'Heavy traffic congestion - high stress'}
                </Text>
              </Card>

              <View style={styles.metricsSection}>
                <Text style={styles.sectionTitle}>Traffic Metrics</Text>
                <View style={styles.metricGrid}>
                  <View style={styles.metricItem}>
                    <Text style={styles.metricLabel}>Congestion Factor</Text>
                    <Text
                      style={[styles.metricValue, { color: getTrafficColor() }]}
                    >
                      {trafficData.congestionFactor.toFixed(1)}x
                    </Text>
                  </View>
                  <View style={styles.metricItem}>
                    <Text style={styles.metricLabel}>Current Speed</Text>
                    <Text style={styles.metricValue}>
                      {trafficData.currentSpeed} km/h
                    </Text>
                  </View>
                  <View style={styles.metricItem}>
                    <Text style={styles.metricLabel}>Free Flow Speed</Text>
                    <Text style={styles.metricValue}>
                      {trafficData.freeFlowSpeed} km/h
                    </Text>
                  </View>
                  <View style={styles.metricItem}>
                    <Text style={styles.metricLabel}>Travel Time</Text>
                    <Text style={styles.metricValue}>
                      {Math.round(trafficData.currentTravelTime / 60)}min
                    </Text>
                  </View>
                </View>
              </View>
            </>
          ) : null}
        </ScrollView>

        <View style={styles.modalFooter}>
          <Button
            variant="secondary"
            onPress={() => setSelectedModal(null)}
            fullWidth
          >
            Close
          </Button>
        </View>
      </View>
    </Modal>
  );

  const renderDengueModal = () => (
    <Modal
      visible={selectedModal === 'dengue'}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => {
        setSelectedModal(null);
        setDengueList('none');
      }}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Dengue Risk</Text>
          <TouchableOpacity
            onPress={() => setSelectedModal(null)}
            style={styles.closeButton}
          >
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent}>
          {isDengueError ? (
            <Card
              variant="outline"
              style={{ ...styles.detailCard, borderColor: colors.red[500] }}
            >
              <View style={styles.errorContainer}>
                <Text style={styles.errorIcon}>⚠️</Text>
                <Text style={styles.errorTitle}>
                  Failed to Load Dengue Risk
                </Text>
                <Text style={styles.errorMessage}>{dengueErrorMessage}</Text>
                <Text style={styles.errorSubtext}>
                  Please check your connection and try again
                </Text>
              </View>
            </Card>
          ) : denguePrediction ? (
            <>
              <Card
                variant="outline"
                style={{
                  ...styles.detailCard,
                  borderColor: getDengueColor(),
                }}
              >
                {latForLookup != null && lngForLookup != null && (
                  <Text style={styles.locationLine}>
                    Location: {reverseGeo?.label || 'Fetching…'} • (
                    {latForLookup.toFixed(4)}, {lngForLookup.toFixed(4)})
                  </Text>
                )}
                <View style={styles.aqiHeaderColumn}>
                  <Text style={styles.aqiTitle}>Current Risk</Text>
                  <Text
                    style={[
                      styles.aqiValue,
                      { color: getDengueColor(), marginTop: spacing.xs },
                    ]}
                  >
                    {dengueStatusText()}
                  </Text>
                </View>

                <Text style={styles.timestamp}>
                  EW {denguePrediction.as_of.ew}{' '}
                  {denguePrediction.as_of.ew_year}
                  {' · '}Source: {denguePrediction.as_of.source}
                </Text>
                <Text style={[styles.timestamp, { marginTop: 6 }]}>
                  Disclaimer: model trained with data up to end of 2024;
                  predictions are experimental.
                </Text>
              </Card>
              <View style={styles.metricsSection}>
                <Text style={styles.sectionTitle}>Nearby (5km)</Text>
                <View style={styles.metricGrid}>
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => setDengueList('outbreaks')}
                    style={styles.metricItem}
                  >
                    <Text style={styles.metricLabel}>Active Outbreaks</Text>
                    <Text
                      style={[styles.metricValue, { color: getDengueColor() }]}
                    >
                      {dengueOutbreakCount}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => setDengueList('hotspots')}
                    style={styles.metricItem}
                  >
                    <Text style={styles.metricLabel}>Hotspots</Text>
                    <Text style={styles.metricValue}>{dengueHotspotCount}</Text>
                  </TouchableOpacity>
                  <View style={styles.metricItem}>
                    <Text style={styles.metricLabel}>
                      In-season Probability
                    </Text>
                    <Text style={styles.metricValue}>
                      {Math.round(
                        (denguePrediction.season?.prob_in_season ?? 0) * 100
                      )}
                      %
                    </Text>
                  </View>
                  <View style={styles.metricItem}>
                    <Text style={styles.metricLabel}>Trend Next Week</Text>
                    <Text style={styles.metricValue}>
                      {Math.round(
                        (denguePrediction.trend
                          ?.prob_trend_increase_next_week ?? 0) * 100
                      )}
                      %
                    </Text>
                  </View>
                  <View style={[styles.metricItem, styles.metricItemFull]}>
                    <Text style={styles.metricLabel}>Source</Text>
                    <Text style={styles.metricValue}>
                      iDengue (MOH Malaysia)
                    </Text>
                  </View>
                </View>
              </View>

              {dengueList !== 'none' && (
                <View style={styles.metricsSection}>
                  <View
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: spacing.sm,
                    }}
                  >
                    <Text style={styles.sectionTitle}>
                      {dengueList === 'outbreaks'
                        ? 'Active Outbreaks'
                        : 'Hotspots'}
                    </Text>
                    <TouchableOpacity onPress={() => setDengueList('none')}>
                      <Text
                        style={{
                          color: colors.neutral[600],
                          fontSize: fontSize.sm,
                        }}
                      >
                        Hide details
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {dengueList === 'outbreaks' && (
                    <View style={{ gap: spacing.sm }}>
                      {dengueOutbreaksData?.features?.map((f, idx) => (
                        <Card
                          key={`outbreak-${idx}`}
                          variant="outline"
                          style={{ borderColor: colors.orange[600] }}
                        >
                          <Text
                            style={{
                              fontSize: fontSize.base,
                              fontWeight: '600',
                              color: colors.neutral[900],
                              marginBottom: 4,
                            }}
                          >
                            {
                              f.attributes[
                                'SPWD.AVT_WABAK_IDENGUE_NODM.LOKALITI'
                              ]
                            }
                          </Text>
                          <Text
                            style={{
                              fontSize: fontSize.sm,
                              color: colors.neutral[700],
                            }}
                          >
                            Total cases:{' '}
                            {
                              f.attributes[
                                'SPWD.AVT_WABAK_IDENGUE_NODM.TOTAL_KES'
                              ]
                            }
                          </Text>
                        </Card>
                      ))}
                      {(!dengueOutbreaksData?.features ||
                        dengueOutbreaksData.features.length === 0) && (
                        <Text
                          style={{
                            fontSize: fontSize.sm,
                            color: colors.neutral[600],
                          }}
                        >
                          No active outbreaks within 5km.
                        </Text>
                      )}
                    </View>
                  )}

                  {dengueList === 'hotspots' && (
                    <View style={{ gap: spacing.sm }}>
                      {dengueHotspotsData?.features?.map((f, idx) => (
                        <Card
                          key={`hotspot-${idx}`}
                          variant="outline"
                          style={{ borderColor: colors.orange[400] }}
                        >
                          <Text
                            style={{
                              fontSize: fontSize.base,
                              fontWeight: '600',
                              color: colors.neutral[900],
                              marginBottom: 4,
                            }}
                          >
                            {f.attributes['SPWD.DBO_LOKALITI_POINTS.LOKALITI']}
                          </Text>
                          <Text
                            style={{
                              fontSize: fontSize.sm,
                              color: colors.neutral[700],
                            }}
                          >
                            Cumulative cases:{' '}
                            {
                              f.attributes[
                                'SPWD.AVT_HOTSPOTMINGGUAN.KUMULATIF_KES'
                              ]
                            }
                          </Text>
                        </Card>
                      ))}
                      {(!dengueHotspotsData?.features ||
                        dengueHotspotsData.features.length === 0) && (
                        <Text
                          style={{
                            fontSize: fontSize.sm,
                            color: colors.neutral[600],
                          }}
                        >
                          No hotspots within 5km.
                        </Text>
                      )}
                    </View>
                  )}
                </View>
              )}
            </>
          ) : null}
        </ScrollView>

        <View style={styles.modalFooter}>
          <Button
            variant="secondary"
            onPress={() => {
              setSelectedModal(null);
              setDengueList('none');
            }}
            fullWidth
          >
            Close
          </Button>
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Environmental Overview</Text>

      <View style={styles.squaresGrid}>
        {/* Air Quality Square */}
        <TouchableOpacity
          style={[styles.square, { borderColor: getAirQualityColor() }]}
          onPress={() => setSelectedModal('air')}
          disabled={isAirQualityLoading || isAirQualityError}
        >
          <View style={styles.squareIcon}>{getAirQualityIcon()}</View>
          <Text style={styles.squareValue}>
            {isAirQualityError
              ? 'Error'
              : isAirQualityLoading
                ? '...'
                : airQuality?.aqi || 'N/A'}
          </Text>
          <Text style={styles.squareLabel}>Air Quality</Text>
          {isAirQualityError ? (
            <Text style={[styles.squareError, { color: colors.red[500] }]}>
              {airQualityErrorMessage}
            </Text>
          ) : airQuality ? (
            <Text
              style={[styles.squareStatus, { color: getAirQualityColor() }]}
            >
              {airQuality.classification ||
                (airQuality.aqi &&
                  getShortClassification(
                    getAQIInfo(airQuality.aqi).classification
                  ))}
            </Text>
          ) : null}
        </TouchableOpacity>

        {/* Traffic Square */}
        <TouchableOpacity
          style={[styles.square, { borderColor: getTrafficColor() }]}
          onPress={() => setSelectedModal('traffic')}
          disabled={isTrafficLoading || isTrafficError}
        >
          <View style={styles.squareIcon}>{getTrafficIcon()}</View>
          <Text style={styles.squareValue}>
            {isTrafficError
              ? 'Error'
              : isTrafficLoading
                ? '...'
                : trafficData?.congestionFactor.toFixed(1) + 'x' || 'N/A'}
          </Text>
          <Text style={styles.squareLabel}>Traffic</Text>
          {isTrafficError ? (
            <Text style={[styles.squareError, { color: colors.red[500] }]}>
              {trafficErrorMessage}
            </Text>
          ) : trafficData ? (
            <Text style={[styles.squareStatus, { color: getTrafficColor() }]}>
              {trafficData.stressLevel}
            </Text>
          ) : null}
        </TouchableOpacity>
      </View>

      {/* Dengue Square */}
      {showDengue && (
        <View style={[styles.squaresGrid, styles.squaresGridBottom]}>
          <TouchableOpacity
            style={[styles.square, { borderColor: getDengueColor() }]}
            onPress={() => setSelectedModal('dengue')}
            disabled={isDengueLoading || isDengueError}
          >
            <View style={styles.squareIcon}>{getDengueIcon()}</View>
            <Text style={styles.squareValue}>
              {isDengueError
                ? 'Error'
                : isDengueLoading
                  ? '...'
                  : dengueOutbreakCount > 0
                    ? `${dengueOutbreakCount} area${dengueOutbreakCount > 1 ? 's' : ''}`
                    : dengueHotspotCount > 0
                      ? `${dengueHotspotCount} hotspot${dengueHotspotCount > 1 ? 's' : ''}`
                      : denguePrediction
                        ? `${Math.round(
                            (denguePrediction.season?.prob_in_season ?? 0) * 100
                          )}%`
                        : 'N/A'}
            </Text>
            <Text style={styles.squareLabel}>Dengue</Text>
            {isDengueError ? (
              <Text style={[styles.squareError, { color: colors.red[500] }]}>
                {dengueErrorMessage}
              </Text>
            ) : denguePrediction ? (
              <Text style={[styles.squareStatus, { color: getDengueColor() }]}>
                {dengueStatusText()}
              </Text>
            ) : null}
          </TouchableOpacity>
        </View>
      )}

      {renderAirQualityModal()}
      {renderTrafficModal()}
      {renderDengueModal()}
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
  square: {
    width: '47%',
    backgroundColor: colors.neutral[50],
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    padding: spacing.lg,
    alignItems: 'center',
    minHeight: 160,
  },
  squareIcon: {
    marginBottom: spacing.sm,
  },
  squareValue: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.neutral[900],
    marginBottom: 4,
    textAlign: 'center',
  },
  squareLabel: {
    fontSize: fontSize.sm,
    color: colors.neutral[600],
    marginBottom: 4,
  },
  squareStatus: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    textTransform: 'capitalize',
    textAlign: 'center',
  },
  squareError: {
    fontSize: fontSize.xs,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 16,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: colors.neutral[50],
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[200],
    backgroundColor: colors.neutral[50],
  },
  modalTitle: {
    fontSize: fontSize.xl,
    fontWeight: '600',
    color: colors.neutral[900],
  },
  closeButton: {
    padding: spacing.sm,
  },
  closeButtonText: {
    fontSize: fontSize.lg,
    color: colors.neutral[600],
  },
  modalContent: {
    flex: 1,
    padding: spacing.lg,
  },
  modalFooter: {
    padding: spacing.lg,
    backgroundColor: colors.neutral[50],
    borderTopWidth: 1,
    borderTopColor: colors.neutral[200],
  },
  errorContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  errorIcon: {
    fontSize: 32,
    marginBottom: spacing.sm,
  },
  errorTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.red[600],
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  errorMessage: {
    fontSize: fontSize.base,
    color: colors.red[500],
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  errorSubtext: {
    fontSize: fontSize.sm,
    color: colors.neutral[600],
    textAlign: 'center',
  },
  detailCard: {
    marginBottom: spacing.lg,
  },
  aqiHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  aqiTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.neutral[900],
  },
  aqiHeaderColumn: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  aqiValue: {
    fontSize: fontSize.xxl,
    fontWeight: '700',
  },
  aqiClassification: {
    fontSize: fontSize.base,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  healthAdvice: {
    fontSize: fontSize.sm,
    color: colors.neutral[700],
    lineHeight: 20,
    marginBottom: spacing.sm,
  },
  timestamp: {
    fontSize: fontSize.xs,
    color: colors.neutral[500],
  },
  locationLine: {
    fontSize: fontSize.xs,
    color: colors.neutral[600],
    marginBottom: spacing.sm,
  },
  trafficHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  trafficTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.neutral[900],
  },
  trafficLevel: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  trafficDescription: {
    fontSize: fontSize.sm,
    color: colors.neutral[700],
    lineHeight: 20,
  },
  dengueStat: {
    fontSize: fontSize.sm,
    color: colors.neutral[700],
    marginBottom: spacing.xs,
  },
  sectionTitle: {
    fontSize: fontSize.base,
    fontWeight: '600',
    color: colors.neutral[900],
    marginBottom: spacing.md,
  },
  pollutantsSection: {
    marginBottom: spacing.lg,
  },
  pollutantGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  pollutantItem: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: colors.neutral[100],
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
  },
  pollutantLabel: {
    fontSize: fontSize.xs,
    color: colors.neutral[600],
    marginBottom: 4,
  },
  pollutantValue: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.neutral[900],
  },
  metricsSection: {
    marginBottom: spacing.lg,
  },
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  metricItem: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: colors.neutral[100],
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
  },
  metricItemFull: {
    minWidth: '100%',
    flexBasis: '100%',
  },
  metricLabel: {
    fontSize: fontSize.xs,
    color: colors.neutral[600],
    marginBottom: 4,
    textAlign: 'center',
  },
  metricValue: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.neutral[900],
  },
});
