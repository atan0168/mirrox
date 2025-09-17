export type AlertType =
  | 'sleep_health'
  | 'system'
  | 'air_quality'
  | 'weather'
  | 'traffic'
  | 'dengue'
  | 'hydration'
  | 'steps'
  | 'stress';
export type AlertSeverity = 'low' | 'medium' | 'high';

export interface AlertItem {
  id: string; // uuid
  type: AlertType;
  createdAt: string; // ISO
  // UI content
  title: string;
  shortBody: string; // concise for push/list
  longBody: string; // detailed content shown on Alerts screen
  // Optional extra metadata for provenance
  sourceName?: string;
  sourceUrl?: string;
  tier?: 1 | 2 | 3;
  dataNote?: string;
  severity: AlertSeverity; // display priority/severity
  dismissed?: boolean; // soft-dismissed by user
  dedupeKey?: string; // optional key to dedupe similar alerts per day
}
