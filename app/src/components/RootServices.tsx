import { useEnergyEngine } from '../hooks/useEnergyEngine';
import { useEnergyLowScheduler } from '../hooks/useEnergyLowScheduler';

export default function RootServices() {
  useEnergyEngine();
  useEnergyLowScheduler(30);
  return null;
}
