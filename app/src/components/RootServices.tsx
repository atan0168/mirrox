import { useEnergyEngine } from '../hooks/useEnergyEngine';
import { useEnergyLowScheduler } from '../hooks/useEnergyLowScheduler';
import { useHealthAutoSync } from '../hooks/useHealthAutoSync';

export default function RootServices() {
  useEnergyEngine();
  useEnergyLowScheduler(30);
  useHealthAutoSync(30);
  return null;
}
