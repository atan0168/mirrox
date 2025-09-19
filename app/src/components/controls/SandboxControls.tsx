import React, { useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  TouchableOpacity,
} from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { useSandboxPreference } from '../../hooks/useSandboxPreference';
import { useSandboxStore } from '../../store/sandboxStore';
import { useHydrationStore } from '../../store/hydrationStore';
import { useReverseGeocode } from '../../hooks/useReverseGeocode';
import { colors, spacing, borderRadius, fontSize } from '../../theme';
import type { Coordinates } from '../../models/User';

type StressPreset = 'none' | 'moderate' | 'high';
type SleepPreset = 'optimal' | 'moderate' | 'low';
type AirQualityPreset = 'good' | 'moderate' | 'unhealthy';
type DenguePreset = 'none' | 'active';

type HydrationPreset = 'low' | 'optimal' | 'over';

const HYDRATION_OPTIONS: Array<{
  key: HydrationPreset;
  label: string;
  multiplier: number;
}> = [
  { key: 'low', label: 'Low Hydration', multiplier: 0.35 },
  { key: 'optimal', label: 'Optimal Hydration', multiplier: 1 },
  { key: 'over', label: 'Over Hydrated', multiplier: 1.25 },
];

const DEFAULT_DENGUE_RADIUS = 5;

interface SandboxControlsProps {
  location?: Coordinates | null;
}

