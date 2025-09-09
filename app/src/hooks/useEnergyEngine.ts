import { useEffect, useMemo, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useHealthData } from './useHealthData';
import { useEnergyStore } from '../store/energyStore';
import { AWAKE_DEPLETION_PER_MIN, FULL_SLEEP_MINUTES, TICK_MS } from '../constants';
import { clamp } from '../utils/mathUtils';
import { healthProvider } from '../services/health';
import { lastNightWindow } from '../utils/datetimeUtils';

function dayKey(d = new Date()): string {
  return d.toDateString();
}

export function useEnergyEngine() {
  const { data: health } = useHealthData({ autoSync: false });
  const sleepMinutes = health?.sleepMinutes ?? null;
  const setEnergyPct = useEnergyStore(s => s.setEnergyPct);
  const setCurrentDay = useEnergyStore(s => s.setCurrentDay);
  const currentDay = useEnergyStore(s => s.currentDay);

  const initialEnergyPct = useMemo(() => {
    if (sleepMinutes == null || sleepMinutes <= 0) return null;
    return clamp(((sleepMinutes ?? 0) / FULL_SLEEP_MINUTES) * 100);
  }, [sleepMinutes]);

  const lastUpdateRef = useRef<number>(Date.now());
  const accountedNapMinutesRef = useRef<number>(0);

  // At local midnight (day change), reset battery to last-night sleep
  useEffect(() => {
    const id = setInterval(() => {
      const now = new Date();
      const key = dayKey(now);
      if (key !== currentDay) {
        setCurrentDay(key);
        if (initialEnergyPct == null) {
          setEnergyPct(null);
        } else {
          setEnergyPct(initialEnergyPct);
        }
        lastUpdateRef.current = now.getTime();
        accountedNapMinutesRef.current = 0;
      }
    }, 60 * 1000);
    return () => clearInterval(id);
  }, [currentDay, initialEnergyPct, setCurrentDay, setEnergyPct]);

  // Initialize on mount or when sleepMinutes changes
  useEffect(() => {
    if (initialEnergyPct == null) {
      setEnergyPct(null);
      return;
    }
    setEnergyPct(initialEnergyPct);
    lastUpdateRef.current = Date.now();
    accountedNapMinutesRef.current = 0;
  }, [initialEnergyPct, setEnergyPct]);

  // Update loop: deplete while awake
  useEffect(() => {
    if (initialEnergyPct == null) return;
    const tick = () => {
      const nowTs = Date.now();
      const dtMin = (nowTs - lastUpdateRef.current) / 60000;
      lastUpdateRef.current = nowTs;
      const prev = useEnergyStore.getState().energyPct;
      const base = typeof prev === 'number' ? prev : initialEnergyPct;
      setEnergyPct(clamp(base - dtMin * AWAKE_DEPLETION_PER_MIN));
    };
    const id = setInterval(tick, TICK_MS);
    return () => clearInterval(id);
  }, [initialEnergyPct, setEnergyPct]);

  // Use react-query to fetch daytime sleep (from last night end to end-of-day) and add energy proportionally
  const { data: daySleepMins } = useQuery<number>({
    queryKey: ['day-sleep-minutes', currentDay],
    queryFn: async () => {
      const now = new Date();
      const { end: nightEnd } = lastNightWindow(now);
      const endOfDay = new Date(now);
      endOfDay.setHours(23, 59, 59, 999);
      return await healthProvider.getSleepMinutes(nightEnd, endOfDay);
    },
    // poll periodically to account for newly synced naps
    refetchInterval: 60 * 1000,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    enabled: initialEnergyPct != null,
  });

  useEffect(() => {
    if (daySleepMins == null || initialEnergyPct == null) return;
    const accounted = accountedNapMinutesRef.current;
    if (isFinite(daySleepMins) && daySleepMins > accounted) {
      const delta = daySleepMins - accounted;
      accountedNapMinutesRef.current = daySleepMins;
      const prev = useEnergyStore.getState().energyPct;
      const base = typeof prev === 'number' ? prev : initialEnergyPct;
      setEnergyPct(clamp(base + (delta * 100) / FULL_SLEEP_MINUTES));
    }
  }, [daySleepMins, initialEnergyPct, setEnergyPct]);
}
