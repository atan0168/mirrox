import React, { useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
} from 'react-native';
import { Card } from '../Card';
import { Button } from '../Button';
import { colors, spacing, fontSize } from '../../../theme';
import { getDengueDisplay } from '../display/dengue';
import {
  DenguePredictResponse,
  ArcGISResponse,
  HotspotAttributes,
  OutbreakAttributes,
  PointGeometry,
  PolygonGeometry,
  StateAttributes,
  ArcGISFeature,
} from '../../../services/BackendApiService';
import DengueMap, { DengueSelection } from '../DengueMap';
import { useDengueStateStats } from '../../../hooks/useDengueStateStats';

const normalizeStateName = (name: string) =>
  name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[^a-z\s]/g, '')
    .replace(/wilayah\s+persekutuan/g, 'wp')
    .replace(/^negeri\s+/g, '')
    .replace(/\s+/g, '');

const STATE_SYNONYMS: Record<string, string> = {
  penang: 'pulaupinang',
  malacca: 'melaka',
  melacca: 'melaka',
  melaka: 'melaka',
  kualalumpur: 'wpkualalumpur',
  federalterritoryofkualalumpur: 'wpkualalumpur',
  wilayahpersekutuankualalumpur: 'wpkualalumpur',
  labuan: 'wplabuan',
  wilayahpersekutuanlabuan: 'wplabuan',
  putrajaya: 'wpputrajaya',
  wilayahpersekutuanputrajaya: 'wpputrajaya',
};

const canonicalizeStateName = (name: string) => {
  const normalized = normalizeStateName(name);
  return STATE_SYNONYMS[normalized] || normalized;
};

interface Props {
  visible: boolean;
  onClose: () => void;
  denguePrediction?: DenguePredictResponse | null;
  isError?: boolean;
  errorMessage?: string;
  color?: string;
  locationLabel?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  stateName?: string | null;
  dengueHotspotCount?: number;
  dengueOutbreakCount?: number;
  dengueHotspotsData?: ArcGISResponse<HotspotAttributes, PointGeometry>;
  dengueOutbreaksData?: ArcGISResponse<OutbreakAttributes, PolygonGeometry>;
}