export function SandboxControls({ location }: SandboxControlsProps) {
  const queryClient = useQueryClient();
  const {
    sandboxEnabled,
    loading: sandboxPreferenceLoading,
    updateSandboxPreference,
  } = useSandboxPreference();

  const hydrationGoal = useHydrationStore(state => state.dailyGoalMl);
  const hydrationCurrent = useHydrationStore(state => state.currentHydrationMl);

  const {
    setEnabled,
    setContext,
    setStressPreset,
    setSleepPreset,
    setAirQualityPreset,
    setDenguePreset,
    stressPreset,
    sleepPreset,
    airQualityPreset,
    denguePreset,
    context,
  } = useSandboxStore(state => ({
    setEnabled: state.setEnabled,
    setContext: state.setContext,
    setStressPreset: state.setStressPreset,
    setSleepPreset: state.setSleepPreset,
    setAirQualityPreset: state.setAirQualityPreset,
    setDenguePreset: state.setDenguePreset,
    stressPreset: state.stressPreset,
    sleepPreset: state.sleepPreset,
    airQualityPreset: state.airQualityPreset,
    denguePreset: state.denguePreset,
    context: state.context,
  }));

  const reverseGeo = useReverseGeocode(
    location?.latitude,
    location?.longitude,
    Boolean(location)
  );

  const sandboxContext = useMemo(
    () => ({
      latitude: location?.latitude ?? context.latitude,
      longitude: location?.longitude ?? context.longitude,
      locality:
        reverseGeo.data?.city ??
        reverseGeo.data?.label ??
        context.locality ??
        null,
      region: reverseGeo.data?.region ?? context.region ?? null,
      countryCode:
        reverseGeo.data?.countryCode ?? context.countryCode ?? null,
    }),
    [
      context.countryCode,
      context.latitude,
      context.locality,
      context.longitude,
      context.region,
      location?.latitude,
      location?.longitude,
      reverseGeo.data,
    ]
  );

  useEffect(() => {
    if (!sandboxEnabled) return;
    if (location?.latitude == null || location?.longitude == null) return;
    setContext(sandboxContext);
  }, [sandboxEnabled, sandboxContext, setContext, location?.latitude, location?.longitude]);

  const handleToggle = async (value: boolean) => {
    const success = await updateSandboxPreference(value);
    if (!success) return;

    if (value) {
      setContext(sandboxContext);
      setEnabled(true, sandboxContext);

      const air = setAirQualityPreset(airQualityPreset, sandboxContext);
      if (location && air) {
        queryClient.setQueryData(
          ['aqicnAirQuality', location.latitude, location.longitude],
          air
        );
      }

      const dengue = setDenguePreset(denguePreset, sandboxContext);
      if (location) {
        queryClient.setQueryData(
          [
            'dengueNearby',
            location.latitude,
            location.longitude,
            DEFAULT_DENGUE_RADIUS,
          ],
          {
            hotspots: dengue.hotspots ?? { fields: [], features: [] },
            outbreaks: dengue.outbreaks ?? { fields: [], features: [] },
            hotspotCount: dengue.hotspots?.features?.length ?? 0,
            outbreakCount: dengue.outbreaks?.features?.length ?? 0,
          }
        );
      }

      queryClient.invalidateQueries({
        predicate: query =>
          Array.isArray(query.queryKey) && query.queryKey[0] === 'denguePredict',
      });
    } else {
      setEnabled(false, sandboxContext);
      queryClient.invalidateQueries({
        predicate: query =>
          Array.isArray(query.queryKey) && query.queryKey[0] === 'aqicnAirQuality',
      });
      queryClient.invalidateQueries({
        predicate: query =>
          Array.isArray(query.queryKey) && query.queryKey[0] === 'dengueNearby',
      });
      queryClient.invalidateQueries({
        predicate: query =>
          Array.isArray(query.queryKey) && query.queryKey[0] === 'denguePredict',
      });
    }
  };

  const applyStressPreset = (preset: StressPreset) => {
    if (!sandboxEnabled) return;
    setStressPreset(preset);
  };

  const applySleepPreset = (preset: SleepPreset) => {
    if (!sandboxEnabled) return;
    setSleepPreset(preset);
  };

  const applyAirQualityPreset = (preset: AirQualityPreset) => {
    if (!sandboxEnabled) return;
    const air = setAirQualityPreset(preset, sandboxContext);
    if (location && air) {
      queryClient.setQueryData(
        ['aqicnAirQuality', location.latitude, location.longitude],
        air
      );
    }
  };

  const applyDenguePreset = (preset: DenguePreset) => {
    if (!sandboxEnabled) return;
    const dengue = setDenguePreset(preset, sandboxContext);
    if (location) {
      queryClient.setQueryData(
        ['dengueNearby', location.latitude, location.longitude, DEFAULT_DENGUE_RADIUS],
        {
          hotspots: dengue.hotspots ?? { fields: [], features: [] },
          outbreaks: dengue.outbreaks ?? { fields: [], features: [] },
          hotspotCount: dengue.hotspots?.features?.length ?? 0,
          outbreakCount: dengue.outbreaks?.features?.length ?? 0,
        }
      );
    }
    queryClient.invalidateQueries({
      predicate: query =>
        Array.isArray(query.queryKey) && query.queryKey[0] === 'denguePredict',
    });
  };

  const applyHydrationPreset = (preset: HydrationPreset) => {
    if (!sandboxEnabled) return;
    const multiplier = HYDRATION_OPTIONS.find(option => option.key === preset)
      ?.multiplier;
    if (multiplier == null) return;
    const goal = useHydrationStore.getState().dailyGoalMl || 2000;
    const desired = Math.max(0, Math.round(goal * multiplier));
    useHydrationStore.setState({ currentHydrationMl: desired });
  };

  const activeHydrationKey = useMemo(() => {
    const goal = hydrationGoal || 2000;
    const current = hydrationCurrent ?? 0;
    let bestKey: HydrationPreset | null = null;
    let bestDiff = Number.POSITIVE_INFINITY;
    HYDRATION_OPTIONS.forEach(option => {
      const target = goal * option.multiplier;
      const diff = Math.abs(current - target);
      if (diff < bestDiff) {
        bestDiff = diff;
        bestKey = option.key;
      }
    });
    const tolerance = goal * 0.1;
    return bestDiff <= tolerance ? bestKey : null;
  }, [hydrationGoal, hydrationCurrent]);

  const renderButton = (
    label: string,
    active: boolean,
    onPress: () => void
  ) => (
    <TouchableOpacity
      key={label}
      style={[
        styles.button,
        active && styles.buttonActive,
        !sandboxEnabled && styles.buttonDisabled,
      ]}
      onPress={onPress}
      disabled={!sandboxEnabled}
    >
      <Text
        style={[
          styles.buttonText,
          active && styles.buttonTextActive,
          !sandboxEnabled && styles.buttonTextDisabled,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>Sandbox Data</Text>
        <Switch
          value={sandboxEnabled}
          onValueChange={handleToggle}
          disabled={sandboxPreferenceLoading}
          trackColor={{
            false: colors.neutral[300],
            true: colors.black,
          }}
          thumbColor={colors.white}
        />
      </View>
      <Text style={styles.hintText}>
        Quick presets feed fake data into stress, sleep, air quality, and dengue
        pipelines. Toggle sandbox off to return to live data.
      </Text>

      <Text style={styles.sectionLabel}>Stress</Text>
      <View style={styles.buttonRow}>
        {renderButton('Calm', stressPreset === 'none', () =>
          applyStressPreset('none')
        )}
        {renderButton('Moderate Stress', stressPreset === 'moderate', () =>
          applyStressPreset('moderate')
        )}
        {renderButton('High Stress', stressPreset === 'high', () =>
          applyStressPreset('high')
        )}
      </View>

      <Text style={styles.sectionLabel}>Sleep</Text>
      <View style={styles.buttonRow}>
        {renderButton('Rested Sleep', sleepPreset === 'optimal', () =>
          applySleepPreset('optimal')
        )}
        {renderButton('Moderate Sleep', sleepPreset === 'moderate', () =>
          applySleepPreset('moderate')
        )}
        {renderButton('Low Sleep', sleepPreset === 'low', () =>
          applySleepPreset('low')
        )}
      </View>

      <Text style={styles.sectionLabel}>Air Quality</Text>
      <View style={styles.buttonRow}>
        {renderButton('AQI Good', airQualityPreset === 'good', () =>
          applyAirQualityPreset('good')
        )}
        {renderButton('AQI Moderate', airQualityPreset === 'moderate', () =>
          applyAirQualityPreset('moderate')
        )}
        {renderButton('AQI Unhealthy', airQualityPreset === 'unhealthy', () =>
          applyAirQualityPreset('unhealthy')
        )}
      </View>

      <Text style={styles.sectionLabel}>Dengue Risk</Text>
      <View style={styles.buttonRow}>
        {renderButton('No Nearby Risk', denguePreset === 'none', () =>
          applyDenguePreset('none')
        )}
        {renderButton('Active Nearby', denguePreset === 'active', () =>
          applyDenguePreset('active')
        )}
      </View>

      <Text style={styles.sectionLabel}>Hydration</Text>
      <View style={styles.buttonRow}>
        {HYDRATION_OPTIONS.map(option =>
          renderButton(
            option.label,
            activeHydrationKey === option.key,
            () => applyHydrationPreset(option.key)
          )
        )}
      </View>
      <Text style={styles.hintText}>
        Daily goal: {(hydrationGoal || 2000) / 1000}L · presets update
        progress instantly for hydration visuals.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginTop: spacing.md,
    shadowColor: '#000000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  headerTitle: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.neutral[900],
  },
  hintText: {
    fontSize: 12,
    color: colors.neutral[600],
    marginBottom: spacing.sm,
  },
  sectionLabel: {
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.neutral[800],
  },
  buttonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: spacing.xs,
  },
  button: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.neutral[200],
    marginRight: spacing.xs,
    marginBottom: spacing.xs,
  },
  buttonActive: {
    backgroundColor: colors.black,
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  buttonText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.neutral[800],
  },
  buttonTextActive: {
    color: colors.white,
  },
  buttonTextDisabled: {
    color: colors.neutral[500],
  },
});

export default SandboxControls;
