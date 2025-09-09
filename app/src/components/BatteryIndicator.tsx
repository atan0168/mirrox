import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { healthProvider } from '../services/health';
import { lastNightWindow } from '../utils/datetimeUtils';
import {
  AWAKE_DEPLETION_PER_MIN,
  FULL_SLEEP_MINUTES,
  TICK_MS,
} from '../constants';
import { clamp } from '../utils/mathUtils';
import { useQuery } from '@tanstack/react-query';

export function dayKey(d = new Date()): string {
  // Local day identifier; resets at local midnight
  return d.toDateString();
}

const BatteryIndicator = ({
  sleepMinutes,
}: {
  sleepMinutes?: number | null;
}) => {
  // If we have no sleep data at all, hide the battery until first sync
  if (sleepMinutes == null || sleepMinutes <= 0) return null;

  // Daily energy state (percentage 0..100)
  const initialEnergyPct = useMemo(() => {
    return clamp(((sleepMinutes ?? 0) / FULL_SLEEP_MINUTES) * 100);
  }, [sleepMinutes]);

  const [energyPct, setEnergyPct] = useState<number>(initialEnergyPct);
  const [currentDay, setCurrentDay] = useState<string>(dayKey());
  const lastUpdateRef = useRef<number>(Date.now());
  const accountedNapMinutesRef = useRef<number>(0);

  // At local midnight (day change), reset battery to last-night sleep
  useEffect(() => {
    const id = setInterval(() => {
      const now = new Date();
      const key = dayKey(now);
      if (key !== currentDay) {
        setCurrentDay(key);
        setEnergyPct(clamp(((sleepMinutes ?? 0) / FULL_SLEEP_MINUTES) * 100));
        lastUpdateRef.current = now.getTime();
        accountedNapMinutesRef.current = 0;
      }
    }, 60 * 1000);
    return () => clearInterval(id);
  }, [currentDay, sleepMinutes]);

  // Update loop: deplete while awake
  useEffect(() => {
    const tick = () => {
      const nowTs = Date.now();
      const dtMin = (nowTs - lastUpdateRef.current) / 60000;
      lastUpdateRef.current = nowTs;

      setEnergyPct(prev => {
        // While awake, linearly deplete energy
        return clamp(prev - dtMin * AWAKE_DEPLETION_PER_MIN);
      });
    };
    const id = setInterval(tick, TICK_MS);
    return () => clearInterval(id);
  }, []);

  // Use react-query to fetch daytime sleep (from last night end to end-of-day)
  const { data: daySleepMins } = useQuery<number>({
    queryKey: ['day-sleep-minutes', currentDay],
    queryFn: async () => {
      const now = new Date();
      const { end: nightEnd } = lastNightWindow(now);
      const endOfDay = new Date(now);
      endOfDay.setHours(23, 59, 59, 999);
      // This returns accumulated sleep recorded during the day window; as new
      // sleep is synced (e.g., naps), this value increases.
      return await healthProvider.getSleepMinutes(nightEnd, endOfDay);
    },
    refetchInterval: 60 * 1000,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  });

  // When daytime sleep increases, add proportional energy once
  useEffect(() => {
    if (daySleepMins == null) return;
    const accounted = accountedNapMinutesRef.current;
    if (isFinite(daySleepMins) && daySleepMins > accounted) {
      const delta = daySleepMins - accounted;
      accountedNapMinutesRef.current = daySleepMins;
      setEnergyPct(prev => clamp(prev + (delta * 100) / FULL_SLEEP_MINUTES));
    }
  }, [daySleepMins]);

  // Map current energy percentage to bar fill (3 bars) and dynamic color
  const totalBars = 3;
  const filledBars =
    energyPct >= 66 ? 3 : energyPct >= 33 ? 2 : energyPct > 0 ? 1 : 0;
  const color =
    energyPct < 33 ? '#EF4444' : energyPct < 66 ? '#F59E0B' : '#10B981';

  const bars = [] as React.ReactNode[];
  for (let i = 0; i < totalBars; i++) {
    bars.push(
      <View
        key={i}
        style={{
          width: 4,
          height: 8,
          marginHorizontal: 1,
          borderRadius: 1,
          backgroundColor: i < filledBars ? color : 'transparent',
          borderWidth: 1,
          borderColor: color,
        }}
      />
    );
  }

  return (
    <View
      style={{
        position: 'absolute',
        bottom: 8,
        right: 8,
        flexDirection: 'row',
        alignItems: 'center',
      }}
      accessibilityLabel={`Energy battery: ${Math.round(energyPct)} percent`}
    >
      <View
        style={{
          flexDirection: 'row',
          paddingHorizontal: 4,
          paddingVertical: 4,
          borderWidth: 1,
          borderColor: color,
          borderRadius: 4,
          backgroundColor: 'rgba(0,0,0,0.25)',
          alignItems: 'center',
        }}
      >
        {bars}
        <Text
          style={{
            marginLeft: 6,
            color,
            fontSize: 10,
            fontWeight: '600',
          }}
        >
          {`${Math.round(energyPct)}%`}
        </Text>
      </View>
    </View>
  );
};
export default BatteryIndicator;
