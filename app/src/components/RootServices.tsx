import { useEnergyEngine } from '../hooks/useEnergyEngine';
import { useEnergyLowScheduler } from '../hooks/useEnergyLowScheduler';
import { useHealthAutoSync } from '../hooks/useHealthAutoSync';
import { useSleepHealthNotifications } from '../hooks/useSleepHealthNotifications';
import { useAlertsAutoPurge } from '../hooks/useAlertsAutoPurge';
import { useProactiveInsights } from '../hooks/useProactiveInsights';

export default function RootServices() {
  useEnergyEngine();
  useEnergyLowScheduler(30);
  useHealthAutoSync(30);
  useSleepHealthNotifications();
  useAlertsAutoPurge();
  useProactiveInsights();
  return null;
}
