import { HealthMetrics } from '../utils/healthMetrics';

export interface HealthAlert {
  id: string;
  type: 'warning' | 'critical' | 'info';
  metric: keyof HealthMetrics;
  message: string;
  recommendation?: string;
  severity: number; // 1-10
  timestamp: Date;
  dismissed?: boolean;
}
