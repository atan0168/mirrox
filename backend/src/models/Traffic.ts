export interface TrafficFlowResponse {
  flowSegmentData: {
    frc: string;
    currentSpeed: number;
    freeFlowSpeed: number;
    currentTravelTime: number;
    freeFlowTravelTime: number;
    confidence: number;
    roadClosure: boolean;
    coordinates: {
      coordinate: Array<{
        latitude: number;
        longitude: number;
      }>;
    };
  };
}

export interface CongestionData {
  latitude: number;
  longitude: number;
  congestionFactor: number;
  currentSpeed: number;
  freeFlowSpeed: number;
  currentTravelTime: number;
  freeFlowTravelTime: number;
  stressLevel: 'none' | 'mild' | 'moderate' | 'high';
  confidence: number;
  roadClosure: boolean;
  timestamp: string;
  cached: boolean;
}

export interface CongestionThresholds {
  none: { max: number };
  mild: { min: number; max: number };
  moderate: { min: number; max: number };
  high: { min: number };
}

