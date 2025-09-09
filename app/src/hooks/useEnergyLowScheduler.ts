import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useEnergyStore } from '../store/energyStore';
import { AWAKE_DEPLETION_PER_MIN } from '../constants';
import {
  cancelScheduledNotification,
  presentEnergyLowNow,
  scheduleEnergyLowAt,
} from '../services/notifications';
import { useEnergyNotificationsPreference } from './useEnergyNotificationsPreference';

function dayKey(d = new Date()): string {
  return d.toDateString();
}

export function useEnergyLowScheduler(thresholdPct = 30) {
  const energyPct = useEnergyStore(s => s.energyPct);
  const currentDay = useEnergyStore(s => s.currentDay);
  const { energyNotificationsEnabled, loading } = useEnergyNotificationsPreference();
  const prevEnergyRef = useRef<number | null>(energyPct ?? null);
  const scheduledIdRef = useRef<string | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  // Detect crossing below threshold in real time and present a notification
  useEffect(() => {
    if (loading || !energyNotificationsEnabled) return;
    if (typeof energyPct !== 'number') return;
    const prev = prevEnergyRef.current;
    if (prev != null && prev >= thresholdPct && energyPct < thresholdPct) {
      presentEnergyLowNow().catch(() => {});
    }
    prevEnergyRef.current = energyPct;
  }, [energyPct, thresholdPct, energyNotificationsEnabled, loading]);

  // Helper: compute the predicted Date when energy will cross below threshold.
  const computeCrossingTime = (): Date | null => {
    if (typeof energyPct !== 'number') return null;
    if (energyPct <= thresholdPct) return new Date();
    const rate = AWAKE_DEPLETION_PER_MIN; // % per minute
    if (rate <= 0) return null;
    const minutes = (energyPct - thresholdPct) / rate;
    if (!isFinite(minutes) || minutes <= 0) return null;
    const now = new Date();
    const predicted = new Date(now.getTime() + minutes * 60 * 1000);
    if (dayKey(predicted) !== currentDay) return null;
    return predicted;
  };

  // When app goes to background, schedule a notification at the predicted crossing time
  useEffect(() => {
    if (loading) return;
    const sub = AppState.addEventListener('change', async (nextState) => {
      const prev = appStateRef.current;
      appStateRef.current = nextState;
      if ((nextState === 'background' || nextState === 'inactive') && prev === 'active') {
        if (scheduledIdRef.current) {
          try { await cancelScheduledNotification(scheduledIdRef.current); } catch {}
          scheduledIdRef.current = null;
        }
        if (energyNotificationsEnabled) {
          const when = computeCrossingTime();
          if (when) {
            try {
              const eta = when.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              const id = await scheduleEnergyLowAt(when, `Your energy is predicted to drop below 30% around ${eta}.`);
              scheduledIdRef.current = id;
            } catch {}
          }
        }
      }
      if (nextState === 'active') {
        if (scheduledIdRef.current) {
          try { await cancelScheduledNotification(scheduledIdRef.current); } catch {}
          scheduledIdRef.current = null;
        }
      }
    });
    return () => {
      sub.remove();
    };
  }, [currentDay, energyPct, energyNotificationsEnabled, loading]);
}
