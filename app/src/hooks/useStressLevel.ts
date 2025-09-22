import { useMemo } from 'react';
import { useHealthData } from './useHealthData';
import { useHealthHistory } from './useHealthHistory';
import { computeStressFromHealth } from '../utils/stressUtils';

export function useStressLevel() {
  const { data: latest } = useHealthData({ autoSync: false });
  const { data: history } = useHealthHistory(14);

  const result = useMemo(() => {
    return computeStressFromHealth(latest, history ?? null);
  }, [latest, history]);

  return result;
}