export const DengueModal: React.FC<Props> = ({
  visible,
  onClose,
  denguePrediction,
  isError = false,
  errorMessage = 'Unable to load dengue risk',
  color = colors.neutral[400],
  locationLabel,
  latitude,
  longitude,
  stateName,
  dengueHotspotCount = 0,
  dengueOutbreakCount = 0,
  dengueHotspotsData,
  dengueOutbreaksData,
}) => {
  const [dengueList, setDengueList] = useState<
    'none' | 'outbreaks' | 'hotspots'
  >('none');
  const [selection, setSelection] = useState<DengueSelection | null>(null);
  const scrollRef = useRef<ScrollView | null>(null);

  const { statusText } = getDengueDisplay(
    denguePrediction,
    dengueHotspotCount,
    dengueOutbreakCount,
    isError
  );

  const resolvedStateName = stateName || denguePrediction?.state || null;

  const {
    data: stateStats,
    isLoading: isStateStatsLoading,
    error: stateStatsError,
  } = useDengueStateStats({ enabled: visible });

  const matchedStateStats = useMemo(() => {
    if (!stateStats?.features?.length || !resolvedStateName) return null;
    const target = canonicalizeStateName(resolvedStateName);
    if (!target) return null;

    const direct = stateStats.features.find(feature => {
      const candidate = canonicalizeStateName(feature.attributes.NEGERI);
      return candidate === target;
    });

    if (direct) return direct as ArcGISFeature<StateAttributes>;

    const fuzzy = stateStats.features.find(feature => {
      const candidate = canonicalizeStateName(feature.attributes.NEGERI);
      return candidate.includes(target) || target.includes(candidate);
    });

    return (fuzzy as ArcGISFeature<StateAttributes>) ?? null;
  }, [resolvedStateName, stateStats]);

  const nationalTotals = useMemo(() => {
    if (!stateStats?.features?.length) return null;
    return stateStats.features.reduce(
      (acc, feature) => {
        const { JUMLAH_HARIAN, JUMLAH_KUMULATIF, JUMLAH_KEMATIAN } =
          feature.attributes;
        acc.daily += JUMLAH_HARIAN ?? 0;
        acc.cumulative += JUMLAH_KUMULATIF ?? 0;
        acc.deaths += JUMLAH_KEMATIAN ?? 0;
        return acc;
      },
      { daily: 0, cumulative: 0, deaths: 0 }
    );
  }, [stateStats]);

  const statsRegionLabel = useMemo(() => {
    if (matchedStateStats) return matchedStateStats.attributes.NEGERI;
    if (resolvedStateName) return resolvedStateName;
    if (stateStats?.features?.length) return 'Malaysia';
    return null;
  }, [matchedStateStats, resolvedStateName, stateStats]);

  const metricsForDisplay = useMemo(() => {
    const daily =
      matchedStateStats?.attributes.JUMLAH_HARIAN ??
      nationalTotals?.daily ??
      null;
    const cumulative =
      matchedStateStats?.attributes.JUMLAH_KUMULATIF ??
      nationalTotals?.cumulative ??
      null;
    const deaths =
      matchedStateStats?.attributes.JUMLAH_KEMATIAN ??
      nationalTotals?.deaths ??
      null;

    return { daily, cumulative, deaths };
  }, [matchedStateStats, nationalTotals]);

  const hasStateStatsError = !!stateStatsError;
  const hasStateStats = !!stateStats?.features?.length;

  const formatMetricValue = (value: number | null) => {
    if (isStateStatsLoading) return '...';
    if (hasStateStatsError) return 'N/A';
    if (value == null) return hasStateStats ? 'N/A' : '—';
    return value.toLocaleString();
  };

  const handleClose = () => {
    setDengueList('none');
    setSelection(null);
    onClose();
  };

  const openListAndScroll = (which: 'outbreaks' | 'hotspots') => {
    setDengueList(which);
    setSelection(null);
    // Give time for layout, then scroll into view
    setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 150);
  };

  const setSelectionAndScroll = (selection: DengueSelection | null) => {
    setSelection(selection);
    // Give time for layout, then scroll into view
    setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 150);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Dengue Risk</Text>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent} ref={scrollRef}>
          {isError ? (
            <Card
              variant="outline"
              style={{ ...styles.detailCard, borderColor: colors.red[500] }}
            >
              <View style={styles.errorContainer}>
                <Text style={styles.errorIcon}>⚠️</Text>
                <Text style={styles.errorTitle}>
                  Failed to Load Dengue Risk
                </Text>
                <Text style={styles.errorMessage}>{errorMessage}</Text>
                <Text style={styles.errorSubtext}>
                  Please check your connection and try again
                </Text>
              </View>
            </Card>
          ) : denguePrediction ? (
            <>
              <Card
                variant="outline"
                style={{ ...styles.detailCard, borderColor: color }}
              >
                {latitude != null && longitude != null && (
                  <Text style={styles.locationLine}>
                    Location: {locationLabel || 'Fetching…'} • (
                    {latitude.toFixed(4)}, {longitude.toFixed(4)})
                  </Text>
                )}
                <View style={styles.headerColumn}>
                  <Text style={styles.headerTitle}>Current Risk</Text>
                  <Text
                    style={[
                      styles.headerValue,
                      { color, marginTop: spacing.xs },
                    ]}
                  >
                    {statusText}
                  </Text>
                </View>

                <Text style={styles.timestamp}>
                  EW {denguePrediction.as_of.ew}{' '}
                  {denguePrediction.as_of.ew_year} {' · '}Source:{' '}
                  {denguePrediction.as_of.source}
                </Text>
                <Text style={[styles.timestamp, { marginTop: 6 }]}>
                  Disclaimer: In-season & trend prediction models trained with
                  data up to end of 2024
                </Text>
              </Card>

              <View style={styles.metricsSection}>
                <Text style={styles.sectionTitle}>Nearby (5km)</Text>
                <View style={styles.metricGrid}>
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => openListAndScroll('outbreaks')}
                    style={styles.metricItem}
                  >
                    <Text style={styles.metricLabel}>Active Outbreaks</Text>
                    <Text style={[styles.metricValue, { color }]}>
                      {dengueOutbreakCount}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => openListAndScroll('hotspots')}
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
                  <View style={styles.metricItem}>
                    <Text style={styles.metricLabel}>Daily Cases</Text>
                    {statsRegionLabel && (
                      <Text style={styles.metricLabel}>{statsRegionLabel}</Text>
                    )}
                    <Text style={styles.metricValue}>
                      {formatMetricValue(metricsForDisplay.daily)}
                    </Text>
                  </View>
                  <View style={styles.metricItem}>
                    <Text style={styles.metricLabel}>Cumulative Cases</Text>
                    {statsRegionLabel && (
                      <Text style={styles.metricLabel}>{statsRegionLabel}</Text>
                    )}
                    <Text style={styles.metricValue}>
                      {formatMetricValue(metricsForDisplay.cumulative)}
                    </Text>
                    <Text style={styles.metricDetail}>YTD</Text>
                  </View>
                  <View style={styles.metricItem}>
                    <Text style={styles.metricLabel}>Cumulative Deaths</Text>
                    {statsRegionLabel && (
                      <Text style={styles.metricLabel}>{statsRegionLabel}</Text>
                    )}
                    <Text style={styles.metricValue}>
                      {formatMetricValue(metricsForDisplay.deaths)}
                    </Text>
                    <Text style={styles.metricDetail}>YTD</Text>
                  </View>
                  <View style={styles.metricItem}>
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
                    <TouchableOpacity
                      onPress={() => {
                        setDengueList('none');
                        setSelection(null);
                      }}
                    >
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
                      {dengueOutbreaksData?.features &&
                      dengueOutbreaksData.features.length > 0 ? (
                        <>
                          <DengueMap
                            height={320}
                            center={
                              latitude != null && longitude != null
                                ? { lat: latitude, lng: longitude }
                                : null
                            }
                            polygons={dengueOutbreaksData.features
                              .filter(f => !!f.geometry?.rings)
                              .map(f => ({
                                rings: f.geometry!.rings,
                                label: String(
                                  f.attributes[
                                    'SPWD.AVT_WABAK_IDENGUE_NODM.TOTAL_KES'
                                  ] || ''
                                ),
                                name: String(
                                  f.attributes[
                                    'SPWD.AVT_WABAK_IDENGUE_NODM.LOKALITI'
                                  ] || ''
                                ),
                                subtitle: 'Active outbreak area',
                              }))}
                            onSelectionChange={setSelectionAndScroll}
                          />
                          {selection && (
                            <Card
                              variant="outline"
                              style={styles.selectionCard}
                            >
                              {selection.type === 'polygon' && (
                                <>
                                  <Text style={styles.selectionTitle}>
                                    {selection.name || 'Selected outbreak area'}
                                  </Text>
                                  {selection.label ? (
                                    <Text style={styles.selectionLine}>
                                      Cases: {selection.label}
                                    </Text>
                                  ) : null}
                                  {selection.subtitle ? (
                                    <Text style={styles.selectionSub}>
                                      {selection.subtitle}
                                    </Text>
                                  ) : null}
                                </>
                              )}
                              {selection.type === 'point' && (
                                <>
                                  <Text style={styles.selectionTitle}>
                                    {selection.name || 'Selected location'}
                                  </Text>
                                  {selection.label ? (
                                    <Text style={styles.selectionLine}>
                                      Cases: {selection.label}
                                    </Text>
                                  ) : null}
                                  <Text style={styles.selectionLine}>
                                    Coordinates: (
                                    {selection.coordinates.lat.toFixed(5)},
                                    {selection.coordinates.lng.toFixed(5)})
                                  </Text>
                                  {selection.subtitle ? (
                                    <Text style={styles.selectionSub}>
                                      {selection.subtitle}
                                    </Text>
                                  ) : null}
                                </>
                              )}
                              {selection.type === 'coordinates' && (
                                <Text style={styles.selectionLine}>
                                  Coordinates: (
                                  {selection.coordinates.lat.toFixed(5)},
                                  {selection.coordinates.lng.toFixed(5)})
                                </Text>
                              )}
                            </Card>
                          )}
                        </>
                      ) : (
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
                      {dengueHotspotsData?.features &&
                      dengueHotspotsData.features.length > 0 ? (
                        <>
                          <DengueMap
                            height={320}
                            center={
                              latitude != null && longitude != null
                                ? { lat: latitude, lng: longitude }
                                : null
                            }
                            points={dengueHotspotsData.features
                              .filter(f => !!f.geometry)
                              .map(f => ({
                                lat: f.geometry!.y,
                                lng: f.geometry!.x,
                                label: String(
                                  f.attributes[
                                    'SPWD.AVT_HOTSPOTMINGGUAN.KUMULATIF_KES'
                                  ] || ''
                                ),
                                name: String(
                                  f.attributes[
                                    'SPWD.DBO_LOKALITI_POINTS.LOKALITI'
                                  ] || ''
                                ),
                                subtitle: 'Hotspot',
                              }))}
                            onSelectionChange={setSelectionAndScroll}
                          />
                          {selection && (
                            <Card
                              variant="outline"
                              style={styles.selectionCard}
                            >
                              {selection.type === 'polygon' && (
                                <>
                                  <Text style={styles.selectionTitle}>
                                    {selection.name || 'Selected outbreak area'}
                                  </Text>
                                  {selection.label ? (
                                    <Text style={styles.selectionLine}>
                                      Cases: {selection.label}
                                    </Text>
                                  ) : null}
                                  {selection.subtitle ? (
                                    <Text style={styles.selectionSub}>
                                      {selection.subtitle}
                                    </Text>
                                  ) : null}
                                </>
                              )}
                              {selection.type === 'point' && (
                                <>
                                  <Text style={styles.selectionTitle}>
                                    {selection.name || 'Selected location'}
                                  </Text>
                                  {selection.label ? (
                                    <Text style={styles.selectionLine}>
                                      Cases: {selection.label}
                                    </Text>
                                  ) : null}
                                  <Text style={styles.selectionLine}>
                                    Coordinates: (
                                    {selection.coordinates.lat.toFixed(5)},
                                    {selection.coordinates.lng.toFixed(5)})
                                  </Text>
                                  {selection.subtitle ? (
                                    <Text style={styles.selectionSub}>
                                      {selection.subtitle}
                                    </Text>
                                  ) : null}
                                </>
                              )}
                              {selection.type === 'coordinates' && (
                                <Text style={styles.selectionLine}>
                                  Coordinates: (
                                  {selection.coordinates.lat.toFixed(5)},
                                  {selection.coordinates.lng.toFixed(5)})
                                </Text>
                              )}
                            </Card>
                          )}
                        </>
                      ) : (
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
          <Button variant="secondary" onPress={handleClose} fullWidth>
            Close
          </Button>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
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
  headerColumn: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  headerTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.neutral[900],
  },
  headerValue: {
    fontSize: fontSize.xxl,
    fontWeight: '700',
  },
  timestamp: {
    fontSize: fontSize.xs,
    color: colors.neutral[500],
  },
  metricsSection: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSize.base,
    fontWeight: '600',
    color: colors.neutral[900],
    marginBottom: spacing.md,
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
    borderRadius: 8,
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
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  metricValue: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.neutral[900],
    textAlign: 'center',
  },
  metricDetail: {
    marginTop: spacing.xxs,
    fontSize: fontSize.xxs,
    color: colors.neutral[600],
    textAlign: 'center',
  },
  locationLine: {
    fontSize: fontSize.xs,
    color: colors.neutral[600],
    marginBottom: spacing.sm,
  },
  selectionCard: {
    marginTop: spacing.sm,
    borderColor: colors.neutral[300],
  },
  selectionTitle: {
    fontSize: fontSize.base,
    fontWeight: '600',
    color: colors.neutral[900],
    marginBottom: spacing.sm,
    flexShrink: 1,
    flexWrap: 'wrap',
    lineHeight: Math.round(fontSize.base * 1.25),
  },
  selectionLine: {
    fontSize: fontSize.sm,
    color: colors.neutral[800],
  },
  selectionSub: {
    fontSize: fontSize.xs,
    color: colors.neutral[600],
    marginTop: spacing.xxs,
  },
});

export default DengueModal;
